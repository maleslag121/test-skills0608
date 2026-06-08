#!/usr/bin/env bash
# Check port availability and update the server-wide port registry.
set -euo pipefail

REGISTRY_DIR="${REGISTRY_DIR:-/var/www/.deploy-registry}"
REGISTRY_FILE="${REGISTRY_DIR}/ports.json"
APP_NAME="${1:?app_name required}"
APP_PORT="${2:?app_port required}"

mkdir -p "$REGISTRY_DIR"

if [[ ! -f "$REGISTRY_FILE" ]]; then
  echo '{}' > "$REGISTRY_FILE"
fi

# Check if port is owned by another app in registry
EXISTING_OWNER=$(node -e "
const fs = require('fs');
const reg = JSON.parse(fs.readFileSync('$REGISTRY_FILE', 'utf8'));
for (const [name, info] of Object.entries(reg)) {
  if (info.port === $APP_PORT && name !== '$APP_NAME') {
    console.log(name);
    process.exit(0);
  }
}
")

if [[ -n "$EXISTING_OWNER" ]]; then
  echo "ERROR: Port $APP_PORT is registered to project '$EXISTING_OWNER'" >&2
  exit 1
fi

# Check if port is in use by a foreign process
if command -v ss >/dev/null 2>&1; then
  IN_USE=$(ss -tlnH "sport = :$APP_PORT" 2>/dev/null | head -1 || true)
elif command -v netstat >/dev/null 2>&1; then
  IN_USE=$(netstat -tln 2>/dev/null | awk -v p=":$APP_PORT" '$4 ~ p {print; exit}' || true)
else
  IN_USE=""
fi

if [[ -n "$IN_USE" ]]; then
  # Allow if this app already owns the port (redeploy case)
  CURRENT_OWNER=$(node -e "
const fs = require('fs');
const reg = JSON.parse(fs.readFileSync('$REGISTRY_FILE', 'utf8'));
console.log(reg['$APP_NAME']?.port === $APP_PORT ? 'self' : '');
" 2>/dev/null || echo "")

  if [[ "$CURRENT_OWNER" != "self" ]]; then
    echo "ERROR: Port $APP_PORT is already in use on this server" >&2
    echo "$IN_USE" >&2
    exit 1
  fi
fi

# Update registry
node -e "
const fs = require('fs');
const path = '$REGISTRY_FILE';
const reg = JSON.parse(fs.readFileSync(path, 'utf8'));
reg['$APP_NAME'] = { port: $APP_PORT, updated: new Date().toISOString() };
fs.writeFileSync(path, JSON.stringify(reg, null, 2) + '\n');
console.log('Port $APP_PORT registered to $APP_NAME');
"
