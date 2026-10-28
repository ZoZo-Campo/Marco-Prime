#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "${SCRIPT_DIR}"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

log() {
  printf '[Marco] %s\n' "$*"
}

finish() {
  local status=$?
  if [[ ${status} -ne 0 ]]; then
    printf '\n[Marco] Le lancement a échoué (code %s).\n' "${status}"
    read -r -n 1 -s -p "Appuie sur une touche pour fermer…"
    printf '\n'
  fi
}
trap finish EXIT

update_code() {
  if ! command -v git >/dev/null 2>&1 || [[ ! -d "${SCRIPT_DIR}/.git" ]]; then
    log "Dépôt Git introuvable : lancement de la version installée."
    return
  fi

  if ! git diff --quiet || ! git diff --cached --quiet; then
    log "Modifications locales détectées : git pull ignoré."
    return
  fi

  if [[ "$(git branch --show-current)" != "main" ]]; then
    log "Branche active différente de main : git pull ignoré."
    return
  fi

  log "Mise à jour depuis GitHub…"
  if ! GIT_TERMINAL_PROMPT=0 git pull --ff-only origin main; then
    log "Mise à jour impossible : lancement de la version locale."
  fi
}

start_docker() {
  if docker info >/dev/null 2>&1; then
    return
  fi

  if command -v colima >/dev/null 2>&1; then
    log "Docker est arrêté : démarrage de Colima…"
    colima start
    return
  fi

  log "Docker est arrêté et Colima est introuvable."
  exit 1
}

HOST_PORT="$(sed -n 's/^MARCO_HOST_PORT=\([0-9][0-9]*\)$/\1/p' "${SCRIPT_DIR}/.env.orange-pi" 2>/dev/null | tail -n 1)"
HOST_PORT="${HOST_PORT:-3001}"
APP_URL="http://127.0.0.1:${HOST_PORT}/"

update_code
start_docker

log "Construction et démarrage de Marco…"
"${SCRIPT_DIR}/marco" rebuild

log "Attente de Marco…"
for _attempt in $(seq 1 120); do
  if curl --silent --fail --max-time 3 "${APP_URL}ready" >/dev/null 2>&1; then
    log "Marco est prêt."
    open "${APP_URL}"
    exit 0
  fi
  sleep 1
done

log "Marco n'a pas répondu. Consulte les journaux avec : ./marco logs"
exit 1
