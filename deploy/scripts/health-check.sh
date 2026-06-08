#!/usr/bin/env bash
set -euo pipefail

URL="${1:?health check url required}"
TIMEOUT="${2:-30}"
INTERVAL=2
ELAPSED=0

echo "Health check: $URL (timeout ${TIMEOUT}s)"

while [[ $ELAPSED -lt $TIMEOUT ]]; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "Health check passed"
    curl -fsS "$URL"
    echo ""
    exit 0
  fi
  sleep "$INTERVAL"
  ELAPSED=$((ELAPSED + INTERVAL))
done

echo "ERROR: Health check failed after ${TIMEOUT}s" >&2
exit 1
