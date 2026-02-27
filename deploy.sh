#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/ACE_App"
BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-docker-compose.vps.yml}"
SERVICES="${DEPLOY_SERVICES:-api web}"
CONTAINERS="${DEPLOY_CONTAINERS:-ace-backend ace-web}"
HEALTH_RETRIES="${DEPLOY_HEALTH_RETRIES:-36}"
HEALTH_SLEEP_SECONDS="${DEPLOY_HEALTH_SLEEP_SECONDS:-5}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

wait_for_containers() {
  local retries="$1"
  local sleep_seconds="$2"

  for ((i=1; i<=retries; i++)); do
    local all_ready=true
    for container in $CONTAINERS; do
      local status
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || echo "not-found")"
      if [[ "$status" != "healthy" && "$status" != "running" ]]; then
        all_ready=false
        log "Waiting for $container: status=$status ($i/$retries)"
      else
        log "Container $container status=$status"
      fi
    done

    if [[ "$all_ready" == "true" ]]; then
      return 0
    fi

    sleep "$sleep_seconds"
  done

  return 1
}

rollback() {
  if [[ -n "${PREV_COMMIT:-}" ]]; then
    log "Rollback to commit $PREV_COMMIT"
    git checkout "$BRANCH"
    git reset --hard "$PREV_COMMIT"
    docker compose -f "$COMPOSE_FILE" up -d --build $SERVICES
  fi
}

main() {
  cd "$APP_DIR"

  if ! git diff-index --quiet HEAD --; then
    log "Working tree has local changes on VPS. Skip deploy (no restart) to avoid overwriting manual edits."
    exit 0
  fi

  PREV_COMMIT="$(git rev-parse HEAD)"
  trap 'log "Deploy failed"; rollback' ERR

  log "Fetch latest from origin/$BRANCH"
  git fetch --prune origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"

  log "Build and restart services: $SERVICES"
  docker compose -f "$COMPOSE_FILE" up -d --build $SERVICES

  log "Wait for service health"
  if ! wait_for_containers "$HEALTH_RETRIES" "$HEALTH_SLEEP_SECONDS"; then
    log "Health check timeout"
    exit 1
  fi

  trap - ERR
  log "Deploy success"
}

main "$@"
