#!/data/data/com.termux/files/usr/bin/bash
# ═══════════════════════════════════════════════════════════
#  AWAIS X MD - One-shot Termux installer (fresh Termux OK)
#  Usage:  bash install-termux.sh
# ═══════════════════════════════════════════════════════════
set -e

echo "⚡ AWAIS X MD - Termux setup starting..."

# 1) Storage permission (tap ALLOW on the popup)
termux-setup-storage || true

# 2) Update & upgrade (non-interactive, keep existing configs)
yes | pkg update -y -o Dpkg::Options::="--force-confold" || true
yes | pkg upgrade -y -o Dpkg::Options::="--force-confold" || true

# 3) All required packages
pkg install -y \
  git nodejs-lts ffmpeg \
  python make clang pkg-config \
  libwebp imagemagick \
  curl wget unzip zip nano \
  tmux termux-api

echo "✅ Node: $(node -v)  |  npm: $(npm -v)  |  ffmpeg: $(ffmpeg -version | head -1)"

# 4) Move into project folder (script lives inside it)
cd "$(dirname "$0")"

# npm 12 blocks git dependencies by default (a Baileys dependency needs one) -> allow them for this install
NPM_MAJOR="$(npm -v 2>/dev/null | cut -d. -f1)"
if [ "${NPM_MAJOR:-0}" -ge 11 ] 2>/dev/null; then export NPM_CONFIG_ALLOW_GIT=all; fi

# 5) Install node modules (fallback skips ffmpeg-static download, which is unsupported on Android)
if ! npm install --no-audit --no-fund; then
  echo "⚠️ Normal install failed, retrying with --ignore-scripts (Android-safe)..."
  npm install --no-audit --no-fund --ignore-scripts
fi

# 6) Create the working folders (.env is created by the launcher menu)
mkdir -p sessions temp tmp

echo ""
echo "══════════════════════════════════════════"
echo " ✅ INSTALL COMPLETE"
echo "══════════════════════════════════════════"
echo " 1) Start the bot:   bash start.sh      (24/7, auto-restart after a crash)"
echo "    or simply:       npm start"
echo "    A launcher menu opens. Choose:"
echo "      2 = Telegram Bot mode (multi-user, needs a bot token)"
echo "      4 = Web Pair mode (a pairing website for many users)"
echo "      3 = Terminal mode (personal, no Telegram needed,"
echo "          the pairing code is shown in this Termux window)"
echo " 2) Open the menu again / change settings:  npm run setup"
echo "    More numbers: menu option 5, or type  add  while the bot runs (or: npm run add)"
echo " 3) TRUE 24/7 (keeps running after you close Termux, restarts after a crash):"
echo "      first pair once:  bash start.sh   -> menu: press 3, type YOUR number, enter the code -> wait for 'Connected', CTRL+C"
echo "      then run:         bash run247.sh            (logs: bash run247.sh logs | stop: bash run247.sh stop)"
echo "      auto-start after phone reboot:  bash run247.sh boot   (needs the Termux:Boot app)"
echo " 4) Avoid sleep: install the Termux:API app + Settings > Apps > Termux > Battery > Unrestricted"
echo "══════════════════════════════════════════"
