# AWAIS X MD — Troubleshooting (errors and fixes)

Read the **last lines of the terminal**. The bot prints the real reason of every problem. Most problems are one of the lines below.

## Install problems

| What you see | Why | Fix |
|---|---|---|
| `npm error code EALLOWGIT` / "Fetching packages of type git have been disabled" | npm 12 blocks git dependencies by default; Baileys needs one | `cd Awais-X-MD && npm install --allow-git=all` (the project already has `.npmrc` with this, use the latest version) |
| `git: command not found` | git is not installed | Termux: `pkg install -y git` / Ubuntu: `sudo apt install git` |
| `node: command not found` or Node older than 18 | Node.js missing/too old | Termux: `pkg install -y nodejs-lts` / others: install Node.js 18 or newer (LTS) |
| `npm install` fails on `ffmpeg-static` (Android) | That package does not support Android | `npm install --ignore-scripts` (the installer already retries this by itself) |
| `ffmpeg` not found, audio/video commands fail | ffmpeg missing | Termux: `pkg install -y ffmpeg` / Ubuntu: `sudo apt install ffmpeg` / Windows: `winget install ffmpeg` |
| `EADDRINUSE` / "Port 3000 is already in use" (Web mode) | Another program or a second copy uses the port | Stop the other copy (`pkill -f node`) or set `WEB_PORT=3001` in `.env` |

## Pairing problems (linking WhatsApp)

| What you see | Why | Fix |
|---|---|---|
| Code does not arrive / "Cannot reach WhatsApp yet: connection dropped (428)" | Internet, VPN or data-saver problem, or WhatsApp refuses the connection | Check internet (open a website), switch VPN off, wait. If it repeats for many tries, **stop for a few hours** (every new try can extend a WhatsApp block) |
| "Couldn't link device" / code rejected on the phone | Wrong or expired code, or WhatsApp temporarily limits linking for this number (often after reinstalling WhatsApp or many tries) | Use the newest code within ~2 minutes. Do not request codes repeatedly. Test with another number or with web.whatsapp.com "Link with phone number": if that fails too, it is a WhatsApp limit — wait 3-24 hours |
| Phone says "Logging in..." after the code, but the bot never says "Pairing accepted" and a new code appears | WhatsApp rejects the login of the old client version, or the connection drops at that moment (some accounts only) | The bot switches to the current WhatsApp Web version by itself after 2 codes. You can force it: add `WA_VERSION_SOURCE=web` to `.env`. Use stable Wi-Fi (no VPN), update WhatsApp / WhatsApp Business on the phone, remove old Linked Devices, then try ONCE |
| One number links but another never does (even though it links fine with some other bot) | An old version of the WhatsApp library (Baileys 6.7.18 or older): WhatsApp rejects it for some accounts and it has a known security flaw | Since v2.1 the bot updates it by itself at start (internet needed, `package.json` allows `~6.7.18` = newest 6.7.x). Manual: `cd Awais-X-MD && npm install @whiskeysockets/baileys@6.7.24`. Check: `npm ls @whiskeysockets/baileys` must show 6.7.22 or higher |
| Number is rejected as invalid | Country code missing | Use the full number with country code: `923001234567`. `03001234567` is also accepted for Pakistan. A number cannot start with 0 |
| Connection restarts once right after entering the code | Normal (WhatsApp restarts the link, code 515) | Wait 10-15 seconds until "Connected" |
| "LOGGED OUT" / `401` | The linked device was removed in WhatsApp > Linked Devices, or WhatsApp was reinstalled | Delete the old session (`rm -rf sessions`) and pair again |
| `440` / "connection replaced" | The same number is running somewhere else (second Termux session, PC, tmux, PM2) | Run only ONE copy: `pkill -f node`, `tmux kill-server`, then start again |
| "SESSION EXISTS" (Telegram) | An old session for this Telegram user is still stored | Send `/logout`, then `/pair` again |
| "Too many attempts" (Web mode) | Anti-spam limit (default 8 per IP and 6 per number per hour) | Wait; the owner can change `WEB_MAX_PER_IP_HOUR` / `WEB_MAX_PER_NUMBER_HOUR` in `.env` |
| "Server is full" (Web/Telegram) | `MAX_WEB_SESSIONS` / `MAX_TELEGRAM_USERS` reached (default 30) | Raise the limit in `.env` if the device has enough RAM (each number uses about 70-100 MB) |

## Telegram mode problems

| What you see | Why | Fix |
|---|---|---|
| Console: "bot token is INVALID ... (401)" | Wrong or revoked token | Create a new token with @BotFather (`/revoke`), run `npm run setup` |
| Console: "another copy of this bot is running ... (409)" | Two copies use the same token | Stop the other copy: `pkill -f node`, `tmux kill-server` |
| Bot does not answer | You wrote in a group, or never pressed Start | Open the bot in a **private chat** and send `/start` |
| Owner commands say "Only the bot owner" | `TELEGRAM_OWNER_CHAT_ID` is not your user id | Send `/myid` to the bot (or @userinfobot) and set that number with `npm run setup` |
| Owner gets no "online" message | The owner never pressed Start on the bot | Open the bot once and press Start |
| Users are offline after a restart | Sessions reconnect one by one (about 1.5 s per user) | Wait a minute, check `/stats` (owner) |

## Bot behaviour

| What you see | Why | Fix |
|---|---|---|
| Bot does not answer "hi" | Commands need the `.` prefix | Send `.menu`, `.ping` |
| "Only the owner of this bot can use this command" | Settings commands work only from the owner's own WhatsApp account | Send the command from the phone that owns the linked number |
| Anti-link / anti-gali does nothing | They are OFF by default and the bot must be group admin | Owner: `.antilink on`, and make the bot number a group admin |
| AI commands say the key is missing | No Gemini key | Add `GEMINI_API_KEY` with `npm run setup` (free key from Google AI Studio) |
| Bot stops when the Termux screen is off | Android battery saver kills Termux | Settings > Apps > Termux > Battery > Unrestricted, and use `bash run247.sh` (tmux + wake-lock) |
| Phone notifications stopped while the bot runs | (fixed in v2.1: the bot no longer marks itself online) | Update to the latest version |

## Useful commands

```bash
bash start.sh              # menu: 1 start, 2 Telegram, 3 Terminal, 4 Web Pair, 5 numbers, 6 settings, 7 system check
bash run247.sh             # run in the background (Termux/Linux)
bash run247.sh status      # running or not
bash run247.sh logs        # live screen (leave: CTRL+B then D)
bash run247.sh stop        # stop
npm run setup              # change token / owner / Gemini key
rm -rf sessions            # forget all WhatsApp logins (pair again afterwards)
```
