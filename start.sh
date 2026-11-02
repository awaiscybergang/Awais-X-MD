#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  AWAIS X MD - 24/7 launcher (Termux / Linux / macOS)
#  If the bot crashes it restarts itself after 5 seconds. Stop with CTRL+C.
#  The menu is shown only on the FIRST start; automatic restarts use the
#  saved settings (AWAIS_RESTART=1) and never open the menu again.
#  Usage:  bash start.sh            (menu, then runs 24/7)
#          bash start.sh --terminal | --telegram   (skip the menu)
# ═══════════════════════════════════════════════════════════
cd "$(dirname "$0")" || { echo "❌ Cannot enter the project folder -> wrong path -> run: bash /full/path/to/Awais-X-MD/start.sh"; exit 2; }

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed -> the bot needs Node.js 18+ -> install it (Termux: pkg install nodejs-lts | Ubuntu: see install-linux.sh | macOS: brew install node)"
  exit 2
fi

command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock
trap 'command -v termux-wake-unlock >/dev/null 2>&1 && termux-wake-unlock; echo; echo "👋 Stopped."; exit 0' INT TERM

unset AWAIS_RESTART
first=1
fast=0
while true; do
  started=$(date +%s)
  if [ "$first" -eq 1 ]; then
    node index.js "$@"
  else
    AWAIS_RESTART=1 node index.js "$@"
  fi
  code=$?
  first=0
  # 0 = normal exit, 2 = config error, 130 = CTRL+C  -> do not loop
  if [ $code -eq 0 ] || [ $code -eq 2 ] || [ $code -eq 130 ]; then break; fi
  # crash loop protection: if it dies within 20s many times in a row, wait longer (saves battery + avoids WhatsApp rate limits)
  now=$(date +%s)
  if [ $((now - ${started:-0})) -lt 20 ]; then fast=$((fast + 1)); else fast=0; fi
  wait=5; [ $fast -ge 3 ] && wait=60
  echo "⚠️ The bot stopped (exit code $code). Restarting in ${wait} seconds... (CTRL+C to stop)"
  sleep $wait
done
command -v termux-wake-unlock >/dev/null 2>&1 && termux-wake-unlock
exit $code
