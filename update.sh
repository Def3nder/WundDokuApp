#!/usr/bin/env bash
#
# Aktualisiert WundDoku auf dem Server: holt den neuesten Stand aus Git,
# sichert Datenbank und Wundfotos, baut neu, testet, wendet Datenbank-
# migrationen an und startet den Dienst neu.
#
# Aufruf als normaler Benutzer (nicht root):  ./update.sh
# Einstellbar ueber Umgebungsvariablen:
#   SERVICE=wunddoku PORT=3003 BUILD_HEAP_MB=3072 SKIP_TESTS=1 ./update.sh

set -Eeuo pipefail
IFS=$'\n\t'

readonly APP_DIR='/opt/wunddoku-app'
readonly BRANCH='main'
readonly SERVICE="${SERVICE:-wunddoku}"
readonly PORT="${PORT:-3003}"
readonly DATA_DIR='/var/lib/wunddoku'
readonly ENV_FILE='/etc/wunddoku/app.env'
readonly BACKUP_DIR="${BACKUP_DIR:-/var/backups/wunddoku}"
readonly BACKUPS_BEHALTEN=10

previous_commit=''
backup=''
service_stopped=0

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
  log "FEHLER: $*" >&2
  exit 1
}

on_error() {
  local exit_code=$?
  log "FEHLER: Schritt in Zeile ${BASH_LINENO[0]} fehlgeschlagen (Exit-Code ${exit_code})." >&2
  if (( service_stopped )); then
    log "Der Dienst $SERVICE ist gestoppt und wurde NICHT neu gestartet." >&2
  fi
  if [[ -n "$previous_commit" ]]; then
    log "Vorheriger Stand: ${previous_commit:0:12}. Zurueck mit:" >&2
    log "  cd $APP_DIR && git reset --hard $previous_commit && npm ci && npm run build && sudo systemctl start $SERVICE" >&2
  fi
  if [[ -n "$backup" ]]; then
    log "Sicherung vor diesem Update: $backup" >&2
    log "Migrationen lassen sich nicht automatisch zurueckrollen; Wiederherstellung (Dienst gestoppt):" >&2
    log "  tar -C $(dirname "$DATA_DIR") -xzf $backup" >&2
  fi
  exit "$exit_code"
}
trap on_error ERR

for command in git node npm npx sudo systemctl tar; do
  command -v "$command" >/dev/null 2>&1 || fail "Benoetigtes Programm fehlt: $command"
done

[[ ${EUID} -ne 0 ]] || fail 'Bitte als Benutzer ralf starten, nicht als root.'
[[ -d "$APP_DIR" ]] || fail "Anwendungsverzeichnis fehlt: $APP_DIR"

cd "$APP_DIR"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "$APP_DIR ist kein Git-Repository."

if [[ ! -r "$ENV_FILE" ]]; then
  if [[ -f .env ]]; then
    fail "Die Konfiguration liegt noch in $APP_DIR/.env. Bitte ./setup.sh ausfuehren; es verschiebt sie nach $ENV_FILE."
  fi
  fail "Konfiguration fehlt oder ist nicht lesbar: $ENV_FILE (./setup.sh ausfuehren)."
fi
# Dieselbe Datei liest systemd (EnvironmentFile); Prisma und die Scripts brauchen DATABASE_URL.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
[[ "${DATABASE_URL:-}" == file:* ]] || fail "DATABASE_URL in $ENV_FILE fehlt oder ist keine SQLite-Datei (file:...)."
db_file=${DATABASE_URL#file:}
db_file=${db_file%%\?*}
[[ "$db_file" == /* ]] || fail "DATABASE_URL in $ENV_FILE muss einen absoluten Pfad enthalten, gefunden: $DATABASE_URL"

node_major=$(node -p 'process.versions.node.split(".")[0]')
(( node_major >= 20 )) || fail "Node.js 20 oder neuer wird benoetigt, gefunden: $(node --version)"

current_branch=$(git branch --show-current)
[[ "$current_branch" == "$BRANCH" ]] || fail "Aktiver Branch ist '$current_branch', erwartet wird '$BRANCH'."

# Nur Aenderungen an verfolgten Dateien blockieren; Unverfolgtes (Logs, Sicherungen) stoert nicht.
if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  git status --short --untracked-files=no >&2
  fail 'Das Arbeitsverzeichnis enthaelt lokale Aenderungen. Update wurde nicht gestartet.'
fi

# Sudo-Passwort jetzt abfragen, nicht mitten im Update.
sudo -v

previous_commit=$(git rev-parse HEAD)

log "Aktualisiere $BRANCH ..."
git pull --ff-only origin "$BRANCH"

local_commit=$(git rev-parse HEAD)
remote_commit=$(git rev-parse "origin/$BRANCH")
[[ "$local_commit" == "$remote_commit" ]] || fail 'Lokaler Stand entspricht nach dem Pull nicht dem Remote-Branch.'
log "Git-Stand bestaetigt: ${local_commit:0:12} (vorher ${previous_commit:0:12})"

# Der Dienst wird vor dem Bauen gestoppt: npm ci und next build ersetzen node_modules
# und .next, ein laufender Server wuerde dabei kaputte Seiten ausliefern. Gestoppt ist
# die Datenbank ausserdem in einem konsistenten Zustand fuer die Sicherung.
log "Stoppe systemd-Dienst $SERVICE ..."
sudo systemctl stop "$SERVICE"
service_stopped=1

if [[ -f "$db_file" ]]; then
  # /var/backups gehoert root; das Verzeichnis einmalig fuer den Dienstbenutzer anlegen.
  if [[ ! -w "$BACKUP_DIR" ]]; then
    sudo install -d -o "$(id -un)" -g "$(id -gn)" -m 700 "$BACKUP_DIR"
  fi
  # Datenbank UND Wundfotos zusammen: getrennt gesicherte Bestaende passen nicht mehr zusammen.
  backup="$BACKUP_DIR/wunddoku-$(date '+%Y%m%d-%H%M%S')-${previous_commit:0:7}.tar.gz"
  tar -C "$(dirname "$DATA_DIR")" -czf "$backup" "$(basename "$DATA_DIR")"
  chmod 600 -- "$backup"
  log "Daten gesichert: $backup ($(du -h -- "$backup" | cut -f1))"
  # Nur die neuesten Sicherungen behalten.
  ls -1t -- "$BACKUP_DIR"/wunddoku-*.tar.gz | tail -n +"$((BACKUPS_BEHALTEN + 1))" | xargs -r rm --
else
  log "Hinweis: Datenbankdatei $db_file existiert noch nicht, keine Sicherung noetig."
fi

# Next.js sendet sonst beim Bauen anonyme Telemetrie; die App soll nichts nach aussen geben.
export NEXT_TELEMETRY_DISABLED=1

log 'Installiere exakt die Abhaengigkeiten aus package-lock.json ...'
npm ci

# Node begrenzt den Heap standardmaessig auf einen Bruchteil des Arbeitsspeichers (hier ca. 512 MB);
# die Typpruefung von next build braucht mehr. Grenze aus RAM + Swap ableiten, ueberschreibbar
# mit BUILD_HEAP_MB=...
mem_mb=$(awk '/^(MemTotal|SwapTotal):/ { summe += $2 } END { print int(summe / 1024) }' /proc/meminfo)
heap_mb=${BUILD_HEAP_MB:-$(( mem_mb * 3 / 4 ))}
if (( heap_mb < 1536 )); then heap_mb=1536; fi
if (( heap_mb > 4096 )); then heap_mb=4096; fi
if (( mem_mb < 3072 )); then
  log "WARNUNG: Nur ${mem_mb} MB RAM + Swap. Der Build kann am Speicher scheitern; empfohlen sind 2 GB Swap (siehe README)."
fi

log "Erzeuge den Produktions-Build (inkl. Prisma-Client, Node-Heap ${heap_mb} MB) ..."
NODE_OPTIONS="--max-old-space-size=${heap_mb}" npm run build
[[ -f .next/BUILD_ID ]] || fail 'Build fehlt: .next/BUILD_ID'
log 'Build wurde gefunden.'

if [[ "${SKIP_TESTS:-0}" == 1 ]]; then
  log 'Tests uebersprungen (SKIP_TESTS=1).'
else
  log 'Fuehre die Tests aus ...'
  # Ohne die Produktivkonfiguration: Kein Test darf je die echte Datenbank oder die Wundfotos beruehren.
  ( unset DATABASE_URL STORAGE_DIR AUTH_SECRET AUTH_URL AUTH_TRUST_HOST; npm test )
fi

log 'Wende Datenbankmigrationen an ...'
npx prisma migrate deploy

log 'Pruefe Laufzeit-Abhaengigkeiten auf bekannte Sicherheitsluecken ...'
npm audit --omit=dev || log 'WARNUNG: npm audit meldet Befunde (siehe oben). Das Update wird trotzdem fortgesetzt.'

log "Starte systemd-Dienst $SERVICE ..."
sudo systemctl start "$SERVICE"
service_stopped=0

if ! sudo systemctl is-active --quiet "$SERVICE"; then
  sudo systemctl status "$SERVICE" --no-pager >&2 || true
  fail "Dienst $SERVICE ist nach dem Start nicht aktiv."
fi

if command -v curl >/dev/null 2>&1; then
  healthy=0
  for _ in $(seq 1 20); do
    if curl -fsS -o /dev/null "http://127.0.0.1:${PORT}/login"; then healthy=1; break; fi
    sleep 1
  done
  if (( healthy )); then
    log "Anmeldeseite antwortet auf Port $PORT."
  else
    log "WARNUNG: Anmeldeseite antwortet nicht auf Port $PORT (anderer Port? Dann PORT=... setzen; sonst: journalctl -u $SERVICE -n 50)."
  fi
fi

sudo systemctl status "$SERVICE" --no-pager --lines=5
log "Update erfolgreich abgeschlossen. $SERVICE laeuft mit Commit ${local_commit:0:12}."
