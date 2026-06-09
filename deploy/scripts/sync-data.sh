#!/usr/bin/env bash
# 按项目数据存储方式，将本地有效数据同步到 ECS（不经过 Git）
# 用法:
#   bash deploy/scripts/sync-data.sh              # 读 .deploy/config.yml 或自动检测
#   bash deploy/scripts/sync-data.sh --strategy sqlite --local-path data/app.db
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

STRATEGY=""
LOCAL_PATH=""
LOCAL_PATHS=""
REMOTE_PATH=""
ENV_FILE=".env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --strategy) STRATEGY="$2"; shift 2 ;;
    --local-path) LOCAL_PATH="$2"; shift 2 ;;
    --local-paths) LOCAL_PATHS="$2"; shift 2 ;;
    --remote-path) REMOTE_PATH="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --root) ROOT="$2"; shift 2 ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

CONFIG_FILE="${ROOT}/.deploy/config.yml"

# shellcheck source=/dev/null
source "${SCRIPT_DIR}/load-deploy-env.sh" "$ROOT"

ECS_HOST="${ECS_HOST:?请设置 ECS_HOST（.deploy/config.yml 的 ecs.host 或环境变量）}"
ECS_USER="${ECS_USER:-root}"
ECS_PORT="${ECS_PORT:-22}"
SSH_KEY="${SSH_PRIVATE_KEY_PATH:-$HOME/Documents/J_project/ssh-skills/test-skills.pem}"

[[ -f "$SSH_KEY" ]] || { echo "ERROR: SSH 私钥不存在: $SSH_KEY" >&2; exit 1; }
[[ -f "$CONFIG_FILE" ]] || { echo "ERROR: 未找到 $CONFIG_FILE" >&2; exit 1; }

CONFIG=$(node "${SCRIPT_DIR}/parse-config.mjs" "$CONFIG_FILE")
DEPLOY_PATH=$(echo "$CONFIG" | jq -r '.deploy_path')
APP_NAME=$(echo "$CONFIG" | jq -r '.app_name // empty')
DATA_SYNC=$(echo "$CONFIG" | jq -r '.data.sync // "auto"')

if [[ "$DATA_SYNC" == "off" || "$DATA_SYNC" == "false" ]]; then
  echo "data.sync=off，跳过数据同步"
  exit 0
fi

# 读取配置或自动检测
if [[ -z "$STRATEGY" ]]; then
  STRATEGY=$(echo "$CONFIG" | jq -r '.data.strategy // "auto"')
fi

if [[ "$STRATEGY" == "auto" || -z "$STRATEGY" ]]; then
  DETECT=$(node "${SCRIPT_DIR}/detect-data-store.mjs" "$ROOT")
  STRATEGY=$(echo "$DETECT" | jq -r '.recommendation.strategy')
  [[ -z "$LOCAL_PATH" ]] && LOCAL_PATH=$(echo "$DETECT" | jq -r '.recommendation.local_path // empty')
  [[ -z "$LOCAL_PATHS" ]] && LOCAL_PATHS=$(echo "$DETECT" | jq -r '.recommendation.local_paths // [] | join(",")')
  [[ -z "$REMOTE_PATH" ]] && REMOTE_PATH=$(echo "$DETECT" | jq -r '.recommendation.remote_path // empty')
  echo "==> 自动检测: strategy=$STRATEGY"
  echo "$DETECT" | jq -r '.recommendation.note // empty'
fi

# 配置覆盖（支持 data.local_path 扁平写法）
[[ -z "$LOCAL_PATH" ]] && LOCAL_PATH=$(echo "$CONFIG" | jq -r '.data.local_path // .data.sqlite.local_path // empty')
[[ -z "$REMOTE_PATH" ]] && REMOTE_PATH=$(echo "$CONFIG" | jq -r '.data.remote_path // .data.sqlite.remote_path // .data.files.remote_path // empty')
CONFIG_PATHS=$(echo "$CONFIG" | jq -r '.data.files.local_paths // [] | join(",")')
[[ -n "$CONFIG_PATHS" && "$CONFIG_PATHS" != "null" ]] && LOCAL_PATHS="$CONFIG_PATHS"

remote_mkdir() {
  ssh -i "$SSH_KEY" -p "$ECS_PORT" -o StrictHostKeyChecking=accept-new \
    "${ECS_USER}@${ECS_HOST}" "mkdir -p $(printf '%q' "$1")"
}

reload_app() {
  if [[ -n "$APP_NAME" ]]; then
    ssh -i "$SSH_KEY" -p "$ECS_PORT" -o BatchMode=yes "${ECS_USER}@${ECS_HOST}" \
      "command -v pm2 >/dev/null && pm2 describe '$APP_NAME' >/dev/null 2>&1 && pm2 reload '$APP_NAME' || \
       systemctl is-active '$APP_NAME' >/dev/null 2>&1 && systemctl restart '$APP_NAME' || true"
  fi
}

sync_env() {
  local src="${ROOT}/${ENV_FILE}"
  local dst="${DEPLOY_PATH}/shared/.env"
  [[ -f "$src" ]] || { echo "WARN: 本地无 $ENV_FILE，跳过 env 同步"; return 0; }
  echo "==> 同步 .env -> shared/.env"
  remote_mkdir "${DEPLOY_PATH}/shared"
  scp -i "$SSH_KEY" -P "$ECS_PORT" -o StrictHostKeyChecking=accept-new \
    "$src" "${ECS_USER}@${ECS_HOST}:${dst}"
  ssh -i "$SSH_KEY" -p "$ECS_PORT" -o BatchMode=yes "${ECS_USER}@${ECS_HOST}" \
    "chmod 600 $(printf '%q' "$dst")"
}

case "$STRATEGY" in
  none)
    echo "无需同步数据"
    exit 0
    ;;
  sqlite)
    REMOTE_PATH="${REMOTE_PATH:-shared/data.db}"
    LOCAL_DB="${ROOT}/${LOCAL_PATH}"
    [[ -f "$LOCAL_DB" ]] || { echo "ERROR: SQLite 不存在: $LOCAL_DB" >&2; exit 1; }
    REMOTE_FILE="${DEPLOY_PATH}/${REMOTE_PATH}"
    echo "==> SQLite: $LOCAL_DB -> $REMOTE_FILE"
    remote_mkdir "${DEPLOY_PATH}/$(dirname "$REMOTE_PATH")"
    # 合并 WAL，确保单文件完整
    if command -v sqlite3 >/dev/null 2>&1; then
      sqlite3 "$LOCAL_DB" "PRAGMA wal_checkpoint(FULL);"
    fi
    scp -i "$SSH_KEY" -P "$ECS_PORT" -o StrictHostKeyChecking=accept-new \
      "$LOCAL_DB" "${ECS_USER}@${ECS_HOST}:${REMOTE_FILE}"
    ssh -i "$SSH_KEY" -p "$ECS_PORT" -o BatchMode=yes "${ECS_USER}@${ECS_HOST}" \
      "chmod 600 $(printf '%q' "$REMOTE_FILE")"
    ;;
  files)
    REMOTE_PATH="${REMOTE_PATH:-shared/data}"
    IFS=',' read -ra PATHS <<< "${LOCAL_PATHS:-data}"
    remote_mkdir "${DEPLOY_PATH}/${REMOTE_PATH}"
    for p in "${PATHS[@]}"; do
      p=$(echo "$p" | xargs)
      [[ -d "${ROOT}/${p}" ]] || { echo "WARN: 跳过不存在的目录 $p"; continue; }
      echo "==> 目录: $p -> ${DEPLOY_PATH}/${REMOTE_PATH}/"
      rsync -avz -e "ssh -i $SSH_KEY -p $ECS_PORT -o StrictHostKeyChecking=accept-new" \
        "${ROOT}/${p}/" "${ECS_USER}@${ECS_HOST}:${DEPLOY_PATH}/${REMOTE_PATH}/"
    done
    ;;
  env-only)
    sync_env
    reload_app
    echo "==> 远程数据库模式：仅同步连接配置"
    exit 0
    ;;
  postgres-dump|mysql-dump)
    sync_env
    DUMP_CMD=$(echo "$CONFIG" | jq -r ".data.${STRATEGY%%-dump}.dump_cmd // empty")
    RESTORE_CMD=$(echo "$CONFIG" | jq -r ".data.${STRATEGY%%-dump}.restore_cmd // empty")
    if [[ -z "$DUMP_CMD" || -z "$RESTORE_CMD" ]]; then
      echo "ERROR: 请在 .deploy/config.yml 配置 data.${STRATEGY%%-dump}.dump_cmd 与 restore_cmd" >&2
      echo "       或改用远程 RDS + env-only 策略" >&2
      exit 1
    fi
    TMP_DUMP=$(mktemp /tmp/deploy-dump.XXXXXX.sql)
    trap 'rm -f "$TMP_DUMP"' EXIT
    echo "==> 导出本地数据库"
    (cd "$ROOT" && eval "$DUMP_CMD" > "$TMP_DUMP")
    REMOTE_DUMP="${DEPLOY_PATH}/shared/import.sql"
    scp -i "$SSH_KEY" -P "$ECS_PORT" "$TMP_DUMP" "${ECS_USER}@${ECS_HOST}:${REMOTE_DUMP}"
    echo "==> 远程恢复"
    ssh -i "$SSH_KEY" -p "$ECS_PORT" "${ECS_USER}@${ECS_HOST}" \
      "cd $(printf '%q' "$DEPLOY_PATH") && eval $(printf '%q' "$RESTORE_CMD")"
    ssh -i "$SSH_KEY" -p "$ECS_PORT" "${ECS_USER}@${ECS_HOST}" "rm -f $(printf '%q' "$REMOTE_DUMP")"
    ;;
  *)
    echo "ERROR: 未知 strategy: $STRATEGY" >&2
    exit 1
    ;;
esac

reload_app
echo "==> 数据同步完成 (strategy=$STRATEGY)"
