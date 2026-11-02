<div align="center">

<img src="assets/hero-banner.svg" alt="AWAIS X MD — Multi-Device WhatsApp Bot 2026" width="100%"/>

<br/>

<img src="https://img.shields.io/github/stars/awaiscybergang/Awais-X-MD?style=for-the-badge&logo=github&color=00e5ff&logoColor=white&labelColor=0a1224" alt="Stars"/>
<img src="https://img.shields.io/github/forks/awaiscybergang/Awais-X-MD?style=for-the-badge&logo=github&color=7b61ff&logoColor=white&labelColor=0a1224" alt="Forks"/>
<img src="https://img.shields.io/badge/License-MIT-c9a227?style=for-the-badge&labelColor=0a1224" alt="MIT License"/>
<img src="https://img.shields.io/badge/Node.js-18%2B-00e5ff?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0a1224" alt="Node.js 18+"/>
<img src="https://img.shields.io/badge/Baileys-6.7.18-7b61ff?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=0a1224" alt="Baileys"/>
<img src="https://img.shields.io/badge/Commands-167-00b4ff?style=for-the-badge&labelColor=0a1224" alt="167 Commands"/>

<h1>AWAIS X MD — Multi-Device WhatsApp Bot (Node.js + Baileys)</h1>

**The Multi-Device WhatsApp Bot 2026 — 167 commands · Gemini AI · YouTube downloader · Islamic toolkit · Group management · Telegram pairing**

Built by **AWAIS DEV** · Powered by **X HACKER TEAM**

📚 **Docs:** [All 167 commands](COMMANDS.md) · [Troubleshooting (errors & fixes)](TROUBLESHOOTING.md) · [Changelog](CHANGELOG.md) · [llms-full.txt (complete guide for AI assistants)](llms-full.txt)

<br/>

<a href="https://github.com/awaiscybergang/Awais-X-MD/archive/refs/heads/main.zip"><img src="https://img.shields.io/badge/⬇_DOWNLOAD_ZIP-0a1224?style=for-the-badge&logo=github&logoColor=00b4ff" alt="Download"/></a>
<a href="https://github.com/awaiscybergang/Awais-X-MD/fork"><img src="https://img.shields.io/badge/🍴_FORK-0a1224?style=for-the-badge&logo=github&logoColor=7b61ff" alt="Fork"/></a>
<a href="https://t.me/awavpshosting"><img src="https://img.shields.io/badge/🖥_FREE_VPS_(TELEGRAM)-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Free VPS on Telegram"/></a>

<a href="https://www.youtube.com/@coreacademi"><img src="https://img.shields.io/badge/📺_YOUTUBE-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube"/></a>
<a href="https://whatsapp.com/channel/0029VbBzlMlIt5rzSeMBE922"><img src="https://img.shields.io/badge/📢_WHATSAPP_CHANNEL-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="WhatsApp Channel"/></a>
<a href="https://wa.me/923295533214"><img src="https://img.shields.io/badge/👑_CONTACT_OWNER-0a1224?style=for-the-badge&logo=whatsapp&logoColor=00e5ff" alt="Contact Owner"/></a>
<a href="https://t.me/awaishacker1"><img src="https://img.shields.io/badge/✈_TELEGRAM_SUPPORT-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram Support"/></a>

</div>

---

**AWAIS X MD** is a free, open-source, multi-device WhatsApp bot written in Node.js on top of the Baileys 6.7.18 library. It ships **167 commands in 12 categories**, including Gemini AI chat and `.imagine`, downloaders for YouTube, TikTok, Instagram, Facebook, Twitter/X and MediaFire, Quran, Hadith, Dua and prayer times, anti-delete / anti-edit / anti-link protection, group management, stickers and view-once unlock.

You can run it in **three modes**: **Telegram Bot mode** (multi-user, pairing with `/pair`), **Web Pair mode** (a pairing website for many users) or **Terminal mode** (no Telegram bot needed, the pairing code is shown right in Termux or your terminal, and you can link several of your own numbers on one device — 5 by default). Install it on Android with **Termux** (`install-termux.sh`), on an **Ubuntu/Debian VPS** (`install-vps.sh` + PM2) or on **Windows, Linux and macOS** with Node.js 18+.

Created by **AWAIS DEV** and **X HACKER TEAM**, MIT licensed. This is an **unofficial** project — WhatsApp Terms of Service risk applies, so use a secondary number.

---

## 📑 Table of Contents

[What is AWAIS X MD?](#-what-is-awais-x-md-multi-device-whatsapp-bot) · [Why AWAIS X MD](#-why-awais-x-md) · [Features](#-features-of-the-whatsapp-bot) · [Menu Preview](#-menu-preview) · [All Commands](#-all-167-commands) · [Modes](#-whatsapp-bot-without-telegram-bot--modes-explained) · [Quick Start](#-quick-start) · [Launcher Menu](#-launcher-menu) · [Requirements](#-requirements) · [Install on Termux](#-how-to-run-a-whatsapp-bot-on-termux-android) · [Install on VPS](#-install-on-a-vps-ubuntu--debian-with-pm2) · [Free VPS](#-free-vps-hosting-telegram) · [Install on PC](#-install-on-windows--linux--macos) · [Configuration](#-configuration-env) · [Pair WhatsApp](#-how-to-pair-whatsapp-telegram-method) · [Troubleshooting](#-troubleshooting) · [FAQ](#-faq) · [Structure](#-project-structure) · [Security](#-security--disclaimer) · [Credits](#-credits)

---

## 🚀 Quick Start

`node index.js` (or `npm start`, or `bash start.sh`) is the single entry point. It checks Node.js 18+, **installs missing packages automatically**, shows the banner and opens the [launcher menu](#-launcher-menu). Pick **one** block below.

### 📱 Termux (Android)

```bash
pkg update -y && pkg install -y git
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
bash install-termux.sh
bash start.sh                # pair ONCE: the menu opens → press 3 (Terminal mode) → type YOUR number → type the code in WhatsApp → wait for "Connected" → CTRL+C
bash run247.sh               # then run it 24/7 in the background
```

### 🪟 Windows (CMD / PowerShell)

```bat
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
install-windows.bat          # installs Node.js + FFmpeg (winget), npm packages, then starts the bot
start.bat                    # next times: 24/7 launcher (restarts after a crash). First start: menu → pair your number
```

*(No git? Download the ZIP, extract it, open the folder in CMD and run `install-windows.bat`. It uses `winget` for Node.js LTS and FFmpeg when available, otherwise it prints the manual download links. After winget installs Node.js, close the window, open a NEW CMD and run `install-windows.bat` again.)*

### 🍎 macOS (Terminal)

```bash
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
bash install-macos.sh
bash start.sh                # pair ONCE: menu → 3 (Terminal mode) → your number → code shows on screen → wait for "Connected" → CTRL+C
bash run247.sh               # then 24/7 in the background (the Mac stays awake via caffeinate)
```

*(Needs [Homebrew](https://brew.sh).)*

### 🐧 Linux (Ubuntu / Debian)

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
bash install-linux.sh
bash start.sh                # pair ONCE: menu → 3 (Terminal mode) → your number → code shows on screen → wait for "Connected" → CTRL+C
bash run247.sh               # then 24/7 in the background (tmux, auto-restart)
```

### 🧑‍💻 VS Code

1. Install [Node.js 18+](https://nodejs.org) and open the project folder (**File → Open Folder**).
2. Open the integrated terminal (**Terminal → New Terminal**) and run:

```bash
npm install
npm start
```

### 🖥 VPS + PM2

```bash
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
bash install-vps.sh
npm start                          # first setup in the menu (choose 2 or 3) and pair your number; when it says Connected → CTRL+C
pm2 start ecosystem.config.js      # PM2 has no TTY: no menu, it uses the saved .env + saved sessions
pm2 save && pm2 startup
```

---

## 🎛 Launcher Menu

When you start the bot in an interactive terminal, a big banner is shown (it switches to a compact one on narrow phone screens) followed by this menu. Everything you choose is saved to `.env` automatically, and secrets are always masked (for example `1234****abcd`).

```text
 MAIN MENU
  Mode: terminal  |  Numbers: 1/5
  Token: not set  |  Owner ID: not set  |  Gemini: set

  1) Start the bot
  2) Telegram Bot mode (multi-user)
  3) Terminal mode (personal)
  4) Web Pair mode (website for multiple users)
  5) Manage numbers (Terminal mode)
  6) Settings (Gemini, owner, Telegram ID, model)
  7) System check (doctor)
  8) Exit

Choose an option (1-8):
```

| Option | What it does |
|---|---|
| **1) Start the bot** | Starts with the saved settings (hint shown if nothing is configured yet). |
| **2) Telegram Bot mode** | Set/change the Telegram bot token (checked with Telegram, shows the bot username, how-to for @BotFather) and your **Owner Chat ID** (both required), optional owner WhatsApp number. |
| **3) Terminal mode** | Enter your WhatsApp number; the pairing code is shown in this terminal. |
| **4) Web Pair mode** | Starts a pairing website (default port 3000); many users enter their number in the browser and get a code. |
| **5) Manage numbers** | Add / list / remove numbers (removing deletes the session folder after a Y/N confirmation) and change `MAX_NUMBERS` (1-10, RAM warning above 3). |
| **6) Settings** | Gemini API key (hidden input, set/change/remove), owner WhatsApp number, Telegram Owner Chat ID, optional `GEMINI_MODEL`. |
| **7) System check** | Node version, packages, ffmpeg, Termux wake-lock, mode, numbers, Telegram token + owner ID and Gemini key status (masked). |
| **8) Exit** | Exits with code 0. |

Good to know:

- Flags such as `--terminal` / `--telegram` / `--web` skip the menu. `npm run setup` (or `--menu`) opens the menu directly.
- Under **PM2, cron or Docker (no TTY)** there is never a menu or a prompt: the saved `.env` is used, and a clear error with exit code 2 is printed if the config is missing.
- After a crash, `bash start.sh` restarts the bot **without** showing the menu again.
- Every error is printed as *what failed → likely cause → how to fix*. Set `DEBUG=1` to also see stack traces. `NO_COLOR=1` turns colors off.
- The branding block (bot name, owner, Telegram, team) is locked in `lib/brand.js` and cannot be changed from `.env`, flags or the menu.

---

## 🧠 What is AWAIS X MD? (Multi-Device WhatsApp Bot)

**AWAIS X MD** (also written *Awais MD*, *Awais X MD Bot*, *Awais-X-MD WhatsApp bot 2026*) is an open-source **multi-device WhatsApp bot** written in **Node.js** on top of the **Baileys** library (`@whiskeysockets/baileys`). It runs 24/7 on a **VPS**, on **Android via Termux**, or on a PC, and links to your WhatsApp account as a *Linked Device* — no phone needs to stay online.

What makes it different from other WhatsApp MD bots:

- **Two modes — you choose on first run:** 🤖 **Telegram Bot mode** (multi-user panel) or 📟 **Terminal mode** (personal use, **no Telegram bot needed**, pairing code appears right in Termux/terminal, **pair several numbers on one device**, bot keeps running 24/7).
- **Pairing through Telegram** (Telegram mode) — you control the bot from a Telegram panel (`/start`, `/pair`, `/status`, `/logout`, `/setimage`, `/stats`, `/myid`). No QR scanning, no session-ID copy-paste: you send your number and receive an 8-character **pairing code**.
- **167 commands** in 12 categories (YouTube, downloaders, student tools, developer tools, Islamic, group admin, anti-features, fun, AI).
- **Gemini AI** chat (`.ai`, `.gpt`, `.gemini`, `.ask`) and AI image generation (`.imagine`).
- **Auto features ON by default** — auto status seen, auto status react, auto-react, auto-typing.
- **Anti-delete / anti-edit** — recovers deleted text/media and shows message edits.
- **Per-user sessions** — every Telegram chat gets its own isolated WhatsApp session.
- **Beginner-friendly** — one-command installers for Termux and VPS included.

> **Language:** replies and docs mix English, Urdu and Hindi (Hinglish) so Pakistani and Indian users feel at home.

---

## 🌟 Why AWAIS X MD

Only things that are actually in this repository:

- **Two modes, your choice on first run** — Telegram Bot mode for a multi-user panel, or Terminal mode for personal use with **no Telegram bot token**.
- **Several numbers on one device** — in Terminal mode, `add`, `list`, `remove` and `help` manage up to 5 numbers by default (`MAX_NUMBERS`).
- **Pairing code instead of QR** — the code appears in Telegram (`/pair`) or directly in Termux/terminal.
- **One-command installers** — `install-termux.sh` for Android and `install-vps.sh` (with PM2) for Ubuntu/Debian; manual steps for Windows, Linux and macOS.
- **Built for 24/7 running** — auto-reconnect, Termux wake-lock, `run247.sh` (background, tmux) / `start.sh` / `start.bat` restart the bot after a crash, PM2 on servers.
- **167 commands in 12 categories** — AI, YouTube, downloaders, Student Lab, Developer Tools, Islamic tools, group management, anti-features, fun, DP lab and more.
- **Useful for Pakistan and India** — Quran, Hadith, Dua, prayer times and Hijri date, with docs in English and Roman Urdu/Hinglish.
- **Open source** — MIT licensed; you can read, fork and change the code.

> **Honest limits:** it is an unofficial bot built on Baileys, some commands depend on third-party download/AI APIs that can change or stop working, and WhatsApp may restrict accounts that use automation. Use a secondary number.

---

## ✨ Features of the WhatsApp Bot

<div align="center">

| <img src="assets/feature-ai.svg" width="64"/> | <img src="assets/feature-media.svg" width="64"/> | <img src="assets/feature-security.svg" width="64"/> |
|:---:|:---:|:---:|
| **AI & Intelligence** | **Media Engine** | **Security & Moderation** |
| Gemini chat · AI image (`.imagine`) · Identity: *Awais AI* | YouTube audio/video · TikTok · Instagram · Facebook · Twitter · MediaFire · Stickers | Anti-delete · Anti-edit · Anti-link · Anti-gali · Anti-emoji · Warn system |

</div>

| Area | What you get |
|---|---|
| 🤖 **AI** | Google Gemini chat with automatic model fallback, AI image generation, bot identity "Awais AI" |
| ▶️ **YouTube** | `.play` `.song` `.video` by name, `.ytmp3` / `.ytmp4` by link, multiple fallback download APIs, duration limits, concurrency limit |
| ⬇️ **Downloaders** | Instagram, TikTok, Facebook, Twitter/X, MediaFire, web page extraction |
| 🎓 **Student Lab** | PDF lock/unlock/merge, ZIP lock/unlock, text⇄file, translate, dictionary, Wikipedia, calculator |
| 💻 **Dev Tools** | Website screenshot, WHOIS, IP lookup, base64, hash, UUID, password generator, QR, short links, GitHub profile |
| 🕌 **Islamic** | Full Quran by surah/ayah, audio recitation, popular surahs (Yasin, Mulk, Rahman, Kahf, Waqiah…), Hadith, Dua, Tasbeeh, prayer times, Hijri date |
| 👥 **Groups** | tagall, hidetag, kick, promote/demote, warn/unwarn, mute/lock, welcome/goodbye with custom text, polls, announcements |
| 🛡️ **Anti** | antidelete, antiedit, antigali, antilink, antiemoji |
| ⚡ **Auto** | autoreacts, autotyping, autorecording, statusseen, statusreact |
| 🎮 **Fun & DP** | memes, facts, roast, ship, love meter, truth/dare, boy/girl/couple/anime DP, wallpapers, cats, dogs |
| 🔓 **View-once** | `.vv` / `.vv2` unlock view-once media |
| 🖼️ **Stickers** | `.sticker` `.steal` `.toimg` `.tovideo` `.tomp3` |

---

## 🖼 Menu Preview

<div align="center">

<img src="assets/menu.jpg" alt="AWAIS X MD WhatsApp bot menu banner" width="560"/>

*Send `.menu` on WhatsApp — the bot replies with this banner and the full command list.*

</div>

---

## 📖 All 167 Commands

Default prefix: **`.`** (dot). Example: `.menu`, `.play Tum Hi Ho`, `.ai Who are you?`

| Category | Count | Commands |
|---|:---:|---|
| 🏠 **General** | 14 | `.menu` `.help` `.info` `.about` `.rules` `.joke` `.quote` `.time` `.date` `.setimage` `.setbanner` `.owner` `.script` `.support` |
| ▶️ **Youtube** | 6 | `.play` `.song` `.video` `.ytv` `.ytmp3` `.ytmp4` |
| ⬇️ **Download** | 7 | `.insta` `.ig` `.extractweb` `.tiktok` `.facebook` `.twitter` `.mediafire` |
| 🎓 **Student Lab** | 14 | `.pdfunlock` `.pdflock` `.zipunlock` `.ziplock` `.txttofile` `.filetotxt` `.pdfmerge` `.img2pdf` `.pdf2img` `.compress` `.calc` `.translate` `.dictionary` `.wiki` |
| 💻 **Developer Tools** | 14 | `.extractweb` `.webss` `.whois` `.ip` `.ping` `.runtime` `.base64` `.decode64` `.hash` `.uuid` `.password` `.qr` `.shortlink` `.github` |
| 🕌 **Islamic** | 19 | `.quran` `.surah` `.ayat` `.surahlist` `.yasin` `.mulk` `.rahman` `.kahf` `.waqiah` `.ikhlas` `.fatiha` `.nas` `.falaq` `.quranaudio` `.hadith` `.dua` `.tasbeeh` `.prayertime` `.hijri` |
| ⚡ **Awais Tools** | 36 | `.autoreacts` `.autotyping` `.autorecording` `.statusseen` `.statusreact` `.getdp` `.jid` `.vv` `.vv2` `.💓` `.💗` `.💖` `.💘` `.💝` `.💞` `.💟` `.❤️` `.🧡` `.💛` `.💚` `.💙` `.💜` `.🖤` `.🤍` `.🤎` `.💔` `.❣️` `.💕` `.😻` `.😘` `.🫀` `.toimg` `.tovideo` `.tomp3` `.sticker` `.steal` |
| 🛡️ **Anti Features** | 5 | `.antidelete` `.antiedit` `.antigali` `.antilink` `.antiemoji` |
| 👥 **Group** | 23 | `.tagall` `.hidetag` `.kick` `.promote` `.demote` `.warn` `.unwarn` `.mute` `.unmute` `.lock` `.unlock` `.groupinfo` `.link` `.revoke` `.setname` `.setdesc` `.listadmin` `.welcome` `.goodbye` `.setwelcome` `.setgoodbye` `.poll` `.announce` |
| 🎮 **Fun** | 13 | `.meme` `.fact` `.advice` `.pickup` `.roast` `.compliment` `.flip` `.roll` `.ship` `.lovemeter` `.truth` `.dare` `.emojimix` |
| 🖼️ **Dpz Lab** | 8 | `.boydp` `.girldp` `.coupledp` `.animedp` `.randomdp` `.wallpaper` `.cat` `.dog` |
| 🤖 **Ai & More** | 9 | `.gpt` `.ai` `.gemini` `.ask` `.imagine` `.weather` `.news` `.crypto` `.currency` |

**Quick examples**

```text
.menu                         → full menu with banner
.play Tum Hi Ho               → search & send song
.ytmp4 https://youtu.be/xxxx  → download YouTube video by link
.ai Explain gravity           → Gemini AI answer
.imagine cat in space         → AI image
.tiktok https://tiktok.com/…  → TikTok downloader
.quran / .surah 36            → Quran
.autoreacts off               → toggle auto features
.antidelete on                → recover deleted messages
```

---

## 🎛 WhatsApp Bot Without Telegram Bot — Modes Explained

`npm start` opens the [launcher menu](#-launcher-menu), where you pick the mode:

```text
2) Telegram Bot mode (multi-user)
   Your own Telegram bot; many people link their WhatsApp with /pair. (Needs a bot token)

3) Terminal mode (personal)
   No Telegram bot needed. The pairing code is shown right in Termux/terminal, for your own numbers.

4) Web Pair mode (website for multiple users)
   A pairing website; users open the link, type their number and get the code in the browser.
```

| | 🤖 Telegram Bot mode | 📟 Terminal mode |
|---|---|---|
| Users / numbers | Many users (each Telegram chat = own WhatsApp session) | **Multiple numbers of your own** on one device (default max 5) |
| Telegram bot token | Required | **Not needed** |
| Pairing | `/pair 92xxxxxxxxx` in Telegram → code | Enter your number in terminal → **code is printed in terminal** |
| Best for | Hosting a public bot on VPS | Personal bot on your phone (Termux) |
| Start | `npm run telegram` | `npm run terminal` |

Your choice is saved in `.env` (`BOT_MODE=`). Change it any time with `npm run setup`.

### 📟 Terminal mode — how it works (multi-number)

1. `npm run terminal` (or choose option **3** in the menu).
2. Type your WhatsApp number with country code, no `+` (Pakistan `92…`, India `91…`).
3. A **pairing code** box appears in the terminal, e.g. `ABCD-1234`.
4. WhatsApp → **Settings → Linked Devices → Link a Device → Link with phone number instead** → enter the code.
5. Right after you enter the code the terminal prints *Pairing accepted… WhatsApp now restarts the connection once* — this restart is **normal**, wait 5–10 seconds.
6. Terminal prints **CONNECTED SUCCESSFULLY**. Send `.menu` on WhatsApp. Next start it reconnects automatically — no new pairing.

**Pairing tips (read this if the code fails)**

- Type the code in WhatsApp **as soon as it appears**, and do **not** type `add` again while waiting — every new code cancels the previous one.
- Only **one** running copy of the bot per number. Two copies kick each other out (log: `440`). Stop the other one: `bash run247.sh stop`, `tmux kill-server` or `pkill -f "node index.js"`.
- Turn off VPN / data-saver while pairing. Wi-Fi and mobile data both work.
- If the code is not entered in ~2 minutes, a fresh one is created automatically (up to 6 codes). After that the bot stops and asks you to wait 10–15 minutes, so WhatsApp does not rate-limit your number.
- Every disconnect prints its reason code (`405`, `408`, `428`, `440`, `403`, `515` …) with a plain explanation — see [Troubleshooting](#-troubleshooting).

**Pair more numbers on the same Termux** (2, 3, 4 … numbers, each with its own session)

While the bot is running, type these commands in the same terminal:

| Command | What it does |
|---|---|
| `add` | Asks for another number → prints its own pairing code → connects it (others keep running) |
| `add 923001234567` | Same, number given directly |
| `list` | Shows all numbers and whether each is connected |
| `remove 923001234567` | Disconnects that number and deletes its session |
| `help` | Shows this list |

- Or start straight into adding: `npm run add`.
- All paired numbers are **saved** (`sessions/terminal-<number>/`) and **reconnect automatically on every start** — no menu, no new codes.
- Each number works independently (own WhatsApp commands, own anti-delete cache, own settings in `sessions/terminal-<number>/settings.json`).
- Limit: **5 numbers** at once by default (`MAX_NUMBERS=` in `.env`). Each number uses roughly 70–100 MB RAM, so on low-RAM phones keep it to 2–3.
- If one number gets logged out from WhatsApp, only that one stops; type `add` to link it again.
- Old single-number sessions from earlier versions are converted automatically.

**Always-on (never sleeps) in Terminal mode**

- **Internet gone? The bot stays on.** A linked number reconnects forever (no try limit), waiting 2–15 s between tries, and continues **by itself** the moment the internet is back (log: *back online … no restart needed*). Same in Telegram mode. Wi-Fi ↔ mobile data switches, router restarts and laptop sleep/wake are handled the same way.
- A linked number only stops when **you** stop it (CTRL+C / `bash run247.sh stop`), when you remove the linked device on your phone (real logout), or when the same number is opened in a second copy of the bot (`440`). A `403` (WhatsApp restriction) is retried slowly every 10 minutes, never by hammering.
- While **pairing**, internet problems are retried without limit (no code was requested, so WhatsApp is not bothered). Only *codes you never entered* are limited: 6 codes (≈12 min), then it stops cleanly and asks you to wait 10–15 minutes.
- A half-finished pairing never damages the session: an unlinked number always starts from a clean folder, and WhatsApp's `401` on it is **not** treated as a logout.
- Keep-alive presence ping every 4 minutes and a `[alive]` status line every 10 minutes.
- Errors never kill the process (`uncaughtException` / `unhandledRejection` are caught).
- On Termux the bot takes a **wake-lock** automatically (needs `pkg install termux-api` + the **Termux:API** app).
- `bash run247.sh` (background, tmux) / `bash start.sh` (foreground) / `start.bat` (Windows) restart the bot automatically if it ever crashes. A crash loop (dies within 20 s, 3× in a row) waits 60 s between tries.
- If the pairing code expires before you enter it, the bot generates a fresh one by itself.

> ⚠️ Android can still kill Termux on some phones (Xiaomi/Oppo/Vivo/Samsung). Set **Settings → Apps → Termux → Battery → Unrestricted** and pin Termux in recent apps. Without this, no bot can stay alive on those phones.

---

## 📋 Requirements

| Component | Needed |
|---|---|
| **Node.js** | 18 or newer (20 LTS recommended) |
| **FFmpeg** | for audio/video conversion (installers add it for you) |
| **Telegram bot token** | free from [@BotFather](https://t.me/BotFather) — required for **Telegram mode only** (not needed in Terminal mode) |
| **Gemini API key** | free from [Google AI Studio](https://aistudio.google.com/apikey) — optional (AI commands) |
| **OS** | Android (Termux) · Ubuntu/Debian VPS · Windows · macOS · Linux |
| **RAM** | 512 MB minimum, 1 GB recommended |

---

## 📱 How to Run a WhatsApp Bot on Termux (Android)

> ⚠️ Install Termux from **[F-Droid](https://f-droid.org/packages/com.termux/)** or **[GitHub Releases](https://github.com/termux/termux-app/releases)** — the Play Store version is outdated and will not work.

### ⚡ Method 1 — Automatic (recommended, for first-time Termux users)

Open Termux and paste these lines one by one:

```bash
pkg update -y && pkg upgrade -y
pkg install -y git
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
bash install-termux.sh
```

Then:

```bash
bash start.sh             # 24/7 launcher (auto-restart + wake-lock)
```

In the launcher menu pick a mode: **2 = Telegram Bot** (asks for your bot token) or **3 = Terminal** (asks for your WhatsApp number and prints the pairing code right there).

> 💡 **No need to edit `.env` by hand.** In Telegram mode, if `.env` is missing (or still the example placeholder), the bot asks for the **Telegram Bot Token + Owner Chat ID** (and optionally Owner WhatsApp number + Gemini key) right in the terminal, validates the token with Telegram, saves `.env` automatically and starts. Next time it just runs.

### 🛠 Method 2 — Manual (every command)

```bash
termux-setup-storage
pkg update -y && pkg upgrade -y
pkg install -y git nodejs-lts ffmpeg python make clang pkg-config libwebp imagemagick curl wget unzip zip nano tmux termux-api
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
npm install
bash start.sh    # first run: choose mode → token (Telegram) or number (Terminal)
# (or manually: cp .env.example .env && nano .env)
```

If `npm install` fails on `ffmpeg-static` (Android is not supported by that package), run:

```bash
npm install --ignore-scripts
```

### 📟 Termux — personal bot without Telegram (short version)

```bash
bash start.sh --terminal    # asks your number → shows pairing code → runs forever
```

### 🔁 Keep it running in the background

```bash
bash start.sh              # only the FIRST time: menu → 3 (Terminal mode) → type your number → enter the code → wait for "Connected" → CTRL+C
bash run247.sh             # start in the background (tmux + auto-restart + wake-lock)
bash run247.sh logs        # look at the live screen (leave it: CTRL+B then D)
bash run247.sh status      # running or not
bash run247.sh stop        # stop the bot
bash run247.sh boot        # start automatically after a phone reboot (needs the Termux:Boot app from F-Droid)
```

Also set **Settings → Apps → Termux → Battery → Unrestricted**, otherwise some phones kill Termux after the screen is off.

Install from a downloaded ZIP instead of `git`:

```bash
cd ~/storage/downloads
unzip Awais-X-MD.zip && cd Awais-X-MD
bash install-termux.sh
```

---

## 🖥 Install on a VPS (Ubuntu / Debian) with PM2

### ⚡ Automatic

```bash
apt update -y && apt install -y git
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
bash install-vps.sh
npm start                       # pair ONCE (menu: 3 = Terminal mode, or 2 = Telegram + token). When "Connected" → CTRL+C
pm2 start ecosystem.config.js   # run 24/7 (PM2 cannot ask questions, so pair first)
pm2 save && pm2 startup         # auto-start after reboot
```

### 🛠 Manual

```bash
sudo apt update -y
sudo apt install -y curl git ffmpeg unzip zip build-essential python3 imagemagick webp
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
git clone https://github.com/awaiscybergang/Awais-X-MD.git && cd Awais-X-MD
npm install
npm start                       # pair ONCE (Terminal mode: your number → code), then CTRL+C   (Telegram mode: cp .env.example .env && nano .env)
pm2 start ecosystem.config.js
```

**Useful PM2 commands**

```bash
pm2 status                 # list
pm2 logs awais-x-md        # live logs
pm2 restart awais-x-md     # restart
pm2 stop awais-x-md        # stop
pm2 delete awais-x-md      # remove
```

---

## 🆓 Free VPS Hosting (Telegram)

Need a server to run **AWAIS X MD 24/7**? Join the VPS hosting community on Telegram:

<div align="center">

<a href="https://t.me/awavpshosting"><img src="https://img.shields.io/badge/👉_JOIN_FREE_VPS_HOSTING_ON_TELEGRAM-26A5E4?style=for-the-badge&logo=telegram&logoColor=white" alt="Free VPS Hosting Telegram"/></a>

**https://t.me/awavpshosting**

</div>

After you get your VPS, follow [Install on a VPS](#-install-on-a-vps-ubuntu--debian-with-pm2) above. Plans and availability are managed by that channel, not by this repository.

---

## 💻 Install on Windows / Linux / macOS

**Easiest:** use the installer for your system (see [Quick Start](#-quick-start)): `install-windows.bat`, `bash install-macos.sh` or `bash install-linux.sh`.

**Manual:**

1. Install [Node.js 18+](https://nodejs.org) and [FFmpeg](https://ffmpeg.org/download.html) (Windows: `winget install Gyan.FFmpeg`; macOS: `brew install ffmpeg`; Linux: `sudo apt install ffmpeg`).
2. Then:

```bash
git clone https://github.com/awaiscybergang/Awais-X-MD.git
cd Awais-X-MD
npm install
npm start                   # menu → option 3 (Terminal mode) → enter your number → code appears → enter it in WhatsApp
```

*(No need to create `.env` by hand — the menu creates it.)*

### 💻 Laptop / PC — run it 24/7

| System | Pair once | Run 24/7 | Stop |
|---|---|---|---|
| **Windows** (CMD / PowerShell) | `start.bat` (menu → 3) | `start.bat` (keep the window open; restarts itself after a crash) | CTRL+C, answer `Y` |
| **macOS** | `bash start.sh` (menu → 3) | `bash run247.sh` (tmux, uses `caffeinate` so the Mac does not sleep) | `bash run247.sh stop` |
| **Linux** | `bash start.sh` (menu → 3) | `bash run247.sh` (tmux, uses `systemd-inhibit` when available) | `bash run247.sh stop` |
| **Windows + WSL** | same as Linux inside WSL | `bash run247.sh` | `bash run247.sh stop` |

Laptop must stay **on and online**: Windows → Settings → System → Power → *Sleep: Never* (plugged in), and *lid close: Do nothing* (Control Panel → Power Options). A 24/7 bot is better on a VPS or an old phone with Termux — a laptop that sleeps or loses Wi-Fi disconnects the bot (it reconnects by itself when it wakes up).

**PM2 on a laptop/server (optional):** `npm i -g pm2`, pair once with `npm run terminal`, then `pm2 start ecosystem.config.js && pm2 save`. (Auto-start after reboot: Linux `pm2 startup`; Windows needs an extra tool such as `pm2-windows-startup`.)

---

## ⚙️ Configuration (.env)

Create `.env` from `.env.example` — **or just run `npm start` in an interactive terminal and the bot will ask for the token and create `.env` for you** (background runners like PM2 cannot ask, so for PM2 fill `.env` first):

| Variable | Required | Description |
|---|:---:|---|
| `BOT_MODE` | ➖ | `telegram`, `terminal` or `web`. Set from the launcher menu; change with `npm run setup`. |
| `MAX_NUMBERS` | ➖ | Terminal mode: max numbers at the same time (default `5`). |
| `WHATSAPP_NUMBER` | ➖ | Terminal mode: your number for the pairing code (saved automatically). |
| `TELEGRAM_BOT_TOKEN` | Telegram mode | Token from [@BotFather](https://t.me/BotFather). Not needed in Terminal mode. |
| `TELEGRAM_OWNER_CHAT_ID` | Telegram mode | Your Telegram user ID (numbers only). Get it from [@userinfobot](https://t.me/userinfobot) or `/myid`. Used for admin commands + notifications. |
| `WEB_PORT` | ➖ | Web Pair mode port (default `3000`). |
| `MAX_TELEGRAM_USERS` | ➖ | Telegram mode: max users linked at the same time (default `30`, each uses ~70-100 MB RAM). |
| `MAX_WEB_SESSIONS` | ➖ | Web Pair mode: max numbers connected at the same time (default `30`). |
| `WEB_MAX_PER_IP_HOUR` / `WEB_MAX_PER_NUMBER_HOUR` | ➖ | Web Pair anti-spam limits per hour (defaults `8` / `6`). |
| `OWNER_NUMBER` | ➖ | Owner WhatsApp number with country code, no `+` (shown in `.owner` / `.info`). |
| `GEMINI_API_KEY` | ➖ | Enables `.ai` `.gpt` `.gemini` `.ask`. Free key: [AI Studio](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | ➖ | Force a specific Gemini model; otherwise built-in fallbacks are tried. |
| `FFMPEG_PATH` | ➖ | Custom ffmpeg binary. System ffmpeg is auto-detected first. |

`config.json` (created automatically on your own device; holds the **shared defaults** and the banner set by Telegram `/setimage`; it is **not** part of the GitHub repo, so everyone keeps their own). Settings changed with WhatsApp commands (`.autoreacts`, `.antilink`, `.setimage` …) are saved **per number** in `sessions/<id>/settings.json`:

```json
{ "BOT_IMG": "", "MENU_SONG": "awais/awais_audio.mp3", "autoreacts": true, "autotyping": true, "autorecording": false }
```

- `BOT_IMG` — shared default menu banner URL (Telegram `/setimage`, owner only). A number can override it with `.setimage URL` on WhatsApp. If both are empty, the bundled `assets/menu.jpg` is used.
- `MENU_SONG` — optional MP3 sent after `.menu`. Put your file at `awais/awais_audio.mp3`; if the file is missing the bot simply skips it.

---

## 🔗 How to Pair WhatsApp (Telegram method)

1. Create a Telegram bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Get your Telegram Chat ID from [@userinfobot](https://t.me/userinfobot) (or later use `/myid` inside the bot).
3. Start AWAIS X MD (`npm start`) → choose **2) Telegram Bot mode** → paste token + Chat ID (menu saves everything).
3. Open your new bot on Telegram and send `/start` — a button panel appears.
4. Send `/pair 92xxxxxxxxx` (your WhatsApp number with country code — India `91…`, Pakistan `92…`; `+92 300 1234567` and `03001234567` also work).
5. The bot replies with a **pairing code**.
6. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead** → enter the code.
7. Telegram shows **CONNECTED SUCCESSFULLY**. Send `.menu` on WhatsApp. 🎉

| Telegram command | Action |
|---|---|
| `/start` | Main control panel |
| `/pair NUMBER` | Connect WhatsApp |
| `/status` | Connection + feature status |
| `/logout` | Disconnect, remove the linked device and delete the session |
| `/setimage URL` | Set the shared menu banner image (**owner only**) |
| `/stats` | Users, online count, memory, uptime (**owner only**) |
| `/help` | Help |
| `/myid` | Show your Telegram Chat ID (open the bot once with `/start`, otherwise it cannot message you) |

---

## 🌐 Web Pair mode (professional website)

Multiple users can pair their WhatsApp numbers from a beautiful browser page — no Telegram needed.

1. Start AWAIS X MD (`npm start`) → choose **4) Web Pair mode**.
2. The website starts on `http://localhost:3000` (change with `WEB_PORT` in `.env`).
3. **For a public link on Termux / VPS** (free subdomain):
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
   or
   ```bash
   npx localtunnel --port 3000
   ```
4. Share the public URL. Anyone opens it, enters their number, gets an 8-character code, and pairs.
5. Sessions stay connected in the background. Use `bash run247.sh` for 24/7.

The website includes the official WhatsApp Channel button and footer:  
**© 2027 Powerful MD Bot Awais x Hacker**

---

## 🧰 npm Scripts

| Command | What it does |
|---|---|
| `npm start` | Banner + launcher menu (auto-installs missing packages first) |
| `npm run terminal` | Personal mode — no Telegram bot, code in terminal |
| `npm run telegram` | Multi-user Telegram bot mode |
| `npm run web` | Web Pair mode — professional pairing website |
| `npm run add` | Terminal mode: start and pair one more number |
| `npm run setup` / `npm run menu` | Open the launcher menu directly |
| `npm run forever` / `bash start.sh` | 24/7 launcher (foreground) with auto-restart + Termux wake-lock |
| `npm run bg` / `bash run247.sh` | 24/7 in the **background** (tmux). Also: `npm run logs`, `npm run stop`, `bash run247.sh status`, `bash run247.sh boot` (Termux) |
| `start.bat` (Windows) | 24/7 launcher for Windows CMD with auto-restart |

---

## 🔧 Troubleshooting

| Problem | Fix |
|---|---|
| Bot asks for token every time | Token was invalid/not saved. Paste a fresh token from @BotFather; check `.env` is writable. |
| `TELEGRAM_BOT_TOKEN missing` under PM2 | PM2 is non-interactive. Run `npm start` once manually (or edit `.env`), then start PM2. |
| `npm install` fails on Termux | `npm install --ignore-scripts` · make sure `pkg install nodejs-lts` was done. |
| Termux stops after screen off | Run `termux-wake-lock`, disable battery optimisation for Termux, use `tmux`. |
| Terminal mode: no code shown | Number must be digits with country code. Check internet, turn off VPN, then `npm run setup` → option 3. The log prints the reason (`428` = connection dropped, `405` = update Baileys). |
| The bot paired a number **by itself** (I did not type it) | An old unfinished pairing was lying in `sessions/`. The new version removes it at start (log: *🧹 Removed an unfinished pairing*). If your folder is old, run once: `rm -rf sessions/terminal-*` (Windows: empty the `sessions` folder). |
| I do not see the menu (1–7 options) | You started with `--terminal` / `--telegram`, which **skips** the menu. Start with plain `bash start.sh` (or `npm start`, `start.bat`) → menu → 3 = Terminal mode, 2 = Telegram mode, 4 = Manage numbers, 5 = Settings, 6 = System check. |
| `WhatsApp keeps dropping the connection right after giving the code` | WhatsApp is rate-limiting pairing codes for this number (too many tries). **Stop trying for 1–2 hours**, switch Wi-Fi ↔ mobile data, turn off VPN, then start once and type the newest code quickly. Every extra try makes the block longer. |
| Code "Logging in…" forever / says wrong code | You entered an old code. Use only the **newest** code, enter it within 2 minutes, and do not type `add` again while waiting. |
| `Pairing did not finish after 6 tries` | 6 pairing codes were shown but none was entered in time (or WhatsApp rate-limits the number). Wait 10–15 min, then `add` (or restart `bash start.sh --terminal`) and type the **newest** code quickly. |
| `Cannot reach WhatsApp yet … trying again` | Normal when the internet is off: the bot keeps trying and continues by itself when the internet is back. Nothing to do. |
| `440` / "open in ANOTHER running copy" | Two copies use the same number. Stop all: `bash run247.sh stop`, `tmux kill-server`, `pkill -f "node index.js"`, then start **one** copy. |
| `405` in the log | WhatsApp rejected the library version. Run `npm i @whiskeysockets/baileys@latest` and start again. |
| `403` in the log | WhatsApp restricted the number for a while. The bot retries slowly every 10 minutes by itself; do **not** restart it again and again. Use a secondary number if it lasts. |
| `515` in the log | Normal: WhatsApp restarts the connection once right after pairing. Nothing to fix. |
| `bash run247.sh` says "No linked WhatsApp number" | Pair once in the foreground first: `bash start.sh` (menu → 3), wait for *Connected*, CTRL+C, then run it again. |
| Windows: `'node' is not recognized` | Open a **new** CMD after installing Node.js (PATH refresh), or run `install-windows.bat` again. |
| Termux dies after some minutes | Install **Termux:API** app + `pkg install termux-api`, Battery → *Unrestricted*, run `bash start.sh`. |
| `add` says limit reached | Raise `MAX_NUMBERS` in `.env` (watch your RAM) or `remove` an unused number. |
| Pairing code error | Number must be digits only with country code; run `/logout` and `/pair` again. |
| Really "LOGGED OUT" | You removed the linked device on the phone (or WhatsApp did). Type `add` in the terminal (or `/pair` in Telegram) to link again. If it keeps happening: `rm -rf sessions/terminal-*` (Windows: delete the `sessions` folder content) and pair again. |
| YouTube download fails | Public download APIs change often — retry later or use `.ytmp3` with a link. |
| Audio/video convert error | Install ffmpeg: `pkg install ffmpeg` (Termux) / `apt install ffmpeg` (VPS). |
| The bot does not answer "hi" / normal chat | By design: only messages starting with `.` are commands (`.menu`, `.ai hello`). |
| Telegram bot says nothing | Open the bot in **private chat** and send `/start` (groups are ignored). Check the log: `401` = wrong/revoked token (create a new one with @BotFather), `409` = a second copy with the same token is running (`pkill -f node`, `tmux kill-server`). |
| After a restart the users are offline | Saved sessions reconnect by themselves (about 1.5 s per user). Wait a minute; `/stats` shows how many are online. |
| `.antilink` / `.autoreacts` says "Only the owner" | Send the command from the phone that owns the linked WhatsApp account (not from another contact). |
| `npm error code EALLOWGIT` / "Fetching packages of type git have been disabled" | npm 12 blocks git dependencies by default and Baileys needs one. The project now allows it itself (`.npmrc` + installers). If you still see it: `npm install --allow-git=all` (or `export NPM_CONFIG_ALLOW_GIT=all`), then `bash start.sh`. |
| AI says key missing | Add `GEMINI_API_KEY` in `.env` and restart. |
| Node version error | Use Node 18+: `node -v`. |

---

## ❓ FAQ

**What is AWAIS X MD?**  
A free, open-source multi-device WhatsApp bot for 2026 with 167 commands, Gemini AI, YouTube/Instagram/TikTok downloaders, Islamic tools and group management. You can pair it through a Telegram bot or directly in the terminal.

**Who made AWAIS X MD?**  
AWAIS DEV (Awais Mayo Hacker) with the X HACKER TEAM. GitHub: [awaiscybergang](https://github.com/awaiscybergang).

**Is it free?**  
Yes, MIT licensed. In Telegram mode you need a free Telegram bot token; in Terminal mode you don't. A Gemini API key is optional.

**How to run a WhatsApp bot on Termux?**  
Install Termux from F-Droid, then run `pkg install -y git`, clone the repo, run `bash install-termux.sh` and start with `bash start.sh`. Full steps: [Termux install](#-how-to-run-a-whatsapp-bot-on-termux-android). *(Roman Urdu: Termux par bot chalane ke liye upar wale commands ek ek karke paste karein.)*

**How do I install AWAIS X MD (awais md termux install)?**  
`git clone https://github.com/awaiscybergang/Awais-X-MD.git`, `cd Awais-X-MD`, `bash install-termux.sh`, then `bash start.sh` and choose option 2 (Telegram) or 3 (Terminal) in the launcher menu.

**Can I run a WhatsApp bot without a Telegram bot?**  
Yes. Choose **Terminal mode** (`npm run terminal` or `bash start.sh --terminal`): you enter your WhatsApp number and the pairing code is generated in Termux/terminal itself. *(Roman Urdu: Telegram bot ke baghair bhi chalta hai.)*

**Can I pair more than one number on one Termux?**  
Yes, in Terminal mode. While the bot runs type `add` for each extra number (or run `npm run add`). All numbers are saved and reconnect automatically. See [Terminal mode](#-terminal-mode--how-it-works-multi-number).

**Can I run it on Android without a PC?**  
Yes — use Termux, see [Install on Termux](#-how-to-run-a-whatsapp-bot-on-termux-android).

**Will it stop when Termux sleeps?**  
The bot takes a Termux wake-lock, reconnects forever and `run247.sh` / `start.sh` restart it after a crash. For phones with aggressive battery managers also set Termux battery to *Unrestricted*.

**Where can I get a free VPS to run a WhatsApp bot?**  
Join [t.me/awavpshosting](https://t.me/awavpshosting) on Telegram. Plans and availability are managed by that channel, not by this repository. *(Roman Urdu: free VPS ke liye is Telegram channel mein jayein.)*

**How do I keep it running 24/7 on a VPS?**  
Pair once (`npm run terminal`), then use PM2: `pm2 start ecosystem.config.js`, then `pm2 save && pm2 startup` so it starts again after a reboot. Without PM2: `bash run247.sh`.

**How do I run it 24/7 on my laptop?**  
Windows: `start.bat`. macOS/Linux: `bash run247.sh`. Keep the laptop awake and online — see [Laptop / PC](#-laptop--pc--run-it-247).

**Does it work on Windows, Linux and macOS?**  
Yes. Use `install-windows.bat`, `bash install-macos.sh` or `bash install-linux.sh` (or install Node.js 18+ and FFmpeg yourself, then `npm install` and `npm start`). See [Install on Windows / Linux / macOS](#-install-on-windows--linux--macos).

**Which Node.js version do I need?**  
Node.js 18 or newer (20 LTS recommended). Check with `node -v`.

**Does my phone need to stay online?**  
No. The bot is a WhatsApp *Linked Device*; once paired it works independently (WhatsApp may still ask you to open the phone occasionally to keep linked devices active).

**How do I use the Gemini AI commands?**  
Add a free `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey) to `.env` and restart. Then use `.ai`, `.gpt`, `.gemini`, `.ask` and `.imagine`.

**What does anti-delete / anti-edit do?**  
`.antidelete on` recovers deleted text/media and `.antiedit on` shows message edits. `.antilink on`, `.antigali on` and `.antiemoji on` kick people automatically (the bot must be group admin) and are **off by default**. All of these switches work only from the owner's own WhatsApp account.

**How many commands does it have?**  
167 unique commands in 12 categories — see [All Commands](#-all-167-commands).

**Is AWAIS X MD an official WhatsApp product? Is it safe for my number?**  
No. It is an unofficial project, not affiliated with WhatsApp/Meta. Automation can violate WhatsApp's Terms of Service and accounts may be restricted, so use a **secondary number** and avoid spam. *(Roman Urdu: apna main number use na karein.)*

**How do I change the menu image?**  
Send `/setimage https://your-image-url.jpg` to the Telegram bot (owner only, shared default), send `.setimage https://your-image-url.jpg` from your own WhatsApp (only your number), or replace `assets/menu.jpg`.

**Which libraries does it use?**  
`@whiskeysockets/baileys` 6.7.18, `node-telegram-bot-api`, `pino`, `axios`, `yt-search`, `@distube/ytdl-core`, `play-dl`, `fluent-ffmpeg`.

---

## 🗂 Project Structure

```text
Awais-X-MD/
├── index.js               # entry point → auto-install → banner → launcher menu → loads awaismain.js
├── awaismain.js           # sessions, Telegram panel OR terminal mode, pairing, anti-delete/edit, welcome
├── awaiscode.js           # all 167 command handlers + menu
├── awaisconfig.js         # config, constants, lists, helpers
├── config.json            # created automatically on YOUR device (shared defaults + default banner); not in GitHub
├── lib/
│   ├── youtube.js         # YouTube search + multi-API downloader
│   ├── converter.js       # ffmpeg audio conversion
│   ├── firstrun.js        # startup config: flags, menu, saved settings, non-TTY rules
│   ├── bootstrap.js       # Node 18+ check + automatic npm install (built-ins only)
│   ├── brand.js           # locked branding (frozen, not configurable)
│   ├── banner.js          # big / compact startup banner
│   ├── menu.js            # interactive launcher menu
│   ├── env.js             # .env read/write, masking, Telegram token check, phone-number cleaning
│   ├── webserver.js       # Web Pair website + API (rate limits, capacity cap)
│   ├── ratelimit.js       # small in-memory rate limiter for the website
│   ├── ui.js              # colors + what/cause/fix error messages
│   └── keepawake.js       # Termux wake-lock
├── assets/                # README art + menu.jpg (bot menu banner)
├── awais/                 # put awais_audio.mp3 here (optional menu song)
├── sessions/              # WhatsApp sessions (auto-created, git-ignored); one folder per user/number, with its own settings.json
├── temp/  tmp/            # temporary files
├── start.sh               # 24/7 launcher, foreground (auto-restart, wake-lock) - Termux/Linux/macOS
├── start.bat              # 24/7 launcher for Windows (auto-restart)
├── run247.sh              # 24/7 in the background with tmux (+ boot script for Termux)
├── FIX-NOTES.txt          # what was fixed in the pairing / reconnect logic
├── install-termux.sh      # one-shot Termux installer
├── install-vps.sh         # one-shot VPS installer
├── install-linux.sh       # one-shot Ubuntu/Debian installer
├── install-macos.sh       # one-shot macOS (Homebrew) installer
├── install-windows.bat    # one-shot Windows installer (winget)
├── ecosystem.config.js    # PM2 config (24/7)
├── .env.example           # environment template
├── package.json
└── LICENSE
```

---

## 🔒 Safety Defaults (v2.1)

| What | Behaviour |
|---|---|
| Commands | Only messages that start with `.` are commands. Normal chat ("Hai", "Evening") never triggers anything. |
| Owner-only | `.autoreacts .autotyping .autorecording .statusseen .statusreact .antidelete .antiedit .antigali .antilink .antiemoji .setimage` work only from the owner's own WhatsApp account. |
| Auto-kick | `.antigali`, `.antilink`, `.antiemoji` are **OFF** by default. Turn on per number: `.antilink on` (the bot must be group admin). |
| Settings | Saved per number in `sessions/<id>/settings.json` (never shared between users). |
| Telegram mode | Private chats only. Admin = `TELEGRAM_OWNER_CHAT_ID` only. Saved sessions reconnect after a restart. Owner commands: `/setimage`, `/stats`. Limit: `MAX_TELEGRAM_USERS` (default 30). |
| Web Pair mode | Rate limits per IP and per number, `MAX_WEB_SESSIONS` cap (default 30). |
| Phone numbers | `+92 300 1234567`, `03001234567`, `923001234567` all work. A number must have the country code (cannot start with 0). |
| Logout | `/logout` (Telegram) and `remove NUMBER` (Terminal) also remove the linked device on WhatsApp. |

## 🛡 Security & Disclaimer

- **Never share** `.env`, your Telegram bot token, or the `sessions/` folder — anyone holding a session controls your WhatsApp.
- This is an **unofficial** project and is **not affiliated with WhatsApp/Meta**. Automation can violate WhatsApp's Terms of Service and accounts may be restricted — **use a secondary number** and avoid spam/bulk messaging.
- Third-party download/AI APIs are used for some commands; their availability and terms are outside this project's control.
- Use responsibly and respect others' privacy and copyright.

---

## 👑 Credits

<div align="center">

<img src="assets/project-logo.svg" width="120" alt="AWAIS X MD logo"/>

| | |
|:--|:--|
| **BOT** | AWAIS X MD |
| **OWNER** | AWAIS DEV |
| **TEAM** | X HACKER TEAM |
| **GitHub** | [awaiscybergang](https://github.com/awaiscybergang) |
| **YouTube** | [@coreacademi](https://www.youtube.com/@coreacademi) |
| **WhatsApp Channel** | [Join](https://whatsapp.com/channel/0029VbBzlMlIt5rzSeMBE922) |
| **Owner** | [wa.me/923295533214](https://wa.me/923295533214) |
| **Telegram** | [@awaishacker1](https://t.me/awaishacker1) |
| **Free VPS** | [t.me/awavpshosting](https://t.me/awavpshosting) |

<sub>**Keywords:** awais x md · awais md whatsapp bot · multi device whatsapp bot · baileys whatsapp bot · whatsapp bot termux · whatsapp bot without telegram bot · whatsapp bot telegram pairing · gemini whatsapp bot · whatsapp youtube downloader bot · islamic whatsapp bot · free vps whatsapp bot · whatsapp group management bot · whatsapp md bot github</sub>

**Licensed under MIT · Powered by code. Built by X Hacker Team.**

</div>
