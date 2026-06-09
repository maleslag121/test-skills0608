#!/usr/bin/env bash
# 将本地 SQLite 数据库同步到 ECS shared/（不经过 Git）
# 用法: bash deploy/scripts/sync-sqlite.sh [项目根目录]
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
CONFIG_FILE="${ROOT}/.deploy/config.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "ERROR: 未找到 $CONFIG_FILE" >&2
  exit 1
fi

CONFIG=$(node "${SCRIPT_DIR}/parse-config.mjs" "$CONFIG_FILE")
ENABLED=$(echo "$CONFIG" | jq -r '.sqlite.enabled // false')
LOCAL_PATH=$(echo "$CONFIG" | jq -r '.sqlite.local_path // empty')
REMOTE_REL=$(echo "$CONFIG" | jq -r '.sqlite.remote_path // "shared/data.db"')
DEPLOY_PATH=$(echo "$CONFIG" | jq -r '.deploy_path')
APP_NAME=$(echo "$CONFIG" | jq -r '.app_name // empty')

if [[ "$ENABLED" != "true" ]]; then
  echo "sqlite.enabled 未开启，跳过数据同步"
  exit 0
fi

if [[ -z "$LOCAL_PATH" || -z "$DEPLOY_PATH" ]]; then
  echo "ERROR: 请在 .deploy/config.yml 配置 sqlite.local_path 与 deploy_path" >&2
  exit 1
fi

LOCAL_DB="${ROOT}/${LOCAL_PATH}"
if [[ ! -f "$LOCAL_DB" ]]; then
  echo "ERROR: 本地数据库不存在: $LOCAL_DB" >&2
  exit 1
fi

ECS_HOST="${ECS_HOST:?请设置 ECS_HOST}"
ECS_USER="${ECS_USER:-root}"
ECS_PORT="${ECS_PORT:-22}"
SSH_KEY="${SSH_PRIVATE_KEY_PATH:-$HOME/Documents/J_project/ssh-skills/test-skills.pem}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "ERROR: SSH 私钥不存在: $SSH_KEY" >&2
  exit 1
fi

REMOTE_DIR="${DEPLOY_PATH}/$(dirname "$REMOTE_REL")"
REMOTE_FILE="${DEPLOY_PATH}/${REMOTE_REL}"

echo "==> 同步 SQLite"
echo "    本地: $LOCAL_DB"
echo "    远程: ${ECS_USER}@${ECS_HOST}:${REMOTE_FILE}"

ssh -i "$SSH_KEY" -p "$ECS_PORT" -o StrictHostKeyChecking=accept-new \
  "${ECS_USER}@${ECS_HOST}" "mkdir -p $(printf '%q' "$REMOTE_DIR")"

scp -i "$SSH_KEY" -P "$ECS_PORT" -o StrictHostKeyChecking=accept-new \
  "$LOCAL_DB" "${ECS_USER}@${ECS_HOST}:${REMOTE_FILE}"

ssh -i "$SSH_KEY" -p "$ECS_PORT" -o BatchMode=yes "${ECS_USER}@${ECS_HOST}" \
  "chmod 600 $(printf '%q' "$REMOTE_FILE")"

if [[ -n "$APP_NAME" ]] && ssh -i "$SSH_KEY" -p "$ECS_PORT" -o BatchMode=yes "${ECS_USER}@${ECS_HOST}" \
  "command -v pm2 >/dev/null && pm2 describe '$APP_NAME' >/dev/null 2>&1"; then
  echo "==> 重启应用 $APP_NAME"
  ssh -i "$SSH_KEY" -p "$ECS_PORT" -o BatchMode=yes "${ECS_USER}@${ECS_HOST}" \
    "pm2 reload '$APP_NAME'"
fi

echo "==> SQLite 同步完成"
