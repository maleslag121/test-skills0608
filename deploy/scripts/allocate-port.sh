#!/usr/bin/env bash
# Allocate the next available port starting from PORT_RANGE_START.
set -euo pipefail

APP_NAME="${1:?app_name required}"
PORT_START="${2:-3001}"
PORT_END="${3:-3999}"
REGISTRY_DIR="${REGISTRY_DIR:-/var/www/.deploy-registry}"
REGISTRY_FILE="${REGISTRY_DIR}/ports.json"

mkdir -p "$REGISTRY_DIR"
[[ -f "$REGISTRY_FILE" ]] || echo '{}' > "$REGISTRY_FILE"

ALLOCATED=$(node -e "
const fs = require('fs');
const { execSync } = require('child_process');

const reg = JSON.parse(fs.readFileSync('$REGISTRY_FILE', 'utf8'));
const used = new Set(Object.values(reg).map(r => r.port));
if (reg['$APP_NAME']) {
  console.log(reg['$APP_NAME'].port);
  process.exit(0);
}

function portInUse(port) {
  try {
    const out = execSync('ss -tlnH \"sport = :' + port + '\" 2>/dev/null || true', { encoding: 'utf8' });
    return out.trim().length > 0;
  } catch { return false; }
}

for (let p = $PORT_START; p <= $PORT_END; p++) {
  if (!used.has(p) && !portInUse(p)) {
    reg['$APP_NAME'] = { port: p, updated: new Date().toISOString() };
    fs.writeFileSync('$REGISTRY_FILE', JSON.stringify(reg, null, 2) + '\n');
    console.log(p);
    process.exit(0);
  }
}
console.error('No free port in range $PORT_START-$PORT_END');
process.exit(1);
")

echo "Allocated port $ALLOCATED for $APP_NAME"
echo "$ALLOCATED"
