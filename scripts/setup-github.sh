#!/usr/bin/env bash
# One-time: login GitHub, create test repo, push main branch.
set -euo pipefail

REPO_NAME="${1:-kaifa-workflow-test}"
VISIBILITY="${2:-private}"  # private | public

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "Installing gh..."
  brew install gh
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "请先登录 GitHub（浏览器会弹出授权页）..."
  gh auth login --hostname github.com --git-protocol ssh --web
fi

echo "GitHub 用户: $(gh api user --jq .login)"

# Create repo if not exists
if gh repo view "$REPO_NAME" >/dev/null 2>&1; then
  echo "仓库已存在: $REPO_NAME"
else
  echo "创建仓库: $REPO_NAME ($VISIBILITY)"
  gh repo create "$REPO_NAME" --"$VISIBILITY" --description "Full-stack CI/CD workflow test" --source=. --remote=origin
fi

# Ensure remote
if ! git remote get-url origin >/dev/null 2>&1; then
  OWNER=$(gh api user --jq .login)
  git remote add origin "git@github.com:${OWNER}/${REPO_NAME}.git"
fi

echo "推送到 GitHub..."
git push -u origin main

echo ""
echo "=== 完成 ==="
OWNER=$(gh api user --jq .login)
echo "仓库地址: https://github.com/${OWNER}/${REPO_NAME}"
echo ""
echo "下一步: 在 GitHub 仓库 Settings → Secrets 配置 ECS_HOST / ECS_USER / ECS_SSH_KEY"
echo "详见 docs/github-secrets.md"
