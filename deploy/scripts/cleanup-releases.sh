#!/usr/bin/env bash
# Clean old releases, keeping the most recent N.
set -euo pipefail

DEPLOY_PATH="${1:?deploy path required}"
KEEP="${2:-3}"

RELEASES_DIR="${DEPLOY_PATH}/releases"
[[ -d "$RELEASES_DIR" ]] || exit 0

cd "$RELEASES_DIR"
CURRENT=$(readlink -f "${DEPLOY_PATH}/current" 2>/dev/null || echo "")

mapfile -t ALL < <(ls -1dt */ 2>/dev/null | sed 's|/||' || true)
TO_DELETE=()

for (( i=KEEP; i<${#ALL[@]}; i++ )); do
  candidate="${RELEASES_DIR}/${ALL[$i]}"
  if [[ "$candidate" != "$CURRENT" && -n "${ALL[$i]}" ]]; then
    TO_DELETE+=("${ALL[$i]}")
  fi
done

for release in "${TO_DELETE[@]}"; do
  echo "Removing old release: $release"
  rm -rf "${RELEASES_DIR}/${release}"
done
