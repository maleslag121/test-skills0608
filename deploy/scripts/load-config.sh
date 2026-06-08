#!/usr/bin/env bash
# Parse .deploy/config.yml and export variables for shell scripts.
set -euo pipefail

CONFIG_FILE="${1:-.deploy/config.yml}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Config file not found: $CONFIG_FILE" >&2
  exit 1
fi

parse_yaml() {
  local key="$1"
  grep -E "^${key}:" "$CONFIG_FILE" | head -1 | sed -E "s/^${key}:[[:space:]]*//" | sed 's/^"//;s/"$//'
}

parse_nested() {
  local section="$1"
  local key="$2"
  awk -v section="$section" -v key="$key" '
    $0 ~ "^" section ":" { in_section=1; next }
    in_section && /^[^[:space:]]/ { in_section=0 }
    in_section && $0 ~ "^  " key ":" {
      sub(/^  [^:]+:[[:space:]]*/, "")
      gsub(/^"/, ""); gsub(/"$/, "")
      print
      exit
    }
  ' "$CONFIG_FILE"
}

export DEPLOY_RUNTIME="$(parse_yaml runtime)"
export DEPLOY_APP_NAME="$(parse_yaml app_name)"
export DEPLOY_APP_PORT="$(parse_yaml app_port)"
export DEPLOY_PATH="$(parse_yaml deploy_path)"
export DEPLOY_HEALTH_URL="$(parse_nested health_check url)"
export DEPLOY_HEALTH_TIMEOUT="$(parse_nested health_check timeout_seconds)"
export DEPLOY_FRONTEND_DIST="$(parse_yaml paths | awk '{print $1}' 2>/dev/null || parse_nested paths frontend_dist)"
export DEPLOY_BACKEND_ENTRY="$(parse_nested paths backend_entry)"
export DEPLOY_NGINX_SERVER_NAME="$(parse_nested nginx server_name)"
export DEPLOY_KEEP_RELEASES="$(parse_yaml keep_releases)"

# Fallback for paths if nested parse failed
if [[ -z "${DEPLOY_FRONTEND_DIST:-}" ]]; then
  DEPLOY_FRONTEND_DIST="$(parse_nested paths frontend_dist)"
fi

DEPLOY_HEALTH_TIMEOUT="${DEPLOY_HEALTH_TIMEOUT:-30}"
DEPLOY_KEEP_RELEASES="${DEPLOY_KEEP_RELEASES:-3}"

export DEPLOY_FRONTEND_DIST DEPLOY_BACKEND_ENTRY DEPLOY_HEALTH_TIMEOUT DEPLOY_KEEP_RELEASES

echo "Loaded deploy config: app=${DEPLOY_APP_NAME} port=${DEPLOY_APP_PORT} runtime=${DEPLOY_RUNTIME}"
