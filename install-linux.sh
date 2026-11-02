#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  AWAIS X MD - Linux installer (Ubuntu / Debian and derivatives)
#  Usage:  bash install-linux.sh
#  Installs: Node.js 18+ (20 LTS), ffmpeg, npm packages, then starts the bot.
# ═══════════════════════════════════════════════════════════
set -e
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
cd "$(dirname "$0")"

echo "⚡ AWAIS X MD - Linux setup starting..."
if ! command -v apt-get >/dev/null 2>&1; then
  echo "❌ apt-get not found -> this script supports Ubuntu/Debian only -> install Node.js 18+ and ffmpeg with your package manager, then run: npm install && npm start"
  exit 2
fi

$SUDO apt-get update -y
$SUDO apt-get install -y curl ca-certificates gnupg ffmpeg build-essential python3 git unzip tmux

# Node.js 20 LTS (skipped if Node >= 18 is already installed)
if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'parseInt(process.versions.node)')" -lt 18 ]; then
  echo "⬇️  Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
  $SUDO apt-get install -y nodejs
fi
echo "✅ Node: $(node -v)  |  npm: $(npm -v)  |  ffmpeg: $(ffmpeg -version | head -1)"

# npm 12 blocks git dependencies by default (a Baileys dependency needs one) -> allow them for this install
NPM_MAJOR="$(npm -v 2>/dev/null | cut -d. -f1)"
if [ "${NPM_MAJOR:-0}" -ge 11 ] 2>/dev/null; then export NPM_CONFIG_ALLOW_GIT=all; fi

npm install --no-audit --no-fund
mkdir -p sessions temp tmp

echo ""
echo "══════════════════════════════════════════"
echo " ✅ INSTALL COMPLETE"
echo "══════════════════════════════════════════"
echo " 1) Pair once:       bash start.sh   (menu opens: press 3 = Terminal mode, type YOUR number, enter the code; wait for 'Connected', CTRL+C)"
echo " 2) Run 24/7:        bash run247.sh             (background in tmux, auto-restart, keeps the laptop awake)"
echo "    logs: bash run247.sh logs | stop: bash run247.sh stop | VPS alternative: PM2 (install-vps.sh)"
echo " Change settings:    npm run setup"
echo "══════════════════════════════════════════"

if [ -t 0 ] && [ -t 1 ]; then
  echo "🚀 Starting the bot..."
  exec node index.js
else
  echo "ℹ️  No interactive terminal here. Run  npm start  in a normal terminal to open the menu."
fi
