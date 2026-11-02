#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  AWAIS X MD - macOS installer (Homebrew)
#  Usage:  bash install-macos.sh
#  Installs: Node.js 18+, ffmpeg, npm packages, then starts the bot.
# ═══════════════════════════════════════════════════════════
set -e
cd "$(dirname "$0")"

echo "⚡ AWAIS X MD - macOS setup starting..."
if ! command -v brew >/dev/null 2>&1; then
  echo "❌ Homebrew is not installed -> this script uses Homebrew to install Node.js and ffmpeg -> install it from https://brew.sh (one command), open a NEW Terminal, then run this script again."
  exit 2
fi

if ! command -v node >/dev/null 2>&1 || [ "$(node -p 'parseInt(process.versions.node)')" -lt 18 ]; then
  echo "⬇️  Installing Node.js..."
  brew install node
fi
command -v ffmpeg >/dev/null 2>&1 || { echo "⬇️  Installing ffmpeg..."; brew install ffmpeg; }
command -v tmux >/dev/null 2>&1 || { echo "⬇️  Installing tmux..."; brew install tmux; }
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
echo " 2) Run 24/7:        bash run247.sh             (background in tmux, auto-restart, Mac stays awake via caffeinate)"
echo "    logs: bash run247.sh logs | stop: bash run247.sh stop"
echo " Change settings:    npm run setup"
echo "══════════════════════════════════════════"

if [ -t 0 ] && [ -t 1 ]; then
  echo "🚀 Starting the bot..."
  exec node index.js
else
  echo "ℹ️  No interactive terminal here. Run  npm start  in a normal terminal to open the menu."
fi
