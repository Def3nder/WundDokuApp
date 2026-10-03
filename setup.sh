#!/usr/bin/env bash
#
# Einrichtung von WundDoku auf dem Debian-Server (einmalig, mehrfach aufrufbar):
#   1. Verzeichnisse anlegen: /var/lib/wunddoku (Datenbank, Wundfotos),
#      /var/backups/wunddoku (Sicherungen), /etc/wunddoku (Konfiguration)
#   2. Konfiguration /etc/wunddoku/app.env erzeugen (eine vorhandene bleibt unveraendert;
#      eine aeltere $APP_DIR/.env wird dorthin verschoben)
#   3. systemd-Dienst wunddoku anlegen und fuer den Systemstart anmelden
#   4. Port pruefen und per UFW nur fuer den Reverse Proxy freigeben
#   5. ./update.sh ausfuehren (Sicherung, Abhaengigkeiten, Build, Tests, Migrationen, Start)
#   6. ersten Administrator abfragen und anlegen, falls es noch keinen Benutzer gibt
#
# Aufruf als normaler Benutzer (nicht root) aus dem Repository:  ./setup.sh
# Optional:  DOMAIN=wunddoku.bruechmann.xyz PROXY_IP=192.168.1.14 ./setup.sh

set -Eeuo pipefail
IFS=$'\n\t'

readonly APP_DIR='/opt/wunddoku-app'
readonly SERVICE="${SERVICE:-wunddoku}"
readonly PORT="${PORT:-3003}"
# 0.0.0.0: erreichbar fuer den Reverse Proxy auf einem anderen Rechner (Zugriff per UFW
# auf dessen Adresse beschraenkt). Liegt der Proxy auf demselben Server: BIND_HOST=127.0.0.1.
readonly BIND_HOST="${BIND_HOST:-0.0.0.0}"
readonly DATA_DIR='/var/lib/wunddoku'
readonly BACKUP_DIR='/var/backups/wunddoku'
readonly CONF_DIR='/etc/wunddoku'
readonly ENV_FILE="${CONF_DIR}/app.env"
readonly DEFAULT_DOMAIN='wunddoku.bruechmann.xyz'
readonly DEFAULT_PROXY_IP='192.168.1.14'
readonly UNIT_FILE="/etc/systemd/system/${SERVICE}.service"

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
  log 'Das Script ist wiederholbar: nach der Korrektur einfach erneut aufrufen.' >&2
  exit "$exit_code"
}
trap on_error ERR

for command in git node npm npx sudo systemctl; do
  command -v "$command" >/dev/null 2>&1 || fail "Benoetigtes Programm fehlt: $command"
done

[[ ${EUID} -ne 0 ]] || fail 'Bitte als normaler Benutzer (z. B. ralf) starten, nicht als root.'
[[ -d "$APP_DIR/.git" ]] || fail "Kein Git-Repository unter $APP_DIR."
[[ -x "$APP_DIR/update.sh" ]] || fail "$APP_DIR/update.sh fehlt oder ist nicht ausfuehrbar."
[[ -d /run/systemd/system ]] || fail 'systemd ist auf diesem System nicht aktiv.'

run_user=$(id -un)
run_group=$(id -gn)
node_major=$(node -p 'process.versions.node.split(".")[0]')
(( node_major >= 20 )) || fail "Node.js 20 oder neuer wird benoetigt, gefunden: $(node --version)"
node_bin=$(readlink -f "$(command -v node)")
# Die Unit sperrt /home (ProtectHome); ein per nvm installiertes Node waere dann unerreichbar.
[[ "$node_bin" != /home/* ]] || fail "Node liegt unter $node_bin (nvm?). Bitte ein System-Node (/usr/bin/node) installieren."

cd "$APP_DIR"

domain="${DOMAIN:-}"
if [[ -z "$domain" ]]; then
  if [[ -t 0 ]]; then
    read -r -p "Domain, unter der die App per HTTPS erreichbar ist [$DEFAULT_DOMAIN]: " domain
  fi
  domain="${domain:-$DEFAULT_DOMAIN}"
fi
[[ "$domain" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]] || fail "Ungueltige Domain: $domain"

proxy_ip="${PROXY_IP-}"
if [[ -z "${PROXY_IP+x}" ]]; then
  if [[ -t 0 ]]; then
    read -r -p "IP-Adresse des Reverse Proxys fuer die UFW-Freigabe von Port $PORT ('-' = keine Regel) [$DEFAULT_PROXY_IP]: " proxy_ip
  fi
  proxy_ip="${proxy_ip:-$DEFAULT_PROXY_IP}"
fi
[[ "$proxy_ip" == '-' ]] && proxy_ip=''
if [[ -n "$proxy_ip" && ! "$proxy_ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}(/[0-9]{1,2})?$ ]]; then
  fail "Ungueltige IP-Adresse fuer den Reverse Proxy: $proxy_ip"
fi

# Sudo-Passwort jetzt abfragen, nicht mitten im Ablauf.
sudo -v

# --- Verzeichnisse --------------------------------------------------------
log "Lege $DATA_DIR, $BACKUP_DIR und $CONF_DIR an ..."
sudo install -d -o "$run_user" -g "$run_group" -m 750 "$DATA_DIR" "$DATA_DIR/storage"
sudo install -d -o "$run_user" -g "$run_group" -m 700 "$BACKUP_DIR"
sudo install -d -o root -g "$run_group" -m 750 "$CONF_DIR"

# --- Konfiguration --------------------------------------------------------
# Ausserhalb des Repositorys, nur root und der Dienstbenutzer lesen sie; systemd laedt sie
# per EnvironmentFile, update.sh und die Scripts lesen dieselbe Datei.
if [[ ! -f "$ENV_FILE" && -f .env ]]; then
  log "Verschiebe die bisherige $APP_DIR/.env nach $ENV_FILE (AUTH_SECRET bleibt erhalten) ..."
  sudo install -o root -g "$run_group" -m 640 .env "$ENV_FILE"
  rm -- .env
elif [[ ! -f "$ENV_FILE" ]]; then
  log "Erzeuge $ENV_FILE ..."
  auth_secret=$(node -p "require('crypto').randomBytes(32).toString('base64')")
  # Erst die Datei mit den richtigen Rechten anlegen, dann das Geheimnis hineinschreiben.
  sudo install -o root -g "$run_group" -m 640 /dev/null "$ENV_FILE"
  sudo tee "$ENV_FILE" >/dev/null <<EOF
# Von setup.sh erzeugt. Enthaelt Geheimnisse, nicht weitergeben und nicht einchecken.
DATABASE_URL="file:${DATA_DIR}/wunddoku.db"
STORAGE_DIR="${DATA_DIR}/storage"

# Auth.js: AUTH_SECRET niemals aendern oder weitergeben (signiert die Sitzungen).
AUTH_SECRET="${auth_secret}"
AUTH_URL="https://${domain}"
AUTH_TRUST_HOST=true
EOF
else
  log "$ENV_FILE existiert bereits und bleibt unveraendert (AUTH_SECRET darf sich nicht aendern, sonst werden alle Sitzungen ungueltig)."
fi
for key in DATABASE_URL AUTH_SECRET; do
  grep -Eq "^${key}=.+" "$ENV_FILE" || fail "$ENV_FILE enthaelt kein $key. Bitte ergaenzen."
done
# Dieselbe Datei wie der Dienst: Prisma und das Admin-Script brauchen DATABASE_URL.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

grep -qF "$domain" next.config.ts \
  || log "WARNUNG: $domain steht nicht in next.config.ts (serverActions.allowedOrigins). Ohne Eintrag lehnt Next.js Formulare hinter dem Reverse Proxy ab."

# --- systemd-Dienst -------------------------------------------------------
log "Schreibe $UNIT_FILE ..."
unit=$(cat <<EOF
[Unit]
Description=WundDoku - digitale Wunddokumentation
After=network.target

[Service]
Type=simple
User=${run_user}
Group=${run_group}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
EnvironmentFile=${ENV_FILE}
ExecStart=${node_bin} ${APP_DIR}/node_modules/next/dist/bin/next start --port ${PORT} --hostname ${BIND_HOST}
Restart=on-failure
RestartSec=5
TimeoutStopSec=30

# Einschraenkungen: kein Rechtezuwachs, eigenes /tmp, Dateisystem schreibgeschuetzt.
# Schreiben darf der Dienst nur in die Datenablage und in den Next.js-Cache unter .next.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${DATA_DIR} -${APP_DIR}/.next

[Install]
WantedBy=multi-user.target
EOF
)
if [[ -f "$UNIT_FILE" ]] && [[ "$(cat "$UNIT_FILE")" == "$unit" ]]; then
  log 'Die Dienstdatei ist bereits aktuell.'
else
  printf '%s\n' "$unit" | sudo tee "$UNIT_FILE" >/dev/null
  sudo chmod 644 "$UNIT_FILE"
fi
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"
log "Dienst $SERVICE ist fuer den Systemstart angemeldet."

# --- Port und Firewall ----------------------------------------------------
if ! sudo systemctl is-active --quiet "$SERVICE" && command -v ss >/dev/null 2>&1; then
  if [[ -n $(ss -ltnH "sport = :${PORT}") ]]; then
    ss -ltnp "sport = :${PORT}" >&2 || true
    fail "Port $PORT wird bereits von einem anderen Programm benutzt. Anderen Port waehlen: PORT=... ./setup.sh"
  fi
fi

if [[ -n "$proxy_ip" ]]; then
  # ufw liegt in /usr/sbin, das fuer normale Benutzer nicht im PATH steht; sudo findet es.
  if sudo sh -c 'command -v ufw' >/dev/null 2>&1; then
    log "Gebe Port $PORT per UFW nur fuer $proxy_ip frei ..."
    sudo ufw allow from "$proxy_ip" to any port "$PORT" proto tcp
    if sudo ufw status | grep -Eq "^${PORT}(/tcp)?[[:space:]]+ALLOW[[:space:]]+Anywhere"; then
      log "WARNUNG: Es gibt eine allgemeine UFW-Regel fuer Port $PORT (ALLOW Anywhere). Bitte mit 'sudo ufw status numbered' pruefen und entfernen."
    fi
    sudo ufw status | grep -qi '^Status: active' || log 'Hinweis: UFW ist nicht aktiv, die Regel wirkt erst nach "sudo ufw enable" (vorher SSH freigeben: sudo ufw allow OpenSSH).'
  else
    log "Hinweis: ufw ist nicht installiert. Port $PORT bitte anderweitig auf $proxy_ip beschraenken."
  fi
fi

# --- Abhaengigkeiten, Build, Migrationen, Start ---------------------------
log 'Starte update.sh (Sicherung, Abhaengigkeiten, Build, Tests, Migrationen, Dienststart) ...'
env SERVICE="$SERVICE" PORT="$PORT" "$APP_DIR/update.sh"

# --- Erster Administrator -------------------------------------------------
if npx tsx prisma/admin-anlegen.ts --pruefen; then admin_status=0; else admin_status=$?; fi
if (( admin_status == 0 )); then
  log 'Die Datenbank hat noch keinen Benutzer. Lege den ersten Administrator an.'
  [[ -t 0 ]] || fail 'Zum Anlegen des Administrators wird ein Terminal benoetigt.'
  read -r -p 'E-Mail-Adresse: ' ADMIN_EMAIL
  read -r -p 'Vollstaendiger Name: ' ADMIN_NAME
  read -r -p 'Handzeichen (hoechstens 6 Zeichen): ' ADMIN_HANDZEICHEN
  while true; do
    read -r -s -p 'Passwort (mindestens 10 Zeichen): ' ADMIN_PASSWORT; echo
    read -r -s -p 'Passwort wiederholen: ' passwort_wiederholt; echo
    if [[ "$ADMIN_PASSWORT" != "$passwort_wiederholt" ]]; then
      log 'Die Passwoerter stimmen nicht ueberein.'
    elif (( ${#ADMIN_PASSWORT} < 10 )); then
      log 'Das Passwort ist zu kurz.'
    else
      break
    fi
  done
  export ADMIN_EMAIL ADMIN_NAME ADMIN_HANDZEICHEN ADMIN_PASSWORT
  npx tsx prisma/admin-anlegen.ts
  unset ADMIN_PASSWORT passwort_wiederholt
elif (( admin_status == 3 )); then
  log 'Es gibt bereits Benutzer; kein weiterer Administrator wird angelegt.'
else
  fail "Pruefung auf vorhandene Benutzer fehlgeschlagen (Exit-Code $admin_status)."
fi

if [[ "$BIND_HOST" == '127.0.0.1' ]]; then
  proxy_ziel='127.0.0.1'
  bind_hinweis="Die App lauscht nur lokal auf ${BIND_HOST}:${PORT}."
else
  proxy_ziel='<IP-dieses-Servers>'
  bind_hinweis="Die App lauscht auf ${BIND_HOST}:${PORT} (unverschluesseltes HTTP), der Zugriff ist per UFW zu beschraenken."
fi

cat <<EOF

Einrichtung abgeschlossen. ${bind_hinweis}
Reverse Proxy fuer https://${domain}: Weiterleitung an http://${proxy_ziel}:${PORT}, Host- und
X-Forwarded-Proto-Header durchreichen und Uploads bis 25 MB erlauben (nginx: client_max_body_size 25m;).
Verbindung vom Proxy-Rechner testen:  curl -I http://${proxy_ziel}:${PORT}/login

Konfiguration:     ${ENV_FILE}
Daten:             ${DATA_DIR}   Sicherungen: ${BACKUP_DIR}
Spaetere Updates:  ${APP_DIR}/update.sh
Dienststatus:      sudo systemctl status ${SERVICE}
Protokoll:         journalctl -u ${SERVICE} -f
EOF
