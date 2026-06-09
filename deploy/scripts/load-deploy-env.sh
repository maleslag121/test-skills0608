#!/usr/bin/env bash
# 从 .deploy/config.yml 加载 ECS 连接信息到环境变量（供 sync-data 等脚本使用）
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
CONFIG="${ROOT}/.deploy/config.yml"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[[ -f "$CONFIG" ]] || exit 0

JSON=$(node "${SCRIPT_DIR}/parse-config.mjs" "$CONFIG")

export ECS_HOST="${ECS_HOST:-$(echo "$JSON" | jq -r '.ecs.host // empty')}"
export ECS_USER="${ECS_USER:-$(echo "$JSON" | jq -r '.ecs.user // "root"')}"
export ECS_PORT="${ECS_PORT:-$(echo "$JSON" | jq -r '.ecs.port // 22')}"

KEY=$(echo "$JSON" | jq -r '.ecs.ssh_key // empty')
if [[ -n "$KEY" && -z "${SSH_PRIVATE_KEY_PATH:-}" ]]; then
  KEY="${KEY/#\~/$HOME}"
  export SSH_PRIVATE_KEY_PATH="$KEY"
fi

export SSH_PRIVATE_KEY_PATH="${SSH_PRIVATE_KEY_PATH:-$HOME/Documents/J_project/ssh-skills/test-skills.pem}"
