#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  AWAIS X MD - VPS installer (Ubuntu 20.04+/Debian 11+)
#  Usage:  bash install-vps.sh        (run as root or with sudo)
# ═══════════════════════════════════════════════════════════
set -e
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

echo "⚡ AWAIS X MD - VPS setup starting..."
$SUDO apt-get update -y
$SUDO apt-get install -y curl git ffmpeg unzip zip build-essential python3 ca-certificates gnupg imagemagick webp

# Node.js 20 LTS (skip if Node >= 18 already installed)
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi
echo "✅ Node: $(node -v)  |  npm: $(npm -v)"

# PM2 process manager (24/7 + auto-restart)
$SUDO npm install -g pm2

cd "$(dirname "$0")"
# npm 12 blocks git dependencies by default (a Baileys dependency needs one) -> allow them for this install
NPM_MAJOR="$(npm -v 2>/dev/null | cut -d. -f1)"
if [ "${NPM_MAJOR:-0}" -ge 11 ] 2>/dev/null; then export NPM_CONFIG_ALLOW_GIT=all; fi

npm install --no-audit --no-fund
mkdir -p sessions temp tmp logs

echo ""
echo "══════════════════════════════════════════"
echo " ✅ INSTALL COMPLETE"
echo "══════════════════════════════════════════"
echo " 1) First setup:   npm start   (the launcher menu opens: choose 2 or 3; in Terminal mode enter"
echo "                                your number, type the pairing code in WhatsApp, wait for 'Connected',"
echo "                                then press CTRL+C. PM2 cannot ask questions, so pair BEFORE step 2)"
echo "    or manual:      cp .env.example .env && nano .env"
echo " 2) Start 24/7:    pm2 start ecosystem.config.js   (PM2 has no menu, it uses the saved .env)"
echo " 3) Auto-start on reboot:  pm2 save && pm2 startup"
echo " 4) Logs:          pm2 logs awais-x-md   (without PM2 you can also use: bash run247.sh)"
echo "══════════════════════════════════════════"
