#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="/opt/marco-prime"
KIOSK_URL="http://127.0.0.1:3001/"
READY_URL="http://127.0.0.1:3001/ready"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
KIOSK_USER="${1:-${SUDO_USER:-}}"

if [[ "${EUID}" -ne 0 ]]; then
  exec sudo "$0" "${1:-}"
fi

if [[ -z "${KIOSK_USER}" || "${KIOSK_USER}" == "root" ]]; then
  echo "Erreur : lance ce script avec sudo depuis le compte qui affichera Marco."
  echo "Exemple : sudo ./install-raspberry-pi.sh pi"
  exit 1
fi

if ! id "${KIOSK_USER}" >/dev/null 2>&1; then
  echo "Erreur : l'utilisateur '${KIOSK_USER}' n'existe pas."
  exit 1
fi

if [[ "$(dpkg --print-architecture)" != "arm64" ]]; then
  echo "Erreur : Raspberry Pi OS Lite 64 bits (arm64) est requis."
  exit 1
fi

for required_file in compose.orange-pi.yml Dockerfile.orange-pi .env.orange-pi marco; do
  if [[ ! -f "${SCRIPT_DIR}/${required_file}" ]]; then
    echo "Erreur : ${required_file} est absent de ${SCRIPT_DIR}."
    exit 1
  fi
done

if grep -q "REPLACE_HERE" "${SCRIPT_DIR}/.env.orange-pi"; then
  echo "Erreur : complète .env.orange-pi avant de lancer l'installation."
  exit 1
fi

echo "Installation des composants légers du kiosque..."
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates \
  cage \
  chromium \
  curl \
  dbus-user-session \
  rsync

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Installation de Docker Engine et du plugin Compose..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  . /etc/os-release
  DOCKER_CODENAME="${VERSION_CODENAME:-trixie}"
  DOCKER_ARCH="$(dpkg --print-architecture)"
  printf '%s\n' \
    "Types: deb" \
    "URIs: https://download.docker.com/linux/debian" \
    "Suites: ${DOCKER_CODENAME}" \
    "Components: stable" \
    "Architectures: ${DOCKER_ARCH}" \
    "Signed-By: /etc/apt/keyrings/docker.asc" \
    > /etc/apt/sources.list.d/docker.sources

  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
fi

systemctl enable --now docker.service

echo "Copie de Marco Prime dans ${INSTALL_DIR}..."
mkdir -p "${INSTALL_DIR}"
if [[ "$(readlink -f "${SCRIPT_DIR}")" != "$(readlink -f "${INSTALL_DIR}")" ]]; then
  rsync -a \
    --exclude='.git/' \
    --exclude='node_modules/' \
    --exclude='dist/' \
    --exclude='logs/' \
    --exclude='data/' \
    "${SCRIPT_DIR}/" "${INSTALL_DIR}/"
fi
chmod 600 "${INSTALL_DIR}/.env.orange-pi"
chmod 755 "${INSTALL_DIR}/marco"

echo "Construction et premier démarrage de Marco Prime..."
"${INSTALL_DIR}/marco" restart

cat > /etc/systemd/system/marco-prime.service <<'UNIT'
[Unit]
Description=Marco Prime Docker application
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/marco-prime
ExecStart=/usr/bin/docker compose --project-name marco-prime -f /opt/marco-prime/compose.orange-pi.yml --env-file /opt/marco-prime/.env.orange-pi up -d --no-build
ExecStop=/usr/bin/docker compose --project-name marco-prime -f /opt/marco-prime/compose.orange-pi.yml --env-file /opt/marco-prime/.env.orange-pi stop
TimeoutStartSec=0
TimeoutStopSec=45

[Install]
WantedBy=multi-user.target
UNIT

cat > /usr/local/bin/marco-kiosk-launch <<'LAUNCHER'
#!/usr/bin/env bash
set -Eeuo pipefail

until curl --fail --silent --show-error --max-time 3 \
  http://127.0.0.1:3001/ready >/dev/null; do
  sleep 2
done

exec /usr/bin/cage -- /usr/bin/chromium \
  --ozone-platform=wayland \
  --kiosk \
  --noerrdialogs \
  --no-first-run \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  http://127.0.0.1:3001/
LAUNCHER
chmod 755 /usr/local/bin/marco-kiosk-launch

cat > /etc/pam.d/cage <<'PAM'
auth       required pam_unix.so nullok
account    required pam_unix.so
session    required pam_unix.so
session    required pam_systemd.so
PAM

cat > /etc/systemd/system/marco-kiosk.service <<UNIT
[Unit]
Description=Marco Prime full-screen kiosk
Requires=marco-prime.service
After=marco-prime.service systemd-user-sessions.service dbus.socket systemd-logind.service
Wants=dbus.socket systemd-logind.service
Before=graphical.target
Conflicts=getty@tty1.service
ConditionPathExists=/dev/tty0

[Service]
Type=simple
User=${KIOSK_USER}
SupplementaryGroups=video render input
PAMName=cage
UtmpIdentifier=tty1
UtmpMode=user
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes
TTYVTDisallocate=yes
StandardInput=tty-fail
Environment=WLR_LIBINPUT_NO_DEVICES=1
ExecStart=/usr/local/bin/marco-kiosk-launch
ExecStartPost=+sh -c 'chvt 1'
Restart=always
RestartSec=3

[Install]
WantedBy=graphical.target
UNIT

systemctl daemon-reload
systemctl enable marco-prime.service marco-kiosk.service
systemctl set-default graphical.target
systemctl restart marco-prime.service
systemctl restart marco-kiosk.service

echo
echo "Installation terminée."
echo "Marco : ${KIOSK_URL}"
echo "État application : systemctl status marco-prime.service"
echo "État kiosque : systemctl status marco-kiosk.service"
echo "Redémarre avec : sudo reboot"
