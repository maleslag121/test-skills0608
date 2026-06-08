#!/usr/bin/env bash
# Generate per-project Nginx site config (does not touch other projects).
set -euo pipefail

APP_NAME="${1:?app_name}"
APP_PORT="${2:?app_port}"
SERVER_NAME="${3:-_}"
DEPLOY_PATH="${4:?deploy_path}"
OUTPUT="/etc/nginx/sites-available/${APP_NAME}"

if [[ "$SERVER_NAME" == "_" || -z "$SERVER_NAME" ]]; then
  SERVER_NAME="_"
fi

sudo tee "$OUTPUT" > /dev/null <<EOF
# Managed by kaifa-workflow deploy — project: ${APP_NAME}
server {
    listen 80;
    server_name ${SERVER_NAME};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

sudo ln -sf "$OUTPUT" "/etc/nginx/sites-enabled/${APP_NAME}"
sudo nginx -t
sudo systemctl reload nginx
echo "Nginx configured for ${APP_NAME} -> 127.0.0.1:${APP_PORT}"
