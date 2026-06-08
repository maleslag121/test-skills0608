#!/usr/bin/env bash
# Remote activation entry: switch release, start runtime, health check.
set -euo pipefail

RUNTIME="${1:?runtime required (pm2|docker|systemd)}"
RELEASE_PATH="${2:?release path required}"
DEPLOY_ROOT="${3:?deploy root required}"
APP_NAME="${4:?app name required}"
APP_PORT="${5:?app port required}"
HEALTH_URL="${6:-http://127.0.0.1:${APP_PORT}/health}"
HEALTH_TIMEOUT="${7:-30}"
KEEP_RELEASES="${8:-3}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Activating release ==="
echo "Runtime: $RUNTIME"
echo "Release: $RELEASE_PATH"
echo "App: $APP_NAME on port $APP_PORT"

# Port check
bash "${SCRIPT_DIR}/check-port.sh" "$APP_NAME" "$APP_PORT"

# Switch current symlink
ln -sfn "$RELEASE_PATH" "${DEPLOY_ROOT}/current"

# Load shared env if present
ENV_FILE="${DEPLOY_ROOT}/shared/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

export PORT="$APP_PORT"
export APP_NAME="$APP_NAME"
export NODE_ENV="${NODE_ENV:-production}"

cd "${DEPLOY_ROOT}/current"

case "$RUNTIME" in
  pm2)
    PROFILE_DIR="${DEPLOY_ROOT}/current/deploy/profiles/pm2"
    ECOSYSTEM="${PROFILE_DIR}/ecosystem.config.cjs"
    if [[ ! -f "$ECOSYSTEM" ]]; then
      ECOSYSTEM="${SCRIPT_DIR}/../profiles/pm2/ecosystem.config.cjs"
    fi
    # Copy ecosystem to release if bundled
    if [[ -f "deploy/profiles/pm2/ecosystem.config.cjs" ]]; then
      ECOSYSTEM="$(pwd)/deploy/profiles/pm2/ecosystem.config.cjs"
    fi
    export DEPLOY_APP_NAME="$APP_NAME"
    export DEPLOY_APP_PORT="$APP_PORT"
    export DEPLOY_PATH="$DEPLOY_ROOT"
    if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
      pm2 reload "$ECOSYSTEM" --update-env
    else
      pm2 start "$ECOSYSTEM"
    fi
    pm2 save
    ;;
  docker)
    COMPOSE_FILE="deploy/profiles/docker/docker-compose.prod.yml"
    [[ -f "$COMPOSE_FILE" ]] || COMPOSE_FILE="${SCRIPT_DIR}/../profiles/docker/docker-compose.prod.yml"
    APP_PORT="$APP_PORT" APP_NAME="$APP_NAME" docker compose -f "$COMPOSE_FILE" up -d --remove-orphans
    ;;
  systemd)
    UNIT="/etc/systemd/system/${APP_NAME}.service"
    sudo cp "deploy/profiles/systemd/app.service.template" "$UNIT" 2>/dev/null || \
      sudo cp "${SCRIPT_DIR}/../profiles/systemd/app.service.template" "$UNIT"
    sudo sed -i "s|__APP_NAME__|${APP_NAME}|g; s|__DEPLOY_PATH__|${DEPLOY_ROOT}/current|g; s|__APP_PORT__|${APP_PORT}|g" "$UNIT"
    sudo systemctl daemon-reload
    sudo systemctl enable "$APP_NAME"
    sudo systemctl restart "$APP_NAME"
    ;;
  *)
    echo "Unknown runtime: $RUNTIME" >&2
    exit 1
    ;;
esac

bash "${SCRIPT_DIR}/cleanup-releases.sh" "$DEPLOY_ROOT" "$KEEP_RELEASES"
bash "${SCRIPT_DIR}/health-check.sh" "$HEALTH_URL" "$HEALTH_TIMEOUT"

echo "=== Activation complete ==="
