#!/usr/bin/env bash

# Dedicated Songwriting Dashboard VPS Deployment Script
set -e

WEB_ROOT="/var/www/songwriting-study"

echo "=========================================="
echo " Songwriting Study Dashboard VPS Deployer"
echo "=========================================="

if [ -d "$WEB_ROOT" ]; then
    echo "[1/3] Updating repository in $WEB_ROOT..."
    cd "$WEB_ROOT"
    git pull origin main || git pull origin setup/songwriting-plan || true
else
    echo "[1/3] Cloning repository to $WEB_ROOT..."
    git clone https://github.com/tomoaki16/songwriting-study.git "$WEB_ROOT"
fi

echo "[2/3] Setting permissions..."
chmod -R 755 "$WEB_ROOT/dashboard"

echo "[3/3] Restarting/reloading Nginx server..."
if command -v systemctl &> /dev/null; then
    sudo systemctl reload nginx || sudo service nginx reload || true
fi

echo "=========================================="
echo " Deployment Complete!"
echo " Dashboard is live at your VPS web root."
echo "=========================================="
