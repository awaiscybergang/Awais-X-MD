#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  AWAIS X MD - 24/7 background runner (Termux / Linux / macOS)
#  The bot runs inside a tmux session, so it keeps running when you close the
#  Termux window / SSH, and start.sh restarts it by itself if it ever crashes.
#
#  bash run247.sh            start (or re-attach if already running)
#  bash run247.sh logs       show the live screen (detach again: CTRL+B then D)
#  bash run247.sh stop       stop the bot completely
#  bash run247.sh status     is it running?
#  bash run247.sh boot       Termux only: auto-start after phone reboot (needs the Termux:Boot app)
#
#  FIRST TIME: pair your number once with  bash start.sh  (menu: press 3, type your number, code shows on screen),
#  wait for "Connected ✅", press CTRL+C, then use this script.
#  Works on: Termux, Ubuntu/Debian, other Linux, macOS, Windows WSL. (Windows CMD: use start.bat)
# ═══════════════════════════════════════════════════════════
cd "$(dirname "$0")" || exit 2
DIR="$(pwd)"
S=awais

need() { command -v "$1" >/dev/null 2>&1; }
if ! need tmux; then
  echo "❌ tmux is not installed -> it keeps the bot alive in the background -> install it: Termux: pkg install tmux | Ubuntu: sudo apt install tmux"
  exit 2
fi

# Mode: Terminal (default) or Telegram (if saved in .env)
MODE_FLAG="--terminal"
grep -qi '^BOT_MODE=telegram' .env 2>/dev/null && MODE_FLAG="--telegram"
grep -qi '^BOT_MODE=web' .env 2>/dev/null && MODE_FLAG="--web"

# Keep a laptop awake while the bot runs (macOS: caffeinate | Linux with systemd: systemd-inhibit). No-op on Termux/VPS.
KEEP=""
if command -v caffeinate >/dev/null 2>&1; then KEEP="caffeinate -i"
elif command -v systemd-inhibit >/dev/null 2>&1 && systemd-inhibit --what=sleep:idle --why="AWAIS X MD" true >/dev/null 2>&1; then
  KEEP="systemd-inhibit --what=sleep:idle --why=AWAIS-X-MD"
fi

case "${1:-start}" in
  start)
    if tmux has-session -t "$S" 2>/dev/null; then
      echo "ℹ️ Already running in tmux. Showing it now (detach: CTRL+B then D)..."; sleep 1
      exec tmux attach -t "$S"
    fi
    if [ "$MODE_FLAG" = "--telegram" ]; then
      TOK="$(grep -i '^TELEGRAM_BOT_TOKEN=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'"'"' ')"
      OWN="$(grep -i '^TELEGRAM_OWNER_CHAT_ID=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"'"'"' ')"
      if ! echo "$TOK" | grep -Eq '^[0-9]{6,}:[A-Za-z0-9_-]{30,}$' || ! echo "$OWN" | grep -Eq '^[0-9]{5,15}$'; then
        echo "❌ Telegram mode is selected but TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_CHAT_ID is missing in .env -> the background bot cannot ask for them -> run once in the foreground:"
        echo "   bash start.sh      (menu: press 2 = Telegram mode, paste the bot token + your Telegram ID, answer 'Start now' = y, check that it works, then CTRL+C)"
        echo "   then run again:  bash run247.sh"
        exit 2
      fi
    fi
    if [ "$MODE_FLAG" = "--terminal" ] && ! ls sessions/terminal-*/creds.json >/dev/null 2>&1; then
      echo "❌ No linked WhatsApp number yet -> the background bot cannot ask for your number -> pair once first:"
      echo "   bash start.sh      (menu: press 3 = Terminal mode, type your number, enter the code in WhatsApp, wait for 'Connected', then CTRL+C)"
      echo "   then run again:  bash run247.sh"
      exit 2
    fi
    # keep bot.log small (a phone's storage is limited): above 5 MB the old log is moved to bot.log.old
    if [ -f bot.log ] && [ "$(wc -c < bot.log 2>/dev/null || echo 0)" -gt 5242880 ]; then mv -f bot.log bot.log.old; fi
    need termux-wake-lock && termux-wake-lock
    tmux new-session -d -s "$S" -c "$DIR" "$KEEP bash start.sh $MODE_FLAG 2>&1 | tee -a bot.log"
    echo "✅ Bot started in the background (tmux session: $S)."
    echo "   Live screen:  bash run247.sh logs      Stop:  bash run247.sh stop"
    ;;
  logs|attach) exec tmux attach -t "$S" ;;
  stop)
    tmux kill-session -t "$S" 2>/dev/null && echo "🛑 Bot stopped." || echo "ℹ️ It was not running."
    need termux-wake-unlock && termux-wake-unlock
    ;;
  status)
    if tmux has-session -t "$S" 2>/dev/null; then echo "🟢 Running (tmux: $S)"; tail -n 5 bot.log 2>/dev/null; else echo "🔴 Not running"; fi
    ;;
  boot)
    B="$HOME/.termux/boot"
    if [ ! -d "$HOME/.termux" ] && [ -z "$TERMUX_VERSION" ]; then echo "❌ 'boot' is for Termux only."; exit 2; fi
    mkdir -p "$B"
    printf '#!/data/data/com.termux/files/usr/bin/sh\ntermux-wake-lock\nsleep 20\nbash "%s/run247.sh" start >/dev/null 2>&1 &\n' "$DIR" > "$B/awais.sh"
    chmod +x "$B/awais.sh"
    echo "✅ Boot script created: $B/awais.sh"
    echo "   Install the 'Termux:Boot' app (F-Droid), open it ONCE, and the bot will start after every reboot."
    ;;
  *) echo "Use: bash run247.sh [start|logs|stop|status|boot]"; exit 2 ;;
esac
