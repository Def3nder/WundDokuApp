#!/usr/bin/env bash
#
# Einrichtung von WundDoku auf dem Debian-Server (einmalig, mehrfach aufrufbar):
#   1. Datenverzeichnis /var/lib/wunddoku anlegen (Datenbank und Wundfotos)
#   2. .env erzeugen (eine vorhandene .env bleibt unveraendert)
#   3. systemd-Dienst wunddoku anlegen und fuer den Systemstart anmelden
#   4. ./update.sh ausfuehren (Abhaengigkeiten, Build, Migrationen, Start)
#   5. ersten Administrator abfragen und anlegen, falls es noch keinen Benutzer gibt
#
# Aufruf als normaler Benutzer (nicht root) aus dem Repository:  ./setup.sh
# Optional:  DOMAIN=wunddoku.bruechmann.xyz BIND_HOST=127.0.0.1 ./setup.sh

set -Eeuo pipefail
IFS=$'\n\t'

readonly APP_DIR='/opt/wunddoku-app'
readonly SERVICE="${SERVICE:-wunddoku}"
readonly PORT="${PORT:-3003}"
# 0.0.0.0: erreichbar fuer einen Reverse Proxy auf einem anderen Rechner. Liegt der Proxy auf
# demselben Server, ist BIND_HOST=127.0.0.1 sicherer.
readonly BIND_HOST="${BIND_HOST:-0.0.0.0}"
readonly DATA_DIR='/var/lib/wunddoku'
readonly DEFAULT_DOMAIN='wunddoku.bruechmann.xyz'
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

# Sudo-Passwort jetzt abfragen, nicht mitten im Ablauf.
sudo -v

log "Lege Datenverzeichnis $DATA_DIR an ..."
sudo install -d -o "$run_user" -g "$run_group" -m 750 "$DATA_DIR" "$DATA_DIR/storage"

# --- .env ---------------------------------------------------------------
if [[ -f .env ]]; then
  for key in DATABASE_URL AUTH_SECRET; do
    grep -Eq "^${key}=.+" .env || fail ".env existiert, enthaelt aber kein $key. Bitte ergaenzen oder .env entfernen."
  done
  log '.env existiert bereits und bleibt unveraendert (AUTH_SECRET darf sich nicht aendern, sonst werden alle Sitzungen ungueltig).'
else
  log 'Erzeuge .env ...'
  auth_secret=$(node -p "require('crypto').randomBytes(32).toString('base64')")
  (
    umask 077
    cat > .env <<EOF
# Von setup.sh erzeugt. Enthaelt Geheimnisse, nicht weitergeben und nicht einchecken.
DATABASE_URL="file:${DATA_DIR}/wunddoku.db"
STORAGE_DIR="${DATA_DIR}/storage"

# Auth.js: AUTH_SECRET niemals aendern oder weitergeben (signiert die Sitzungen).
AUTH_SECRET="${auth_secret}"
AUTH_URL="https://${domain}"
AUTH_TRUST_HOST=true
EOF
  )
  chmod 600 .env
fi

grep -qF "$domain" next.config.ts \
  || log "WARNUNG: $domain steht nicht in next.config.ts (serverActions.allowedOrigins). Ohne Eintrag lehnt Next.js Formulare hinter dem Reverse Proxy ab."

# --- systemd-Dienst -----------------------------------------------------
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
ExecStart=${node_bin} ${APP_DIR}/node_modules/next/dist/bin/next start --port ${PORT} --hostname ${BIND_HOST}
Restart=on-failure
RestartSec=5
TimeoutStopSec=30

# Einschraenkungen: kein Rechtezuwachs, eigenes /tmp, System und /home nicht beschreibbar.
# Schreibzugriff bleibt fuer ${APP_DIR} und ${DATA_DIR}.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true

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

# --- Abhaengigkeiten, Build, Migrationen, Start -------------------------
log 'Starte update.sh (Abhaengigkeiten, Build, Migrationen, Dienststart) ...'
env SERVICE="$SERVICE" PORT="$PORT" "$APP_DIR/update.sh"

# --- Erster Administrator -----------------------------------------------
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
  bind_hinweis="Die App lauscht auf ${BIND_HOST}:${PORT} und spricht unverschluesseltes HTTP. Den Port per
Firewall auf die Adresse des Reverse Proxys beschraenken, z. B.:
  sudo ufw allow from <Proxy-IP> to any port ${PORT} proto tcp"
fi

cat <<EOF

Einrichtung abgeschlossen. ${bind_hinweis}
Der Reverse Proxy fuer https://${domain} muss auf ${proxy_ziel}:${PORT} weiterleiten, z. B. nginx:

  location / {
      proxy_pass http://${proxy_ziel}:${PORT};
      proxy_set_header Host \$host;
      proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto \$scheme;
      client_max_body_size 25m;   # Wundfotos und Dokumente bis 20 MB
  }

Spaetere Updates:  ${APP_DIR}/update.sh
Dienststatus:      sudo systemctl status ${SERVICE}
Protokoll:         journalctl -u ${SERVICE} -f
EOF
