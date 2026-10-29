/**
 * 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT - Main Entry
 * Connection, sessions, Telegram pairing, event listeners
 * Auto Status Seen + React + Autotyping + Autoreacts ON by default for every number
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidNormalizedUser
} = require('@whiskeysockets/baileys');
const TelegramBot = require('node-telegram-bot-api');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const {
    CONFIG, loadConfig, saveConfig, getBotImg, getMenuSong, AX
} = require('./awaisconfig');

const {
    handleCommands,
    handleStatus,
    getSessionSettings
} = require('./awaiscode');

// Validate token
if (!CONFIG.TELEGRAM_BOT_TOKEN) {
    console.log('❌ Put TELEGRAM_BOT_TOKEN in .env!');
    process.exit(1);
}

const tgBot = new TelegramBot(CONFIG.TELEGRAM_BOT_TOKEN, { polling: true });
const sessions = {}; // chatId -> Session instance

// ── Welcome message ───────────────────────────────
function welcomeMsg(name, group) {
    return `🎉 *Welcome* @${name}!\n\nGroup: *${group}*\n\nType *.menu* for commands\n${CONFIG.POWERED_BY || '⚡ 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT'}`;
}

// ── Session Class ─────────────────────────────────
class Session {
    constructor(chatId) {
        this.chatId = chatId;
        this.authPath = path.join(CONFIG.SESSIONS_DIR, String(chatId));
        this.sock = null;
        this._reconnectCount = 0;
        this._keepAlive = null;
        fs.mkdirSync(this.authPath, { recursive: true });
    }

    async start(phone) {
        const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 500,
            maxMsgRetryCount: 5,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: true,
            getMessage: async () => undefined
        });

        this.sock.ev.on('creds.update', saveCreds);

        // ── Connection ──
        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Pairing code style via Telegram
                try {
                    await tgBot.sendMessage(this.chatId,
                        `📲 *QR / Pairing*\n\nPhone: ${phone || 'N/A'}\nScan QR from WhatsApp Linked Devices ya pairing code use karo.\n\nBot auto connect ho jayega.`);
                } catch {}
            }

            if (connection === 'open') {
                this._reconnectCount = 0;
                if (this._keepAlive) clearInterval(this._keepAlive);

                // Keepalive
                this._keepAlive = setInterval(async () => {
                    try { await this.sock.sendPresenceUpdate('available'); } catch {}
                }, 4 * 60 * 1000);

                // Ensure default auto features are ON for this session
                const settings = getSessionSettings(this.chatId);
                // Already defaulted to true in awaiscode

                await tgBot.sendMessage(this.chatId,
`✅ *CONNECTED SUCCESSFULLY*

\`\`\`
Status Seen  : ON
Status React : ON
Autoreacts   : ${settings.autoreacts ? 'ON' : 'OFF'}
Autotyping   : ${settings.autotyping ? 'ON' : 'OFF'}
\`\`\`

WhatsApp pe bhejo:

\`\`\`
.menu
\`\`\``,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📊 Status', callback_data: 'act_status' },
                                { text: '📋 WA Menu', callback_data: 'act_menu' }
                            ],
                            [
                                { text: '🤖 AI Help', callback_data: 'act_ai' },
                                { text: '🏠 Home', callback_data: 'act_home' }
                            ]
                        ]
                    }
                }
                ).catch(() => {});

                console.log(`[${this.chatId}] Connected ✅`);
            }

            if (connection === 'close') {
                if (this._keepAlive) clearInterval(this._keepAlive);
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const logout = statusCode === DisconnectReason.loggedOut;

                if (logout) {
                    try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch {}
                    await tgBot.sendMessage(this.chatId,
`❌ *LOGGED OUT*

\`\`\`
Session ended on WhatsApp.
Use /pair to connect again.
\`\`\``,
                    { parse_mode: 'Markdown' }).catch(() => {});
                    delete sessions[this.chatId];
                    return;
                }

                this._reconnectCount = (this._reconnectCount || 0) + 1;
                if (this._reconnectCount > 15) {
                    await tgBot.sendMessage(this.chatId,
`❌ *RECONNECT LIMIT*

\`\`\`
Too many reconnect tries.
Use /pair again.
\`\`\``,
                    { parse_mode: 'Markdown' }).catch(() => {});
                    return;
                }
                console.log(`[${this.chatId}] Reconnecting... (${this._reconnectCount})`);
                setTimeout(() => this.start(phone).catch(console.error), 3000 + this._reconnectCount * 1000);
            }
        });

        // ── Messages ──
        this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                try {
                    if (!msg.message) continue;

                    // Cache message for anti-delete
                    try {
                        const cacheKey = `${msg.key.remoteJid}_${msg.key.id}`;
                        const { msgCache } = require('./awaiscode');
                        if (msgCache && msgCache.set) {
                            msgCache.set(cacheKey, JSON.parse(JSON.stringify(msg)));
                            if (msgCache.size > 2000) {
                                const first = msgCache.keys().next().value;
                                msgCache.delete(first);
                            }
                        }
                    } catch {}

                    if (msg.key.remoteJid === 'status@broadcast') {
                        await handleStatus(this.sock, msg, this.chatId);
                        continue;
                    }

                    await handleCommands(this.sock, msg, this.chatId);
                } catch (e) {
                    console.log('Msg Error:', e.message);
                }
            }
        });

        // ── Anti-Delete & Anti-Edit ──
        this.sock.ev.on('messages.update', async (updates) => {
            try {
                const settings = getSessionSettings(this.chatId);
                for (const u of updates) {
                    // Anti-Edit
                    if (settings.antiedit && u.update?.message) {
                        const key = u.key;
                        const cacheKey = `${key.remoteJid}_${key.id}`;
                        const { msgCache } = require('./awaiscode');
                        const oldMsg = msgCache?.get?.(cacheKey);
                        if (oldMsg) {
                            const oldText = oldMsg.message?.conversation
                                || oldMsg.message?.extendedTextMessage?.text
                                || '[media/old content]';
                            const newText = u.update.message?.conversation
                                || u.update.message?.extendedTextMessage?.text
                                || '[edited media]';
                            if (oldText !== newText) {
                                await this.sock.sendMessage(key.remoteJid, {
                                    text: `✏️ *Anti-Edit Detected*\n\n*Before:*\n${oldText}\n\n*After:*\n${newText}\n\n👤 @${(key.participant || key.remoteJid).split('@')[0]}`,
                                    mentions: [key.participant || key.remoteJid]
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.log('Anti-edit error:', e.message);
            }
        });

        this.sock.ev.on('messages.delete', async (item) => {
            try {
                const settings = getSessionSettings(this.chatId);
                if (!settings.antidelete) return;

                const { msgCache } = require('./awaiscode');
                const keys = item.keys || (item.key ? [item.key] : []);
                for (const key of keys) {
                    const cacheKey = `${key.remoteJid}_${key.id}`;
                    const oldMsg = msgCache?.get?.(cacheKey);
                    if (!oldMsg) continue;

                    const sender = key.participant || key.remoteJid;
                    const text = oldMsg.message?.conversation
                        || oldMsg.message?.extendedTextMessage?.text
                        || null;

                    let content = `🗑️ *Anti-Delete*\n\n👤 @${sender.split('@')[0]}\n`;
                    if (text) {
                        content += `\n*Deleted Message:*\n${text}`;
                        await this.sock.sendMessage(key.remoteJid, { text: content + `\n\n${CONFIG.BOT_FOOTER || ''}`, mentions: [sender] });
                    } else {
                        // Try to recover media
                        content += `\n*Deleted a media message*`;
                        await this.sock.sendMessage(key.remoteJid, { text: content + `\n\n${CONFIG.BOT_FOOTER || ''}`, mentions: [sender] });
                        // Best effort: re-send if possible
                        try {
                            const mType = Object.keys(oldMsg.message || {})[0];
                            if (['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(mType)) {
                                const buffer = await require('@whiskeysockets/baileys').downloadMediaMessage(oldMsg, 'buffer', {}, { logger: require('pino')({ level: 'silent' }), reuploadRequest: this.sock.updateMediaMessage }).catch(() => null);
                                if (buffer) {
                                    if (mType === 'imageMessage') await this.sock.sendMessage(key.remoteJid, { image: buffer, caption: '🗑️ Recovered deleted image' });
                                    else if (mType === 'videoMessage') await this.sock.sendMessage(key.remoteJid, { video: buffer, caption: '🗑️ Recovered deleted video' });
                                    else if (mType === 'audioMessage') await this.sock.sendMessage(key.remoteJid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus' });
                                    else if (mType === 'stickerMessage') await this.sock.sendMessage(key.remoteJid, { sticker: buffer });
                                }
                            }
                        } catch {}
                    }
                }
            } catch (e) {
                console.log('Anti-delete error:', e.message);
            }
        });

        // ── Group participants (Welcome + Goodbye) ──
        this.sock.ev.on('group-participants.update', async (update) => {
            try {
                const settings = getSessionSettings(this.chatId);
                const meta = await this.sock.groupMetadata(update.id);
                const wImg = getBotImg();

                for (const p of update.participants) {
                    const name = p.split('@')[0];

                    if (update.action === 'add' && settings.welcome) {
                        let caption = settings.welcomeMsg
                            ? settings.welcomeMsg.replace(/@user/gi, `@${name}`).replace(/@group/gi, meta.subject)
                            : `🎉 *Welcome* @${name}!\n\nGroup: *${meta.subject}*\n\nType *.menu* to see commands`;
                        if (wImg) {
                            await this.sock.sendMessage(update.id, { image: { url: wImg }, caption, mentions: [p] });
                        } else {
                            await this.sock.sendMessage(update.id, { text: caption, mentions: [p] });
                        }
                    }

                    if (update.action === 'remove' && settings.goodbye) {
                        let caption = settings.goodbyeMsg
                            ? settings.goodbyeMsg.replace(/@user/gi, `@${name}`).replace(/@group/gi, meta.subject)
                            : `👋 *Goodbye* @${name}\n\nWe will miss you in *${meta.subject}*`;
                        await this.sock.sendMessage(update.id, { text: caption, mentions: [p] });
                    }
                }
            } catch (e) {
                console.log('Welcome/Goodbye error:', e.message);
            }
        });

        // Request pairing code if phone given and no creds yet
        if (phone && !state.creds?.registered) {
            try {
                await new Promise(r => setTimeout(r, 2000));
                const code = await this.sock.requestPairingCode(phone.replace(/[^0-9]/g, ''));
                await tgBot.sendMessage(this.chatId,
`🔑 *PAIRING CODE*

Copy this code:

\`\`\`
${code}
\`\`\`

Steps
\`\`\`
1. Open WhatsApp
2. Linked Devices
3. Link with phone number
4. Paste the code above
\`\`\``,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '📊 Status', callback_data: 'act_status' }],
                            [{ text: '🏠 Home', callback_data: 'act_home' }]
                        ]
                    }
                }
                );
            } catch (e) {
                console.log('Pairing code error:', e.message);
                await tgBot.sendMessage(this.chatId,
`❌ *PAIRING FAILED*

\`\`\`
${e.message}
\`\`\``,
                { parse_mode: 'Markdown' }).catch(() => {});
            }
        }
    }
}

// ── Telegram Handlers (Premium Button UI) ─────────

function mainKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🔗 Pair WhatsApp', callback_data: 'act_pair' },
                { text: '📊 Status', callback_data: 'act_status' }
            ],
            [
                { text: '📋 WA Menu', callback_data: 'act_menu' },
                { text: '🤖 AI Help', callback_data: 'act_ai' }
            ],
            [
                { text: '⚙️ Settings', callback_data: 'act_settings' },
                { text: '🖼️ Set Banner', callback_data: 'act_setimage' }
            ],
            [
                { text: '🚪 Logout', callback_data: 'act_logout' },
                { text: '❓ Help', callback_data: 'act_help' }
            ]
        ]
    };
}

function statusKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: '🔄 Refresh', callback_data: 'act_status' },
                { text: '🏠 Home', callback_data: 'act_home' }
            ],
            [
                { text: '🚪 Logout', callback_data: 'act_logout' }
            ]
        ]
    };
}

function backKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'act_home' }]
        ]
    };
}

function pairKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '🏠 Main Menu', callback_data: 'act_home' }],
            [{ text: '📊 Check Status', callback_data: 'act_status' }]
        ]
    };
}

async function sendHome(id, edit = false, messageId = null) {
    const s = sessions[id];
    const connected = !!(s && s.sock && s.sock.user);
    const statusLine = connected
        ? '🟢 *Status:* Connected'
        : '🔴 *Status:* Not connected';

    const body =
`╔══════════════════════════╗
║   👑 𝐀𝐖𝐀𝐈𝐒 𝐌𝐃 𝐁𝐎𝐓 👑   ║
║    Premium Control Panel ║
╚══════════════════════════╝

${statusLine}

\`\`\`
How to connect
1. Tap 🔗 Pair WhatsApp
2. Send number like:
   /pair 92xxxxxxxxx
3. Enter code in WhatsApp
   Linked Devices
\`\`\`

✦ Multi-Device  ✦ Auto Status
✦ Gemini AI     ✦ 160+ Commands

Choose an option below 👇`;

    const opts = {
        parse_mode: 'Markdown',
        reply_markup: mainKeyboard()
    };
    if (edit && messageId) {
        try {
            await tgBot.editMessageText(body, { chat_id: id, message_id: messageId, ...opts });
            return;
        } catch {}
    }
    await tgBot.sendMessage(id, body, opts);
}

async function sendStatusCard(id, edit = false, messageId = null) {
    const s = sessions[id];
    if (!s || !s.sock) {
        const body =
`📊 *CONNECTION STATUS*

\`\`\`
Connected : NO
Session   : None
\`\`\`

Tap *Pair WhatsApp* to connect.`;
        const opts = { parse_mode: 'Markdown', reply_markup: statusKeyboard() };
        if (edit && messageId) {
            try { await tgBot.editMessageText(body, { chat_id: id, message_id: messageId, ...opts }); return; } catch {}
        }
        await tgBot.sendMessage(id, body, opts);
        return;
    }
    const settings = getSessionSettings(id);
    const user = s.sock.user;
    const jid = user?.id || 'N/A';
    const body =
`📊 *CONNECTION STATUS*

\`\`\`
Connected   : YES
WhatsApp    : ${jid}
Autoreacts  : ${settings.autoreacts ? 'ON' : 'OFF'}
Autotyping  : ${settings.autotyping ? 'ON' : 'OFF'}
Status Seen : ${settings.statusSeen ? 'ON' : 'OFF'}
Status React: ${settings.statusReact ? 'ON' : 'OFF'}
Anti-Delete : ${settings.antidelete ? 'ON' : 'OFF'}
Anti-Edit   : ${settings.antiedit ? 'ON' : 'OFF'}
Welcome     : ${settings.welcome ? 'ON' : 'OFF'}
Goodbye     : ${settings.goodbye ? 'ON' : 'OFF'}
\`\`\`

Bot is live on WhatsApp ✅`;
    const opts = { parse_mode: 'Markdown', reply_markup: statusKeyboard() };
    if (edit && messageId) {
        try { await tgBot.editMessageText(body, { chat_id: id, message_id: messageId, ...opts }); return; } catch {}
    }
    await tgBot.sendMessage(id, body, opts);
}

tgBot.onText(/\/start$/, async (msg) => {
    await sendHome(msg.chat.id);
});

tgBot.onText(/\/help$/, async (msg) => {
    const id = msg.chat.id;
    await tgBot.sendMessage(id,
`❓ *HELP — 𝐀𝐖𝐀𝐈𝐒 𝐌𝐃*

\`\`\`
/start     Main panel
/pair NUM  Connect WhatsApp
/status    Connection info
/logout    Disconnect
/setimage  Set menu banner
\`\`\`

*WhatsApp (after connect)*
\`\`\`
.menu      Full command list
.ai        Awais AI (Gemini)
.imagine   AI image
.vv        Unlock view-once
\`\`\`

Identity
\`\`\`
Name    : Awais AI
Creator : Awais Mayo Hacker
\`\`\``,
    { parse_mode: 'Markdown', reply_markup: backKeyboard() });
});

tgBot.onText(/\/pair(?:\s+(\+?\d+))?/, async (msg, match) => {
    const id = msg.chat.id;
    const phone = (match[1] || '').replace(/\D/g, '');
    if (!phone) {
        await tgBot.sendMessage(id,
`🔗 *PAIR WHATSAPP*

Send your number with country code:

\`\`\`
/pair 92xxxxxxxxx
\`\`\`

Rules
\`\`\`
• Digits only after /pair
• No + sign required
• Example Pakistan: 92...
• Example India: 91...
\`\`\``,
        { parse_mode: 'Markdown', reply_markup: pairKeyboard() });
        return;
    }
    if (sessions[id]) {
        await tgBot.sendMessage(id,
`⚠️ *SESSION EXISTS*

\`\`\`
A session is already active.
Use /logout first, then /pair again.
\`\`\``,
        { parse_mode: 'Markdown', reply_markup: mainKeyboard() });
        return;
    }
    await tgBot.sendMessage(id,
`⏳ *CONNECTING...*

\`\`\`
Number : ${phone}
Please wait for pairing code...
\`\`\``,
    { parse_mode: 'Markdown' });

    const session = new Session(id);
    sessions[id] = session;
    try {
        await session.start(phone);
    } catch (e) {
        await tgBot.sendMessage(id,
`❌ *CONNECTION FAILED*

\`\`\`
${e.message}
\`\`\``,
        { parse_mode: 'Markdown', reply_markup: mainKeyboard() });
        delete sessions[id];
    }
});

tgBot.onText(/\/status$/, async (msg) => {
    await sendStatusCard(msg.chat.id);
});

tgBot.onText(/\/logout|\/stop/, async (msg) => {
    const id = msg.chat.id;
    const s = sessions[id];
    if (s) {
        try { s.sock?.end(undefined); } catch {}
        try { fs.rmSync(s.authPath, { recursive: true, force: true }); } catch {}
        delete sessions[id];
    }
    await tgBot.sendMessage(id,
`🚪 *LOGGED OUT*

\`\`\`
Session cleared successfully.
Use /pair to connect again.
\`\`\``,
    { parse_mode: 'Markdown', reply_markup: mainKeyboard() });
});

tgBot.onText(/\/setimage(?:\s+(.+))?/, async (msg, match) => {
    const id = msg.chat.id;
    const url = (match[1] || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
        await tgBot.sendMessage(id,
`🖼️ *SET BANNER IMAGE*

Send image URL:

\`\`\`
/setimage https://i.ibb.co/example.jpg
\`\`\`

This image is used on WhatsApp \`.menu\`.`,
        { parse_mode: 'Markdown', reply_markup: backKeyboard() });
        return;
    }
    const cfg = loadConfig();
    cfg.BOT_IMG = url;
    saveConfig(cfg);
    await tgBot.sendMessage(id,
`✅ *BANNER UPDATED*

\`\`\`
Image saved.
Open WhatsApp and type .menu
\`\`\``,
    { parse_mode: 'Markdown', reply_markup: backKeyboard() });
});

// Inline button callbacks
tgBot.on('callback_query', async (q) => {
    const id = q.message.chat.id;
    const mid = q.message.message_id;
    const data = q.data || '';
    try { await tgBot.answerCallbackQuery(q.id); } catch {}

    if (data === 'act_home' || data === 'act_help' && false) {
        await sendHome(id, true, mid);
        return;
    }
    if (data === 'act_home') {
        await sendHome(id, true, mid);
        return;
    }
    if (data === 'act_status') {
        await sendStatusCard(id, true, mid);
        return;
    }
    if (data === 'act_pair') {
        await tgBot.editMessageText(
`🔗 *PAIR WHATSAPP*

Send:

\`\`\`
/pair 923xxxxxxx
\`\`\`

Replace with your number (country code, no +).`,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: pairKeyboard() }).catch(() => {});
        return;
    }
    if (data === 'act_menu') {
        await tgBot.editMessageText(
`📋 *WHATSAPP MENU*

After connect, send on WhatsApp:

\`\`\`
.menu
\`\`\`

Categories
\`\`\`
General | YouTube | Download
Student | Developer | Islamic
Awais Tools | Anti | Group
Fun | DPZ | AI
\`\`\`

160+ commands • one per line`,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: backKeyboard() }).catch(() => {});
        return;
    }
    if (data === 'act_ai') {
        await tgBot.editMessageText(
`🤖 *AWAIS AI*

Powered by Google Gemini (free key)

\`\`\`
.ai Who are you?
.gpt Explain gravity
.gemini Write a poem
.ask Kisne banaya?
.imagine cat in space
\`\`\`

Identity
\`\`\`
Name    : Awais AI
Creator : Awais Mayo Hacker
\`\`\`

Put key in .env:
\`\`\`
GEMINI_API_KEY=your_key
\`\`\``,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: backKeyboard() }).catch(() => {});
        return;
    }
    if (data === 'act_settings') {
        const settings = getSessionSettings(id);
        await tgBot.editMessageText(
`⚙️ *SETTINGS*

\`\`\`
Autoreacts  : ${settings.autoreacts ? 'ON' : 'OFF'}
Autotyping  : ${settings.autotyping ? 'ON' : 'OFF'}
Status Seen : ${settings.statusSeen ? 'ON' : 'OFF'}
Status React: ${settings.statusReact ? 'ON' : 'OFF'}
Anti-Delete : ${settings.antidelete ? 'ON' : 'OFF'}
Anti-Edit   : ${settings.antiedit ? 'ON' : 'OFF'}
\`\`\`

Change from WhatsApp:
\`\`\`
.autoreacts on
.autotyping off
.antidelete on
\`\`\``,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: backKeyboard() }).catch(() => {});
        return;
    }
    if (data === 'act_setimage') {
        await tgBot.editMessageText(
`🖼️ *SET BANNER*

\`\`\`
/setimage https://i.ibb.co/Gvj78h8g/1783418851011.png
\`\`\``,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: backKeyboard() }).catch(() => {});
        return;
    }
    if (data === 'act_logout') {
        const s = sessions[id];
        if (s) {
            try { s.sock?.end(undefined); } catch {}
            try { fs.rmSync(s.authPath, { recursive: true, force: true }); } catch {}
            delete sessions[id];
        }
        await tgBot.editMessageText(
`🚪 *LOGGED OUT*

\`\`\`
Session cleared.
\`\`\``,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: mainKeyboard() }).catch(() => {});
        return;
    }
    if (data === 'act_help') {
        await tgBot.editMessageText(
`❓ *HELP*

\`\`\`
/start  /pair  /status
/logout /setimage
\`\`\`

WhatsApp: \`.menu\`  \`.ai\``,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: backKeyboard() }).catch(() => {});
    }
});

// ── Start ─────────────────────────────────────────
console.log('🚀 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT starting...');
console.log('Telegram premium panel ready. /start for buttons.');
console.log('Auto Status Seen + React + Autoreacts + Autotyping ON by default.');
