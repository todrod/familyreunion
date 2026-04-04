#!/usr/bin/env bash
# Run this ONCE on the VPS to set up reunion.todrod.com
# Usage: bash vps-setup.sh
set -euo pipefail

APP_PATH="/var/www/familyreunion"
APP_PORT="3205"
DOMAIN="reunion.todrod.com"
NGINX_CONF="/etc/nginx/sites-available/reunion.todrod.com"

echo "==> Cloning repo..."
mkdir -p "$APP_PATH"
if [ ! -d "$APP_PATH/.git" ]; then
  git clone git@github.com:todrod/familyreunion.git "$APP_PATH"
else
  echo "    Repo already exists, skipping clone."
fi

echo "==> Creating .env.local (fill in credentials after)..."
if [ ! -f "$APP_PATH/.env.local" ]; then
  cat > "$APP_PATH/.env.local" <<ENV
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=CHANGE_ME
DB_PASSWORD=CHANGE_ME
DB_NAME=familyreunion
SESSION_SECRET=$(openssl rand -hex 32)
ENV
  echo "    .env.local created. Edit it: nano $APP_PATH/.env.local"
else
  echo "    .env.local already exists, skipping."
fi

echo "==> Creating MariaDB database + table..."
mysql -u root -p <<SQL
CREATE DATABASE IF NOT EXISTS familyreunion CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
echo "    Run schema: mysql -u root -p familyreunion < $APP_PATH/schema.sql"

echo "==> Installing dependencies and building..."
cd "$APP_PATH"
npm ci --no-audit --no-fund
npm run build

echo "==> Starting with PM2..."
pm2 delete family-reunion >/dev/null 2>&1 || true
pm2 start /usr/bin/npm --name family-reunion --cwd "$APP_PATH" -- run start -- --port "$APP_PORT"
pm2 save

echo "==> Setting up nginx..."
cp "$APP_PATH/deploy/nginx.conf" "$NGINX_CONF"
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/reunion.todrod.com
nginx -t && systemctl reload nginx

echo "==> Obtaining SSL cert..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m todrod@gmail.com

echo ""
echo "Done! reunion.todrod.com is live."
echo "Remember to fill in DB credentials: nano $APP_PATH/.env.local"
echo "Then: pm2 restart family-reunion"
