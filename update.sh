#!/usr/bin/env bash
#
# Aktualisiert WundDoku auf dem Server: holt den neuesten Stand aus Git,
# sichert die Datenbank, baut neu, wendet Datenbankmigrationen an und
# startet den Dienst neu.
#
# Aufruf als normaler Benutzer (nicht root):  ./update.sh
# Der Dienstname und der Port lassen sich ueberschreiben:
#   SERVICE=wunddoku PORT=3003 ./update.sh

set -Eeuo pipefail
IFS=$'\n\t'

readonly APP_DIR='/opt/wunddoku-app'
readonly BRANCH='main'
readonly SERVICE="${SERVICE:-wunddoku}"
readonly PORT="${PORT:-3003}"
readonly BACKUP_DIR="${BACKUP_DIR:-$HOME/wunddoku-backups}"
readonly BACKUPS_BEHALTEN=10

previous_commit=''
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
    log "Eine Datenbanksicherung liegt in $BACKUP_DIR (Migrationen lassen sich nicht automatisch zurueckrollen)." >&2
  fi
  exit "$exit_code"
}
trap on_error ERR

for command in git node npm npx sudo systemctl; do
  command -v "$command" >/dev/null 2>&1 || fail "Benoetigtes Programm fehlt: $command"
done

[[ ${EUID} -ne 0 ]] || fail 'Bitte als Benutzer ralf starten, nicht als root.'
[[ -d "$APP_DIR" ]] || fail "Anwendungsverzeichnis fehlt: $APP_DIR"

cd "$APP_DIR"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "$APP_DIR ist kein Git-Repository."
[[ -f .env ]] || fail "Konfiguration fehlt: $APP_DIR/.env (DATABASE_URL, AUTH_SECRET, AUTH_URL ...)"

node_major=$(node -p 'process.versions.node.split(".")[0]')
(( node_major >= 20 )) || fail "Node.js 20 oder neuer wird benoetigt, gefunden: $(node --version)"

current_branch=$(git branch --show-current)
[[ "$current_branch" == "$BRANCH" ]] || fail "Aktiver Branch ist '$current_branch', erwartet wird '$BRANCH'."

# Nur Aenderungen an verfolgten Dateien blockieren; Unverfolgtes (Logs, Sicherungen) stoert nicht.
if [[ -n $(git status --porcelain --untracked-files=no) ]]; then
  git status --short --untracked-files=no >&2
  fail 'Das Arbeitsverzeichnis enthaelt lokale Aenderungen. Update wurde nicht gestartet.'
fi

# Datenbankdatei aus DATABASE_URL (SQLite). Relative Pfade gelten, wie bei Prisma, ab prisma/.
database_file() {
  local url path
  url=$(sed -n 's/^DATABASE_URL=//p' .env | tail -n 1)
  url=${url//\"/}
  url=${url//\'/}
  [[ "$url" == file:* ]] || return 1
  path=${url#file:}
  path=${path%%\?*}
  [[ "$path" == /* ]] || path="$APP_DIR/prisma/$path"
  printf '%s\n' "$path"
}
db_file=$(database_file) || fail 'DATABASE_URL in .env fehlt oder ist keine SQLite-Datei (file:...).'

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
# und .next, ein laufender Server wuerde dabei kaputte Seiten ausliefern.
log "Stoppe systemd-Dienst $SERVICE ..."
sudo systemctl stop "$SERVICE"
service_stopped=1

if [[ -f "$db_file" ]]; then
  mkdir -p "$BACKUP_DIR"
  backup="$BACKUP_DIR/wunddoku-$(date '+%Y%m%d-%H%M%S')-${previous_commit:0:7}.db"
  cp -p -- "$db_file" "$backup"
  log "Datenbank gesichert: $backup"
  # Nur die neuesten Sicherungen behalten.
  ls -1t -- "$BACKUP_DIR"/wunddoku-*.db | tail -n +"$((BACKUPS_BEHALTEN + 1))" | xargs -r rm --
else
  log "Hinweis: Datenbankdatei $db_file existiert noch nicht, keine Sicherung noetig."
fi

log 'Installiere exakt die Abhaengigkeiten aus package-lock.json ...'
npm ci

log 'Erzeuge den Produktions-Build (inkl. Prisma-Client) ...'
npm run build
[[ -f .next/BUILD_ID ]] || fail 'Build fehlt: .next/BUILD_ID'
log 'Build wurde gefunden.'

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
    log "WARNUNG: Anmeldeseite antwortet nicht auf Port $PORT (anderer Port? Dann PORT=... setzen)."
  fi
fi

sudo systemctl status "$SERVICE" --no-pager --lines=5
log "Update erfolgreich abgeschlossen. $SERVICE laeuft mit Commit ${local_commit:0:12}."
