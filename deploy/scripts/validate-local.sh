#!/usr/bin/env bash
# Local validation: install, lint, test, build, parse config, check scripts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "=== Local CI validation ==="

echo "[1/5] npm install..."
npm install

echo "[2/5] lint..."
npm run lint

echo "[3/5] test..."
npm run test

echo "[4/5] build..."
npm run build

echo "[5/5] parse deploy config..."
node deploy/scripts/parse-config.mjs .deploy/config.yml | jq .

echo ""
echo "Checking deploy scripts exist..."
for script in load-config.sh check-port.sh allocate-port.sh health-check.sh remote-activate.sh cleanup-releases.sh; do
  test -f "deploy/scripts/$script" && echo "  OK: $script"
done

echo ""
echo "=== All local checks passed ==="
