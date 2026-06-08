#!/usr/bin/env bash
# One-time ECS bootstrap: nginx, node, pm2, docker (optional), port registry.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-root}"
REGISTRY_DIR="/var/www/.deploy-registry"

echo "=== kaifa-workflow ECS Bootstrap ==="

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root: sudo bash bootstrap-ecs.sh" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

# Detect package manager
if command -v apt-get >/dev/null 2>&1; then
  PKG_UPDATE="apt-get update -qq"
  PKG_INSTALL="apt-get install -y -qq"
elif command -v yum >/dev/null 2>&1; then
  PKG_UPDATE="yum makecache -q"
  PKG_INSTALL="yum install -y -q"
else
  echo "Unsupported OS: need apt-get or yum" >&2
  exit 1
fi

echo "[1/6] Installing base packages..."
$PKG_UPDATE
$PKG_INSTALL curl git nginx rsync jq

echo "[2/6] Installing Node.js 20..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  $PKG_INSTALL nodejs
fi
node --version
npm --version

echo "[3/6] Installing PM2..."
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
  pm2 startup systemd -u "$DEPLOY_USER" --hp "/${DEPLOY_USER}" || true
fi

echo "[4/6] Creating directory structure..."
mkdir -p "$REGISTRY_DIR"
mkdir -p /var/www
echo '{}' > "${REGISTRY_DIR}/ports.json"
chmod 644 "${REGISTRY_DIR}/ports.json"

# Install deploy scripts to a shared location
SHARED_SCRIPTS="/usr/local/lib/kaifa-workflow"
mkdir -p "$SHARED_SCRIPTS"

echo "[5/6] Configuring Nginx..."
# Enable sites-enabled pattern (Debian/Ubuntu style)
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
if ! grep -q "sites-enabled" /etc/nginx/nginx.conf 2>/dev/null; then
  sed -i '/http {/a \    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf || true
fi
systemctl enable nginx
systemctl start nginx

echo "[6/6] Optional: Docker (skip if not needed)..."
if [[ "${INSTALL_DOCKER:-0}" == "1" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
  fi
fi

echo ""
echo "=== Bootstrap complete ==="
echo ""
echo "Next steps for a new project:"
echo "  1. Allocate port:  bash allocate-port.sh <app_name>"
echo "  2. Create dirs:    mkdir -p /var/www/<app_name>/{releases,shared/logs}"
echo "  3. Copy .env:      cp .env.example /var/www/<app_name>/shared/.env"
echo "  4. Setup Nginx:    bash setup-nginx.sh <app_name> <port> [domain] /var/www/<app_name>"
echo "  5. Configure GitHub Secrets and push to main"
echo ""
echo "Port registry: ${REGISTRY_DIR}/ports.json"
