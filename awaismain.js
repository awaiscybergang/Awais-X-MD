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
    fetchLatestWaWebVersion,
    jidNormalizedUser,
    Browsers
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
    getSessionSettings,
    clearSessionSettings,
    cacheMessage,
    getCachedMessage,
    updateCachedMessage
} = require('./awaiscode');
const { cleanPhone } = require('./lib/env');

// ── Mode: telegram | terminal | web ──
const _rawMode = String(process.env.BOT_MODE || 'telegram').toLowerCase();
const MODE = _rawMode === 'terminal' ? 'terminal' : _rawMode === 'web' ? 'web' : 'telegram';

// Console stand-in for the Telegram bot (terminal / web mode): same API, prints to screen
function makeConsoleBot() {
    const clean = t => String(t || '').replace(/```/g, '').replace(/[*_`]/g, '').replace(/Use \/pair[^\n]*\n?/g, '').replace(/\\/g, '').trim();
    const out = async (id, text) => {
        const tag = String(id).startsWith('terminal-') ? `[+${String(id).slice(9)}] ` :
                    String(id).startsWith('web-') ? `[web:${String(id).slice(4)}] ` : '';
        console.log('\n' + tag + clean(text) + '\n');
        return { message_id: 0 };
    };
    return {
        sendMessage: out,
        editMessageText: out,
        answerCallbackQuery: async () => {},
        onText: () => {},
        on: () => {}
    };
}

let tgBot;
const OWNER_CHAT_ID = String(CONFIG.TELEGRAM_OWNER_CHAT_ID || '').trim();

// Admin powers belong to ONE Telegram user id. No owner id configured = nobody is admin (never "open to everyone").
function isTelegramOwner(chatId) {
    if (!OWNER_CHAT_ID) return false;
    return String(chatId) === OWNER_CHAT_ID;
}

if (MODE === 'telegram') {
    if (!CONFIG.TELEGRAM_BOT_TOKEN) {
        console.log('❌ TELEGRAM_BOT_TOKEN is missing in .env -> Telegram mode needs a bot token -> add it (npm run setup) or use personal mode: npm run terminal');
        process.exit(2);
    }
    if (!OWNER_CHAT_ID || !/^\d{5,15}$/.test(OWNER_CHAT_ID)) {
        console.log('❌ TELEGRAM_OWNER_CHAT_ID is missing or invalid in .env -> Telegram mode needs the owner Telegram ID (numbers only) -> get it from @userinfobot, then run: npm run setup   (or use: npm run terminal)');
        process.exit(2);
    }
    tgBot = new TelegramBot(CONFIG.TELEGRAM_BOT_TOKEN, { polling: true });
    // Internet down: Telegram polling keeps retrying by itself; just print one short note per minute (no crash, no spam)
    let lastPollErr = 0;
    tgBot.on('polling_error', e => {
        const now = Date.now();
        if (now - lastPollErr < 60000) return;
        lastPollErr = now;
        const em = String((e && (e.message || e.code)) || 'unknown');
        if (/\b401\b|Unauthorized/i.test(em)) console.log('❌ Telegram says the bot token is INVALID or was revoked (401) -> create a new token with @BotFather (/revoke), then run: npm run setup');
        else if (/\b409\b|Conflict/i.test(em)) console.log('⚠️ Telegram says another copy of this bot is running with the same token (409) -> stop the other copy (Termux: tmux kill-server / pkill -f node), only ONE copy may run.');
        else console.log(`⚠️ Telegram connection problem (${em.slice(0, 80)}) -> retrying automatically, no restart needed.`);
    });
} else {
    tgBot = makeConsoleBot();
}
const sessions = {}; // chatId -> Session instance

// ── Welcome message ───────────────────────────────
function welcomeMsg(name, group) {
    return `🎉 *Welcome* @${name}!\n\nGroup: *${group}*\n\nType *.menu* for commands\n${CONFIG.POWERED_BY || '⚡ 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT'}`;
}

// ── Pairing helpers ───────────────────────────────
// A number is really linked only AFTER WhatsApp accepted the pairing (creds.account is set then, and
// me.id gets a ":device" suffix).  creds.registered is NOT usable for this: current Baileys sets it to
// true as soon as a pairing CODE is requested, so a half-finished pairing looked like a "saved, linked
// number" (the bot then re-used it without asking for the number -> 401 -> "LOGGED OUT").
function credsPaired(creds) {
    if (!creds) return false;
    if (creds.account) return true;
    return /:\d+@/.test(String(creds.me && creds.me.id || ''));
}
function readCreds(authPath) {
    try { return JSON.parse(fs.readFileSync(path.join(authPath, 'creds.json'), 'utf8')); } catch { return null; }
}
function isPairedOnDisk(authPath) { return credsPaired(readCreds(authPath)); }

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout after ' + Math.round(ms / 1000) + 's')), ms);
        Promise.resolve(promise).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
}

const MAX_PAIR_ATTEMPTS = 6; // new pairing codes per add (each one ~2 min) - protects the number from WhatsApp rate limits
const QUICKDROP_WAIT_MS = Number(process.env.AWAIS_QUICKDROP_WAIT_MS) || 60 * 1000;
const CODE_LIFETIME_MS = Number(process.env.AWAIS_CODE_TTL_MS) || 110 * 1000;

const CLOSE_REASONS = {
    401: 'logged out by WhatsApp (401)',
    403: 'WhatsApp refused this number (403) - it may be temporarily restricted',
    405: 'WhatsApp rejected this client version (405) - update Baileys: npm i @whiskeysockets/baileys@latest',
    408: 'timed out (408) - slow or unstable internet',
    411: 'multi-device mismatch (411)',
    428: 'connection dropped (428) - internet/VPN/data-saver problem',
    440: 'this session is open in ANOTHER running copy of the bot (440)',
    500: 'WhatsApp ended the session (500)',
    503: 'WhatsApp server unavailable (503) - temporary',
    515: 'restart required (515) - normal right after pairing'
};
function describeClose(code, err) {
    const msg = err && err.message ? String(err.message).slice(0, 90) : '';
    const base = CLOSE_REASONS[code] || ('unknown reason' + (code ? ' (' + code + ')' : ''));
    return base + ((msg && code !== 515 && code !== 428) ? ' [' + msg + ']' : '');
}

// Messages can be wrapped (disappearing chats, view-once, document with caption): get the real content
function unwrapMessage(m) {
    let x = m || {};
    for (let i = 0; i < 4; i++) {
        if (x.ephemeralMessage && x.ephemeralMessage.message) x = x.ephemeralMessage.message;
        else if (x.viewOnceMessage && x.viewOnceMessage.message) x = x.viewOnceMessage.message;
        else if (x.viewOnceMessageV2 && x.viewOnceMessageV2.message) x = x.viewOnceMessageV2.message;
        else if (x.documentWithCaptionMessage && x.documentWithCaptionMessage.message) x = x.documentWithCaptionMessage.message;
        else break;
    }
    return x;
}
function textOfMessage(m) {
    m = m || {};
    return m.conversation
        || (m.extendedTextMessage && m.extendedTextMessage.text)
        || (m.imageMessage && m.imageMessage.caption)
        || (m.videoMessage && m.videoMessage.caption)
        || (m.documentMessage && m.documentMessage.caption)
        || '';
}

// ── Session Class ─────────────────────────────────
class Session {
    constructor(chatId, opts) {
        opts = opts || {};
        this.chatId = chatId;
        this.authPath = path.join(CONFIG.SESSIONS_DIR, String(chatId));
        this.sock = null;
        this._reconnectCount = 0;
        this._codesShown = 0;        // pairing codes shown so far (limit protects the number from WhatsApp rate limits)
        this._quickDrops = 0;        // WhatsApp dropped the socket within seconds after a code was shown (rate limit)
        this._altVersion = false;    // after 2 pairing codes without a login: try the current WhatsApp Web version
        this._altLogged = false;
        this._preFails = 0;          // connection closed BEFORE a code existed (internet trouble): retried without limit
        this._announced = !!opts.restored; // "CONNECTED" message only once (never again for a session restored after a restart)
        this._reported = new Set();  // anti-delete: messages already reported (no duplicate notices)
        this._qrNotified = false;
        this._manualLogout = false;
        this._failMsg = '';
        this._gen = 0;               // socket generation: events of an old socket are ignored
        this._keepAlive = null;
        this._timer = null;          // reconnect timer
        this._codeTimer = null;      // pairing-code expiry timer
        this._stopped = false;
        fs.mkdirSync(this.authPath, { recursive: true });
    }

    _clearTimers() {
        if (this._keepAlive) clearInterval(this._keepAlive);
        if (this._timer) clearTimeout(this._timer);
        if (this._codeTimer) clearTimeout(this._codeTimer);
        this._keepAlive = this._timer = this._codeTimer = null;
    }

    _closeSock() {
        this._gen++;                 // old socket events are ignored from now on
        const old = this.sock;
        this.sock = null;
        if (!old) return;
        try { old.ev.removeAllListeners(); } catch {}
        try { old.end(undefined); } catch {}
    }

    // Stop this session for good (no auto-reconnect)
    stop() {
        this._stopped = true;
        this._clearTimers();
        this._closeSock();
    }

    // Stop + forget a number that cannot be linked (clean state for the next "add")
    async _giveUp(text, tgText) {
        this._gaveUp = true;
        this._failMsg = String(tgText || text).replace(/[*`]/g, '').replace(/\s*\n+\s*/g, ' ').trim().slice(0, 300);
        this.stop();
        try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch {}
        clearSessionSettings(this.chatId);
        delete sessions[this.chatId];
        console.log(text);
        if (MODE === 'telegram') await tgBot.sendMessage(this.chatId, tgText || text).catch(() => {});
    }

    // Full logout: removes the linked device on WhatsApp too (best effort, 8s limit), then deletes the local session
    async logout() {
        this._manualLogout = true;
        try { if (this.sock && this.sock.user) await withTimeout(this.sock.logout(), 8000); } catch { /* offline: local cleanup below still happens */ }
        this.stop();
        try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch {}
        clearSessionSettings(this.chatId);
        delete sessions[this.chatId];
    }

    // WhatsApp asked for a QR login although this session was saved = the saved login is no longer valid
    async _sessionExpired() {
        if (this._qrNotified) return;
        this._qrNotified = true;
        this.stop();
        try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch {}
        clearSessionSettings(this.chatId);
        delete sessions[this.chatId];
        console.log(`[${this.chatId}] ⚠️ The saved WhatsApp login is no longer valid (the device was removed or expired) -> the session was cleaned. Link again with /pair (Telegram) or add (Terminal).`);
        if (MODE === 'telegram') await tgBot.sendMessage(this.chatId, '📲 *Session expired*\n\nUse /pair to link your WhatsApp again.', { parse_mode: 'Markdown' }).catch(() => {});
    }

    _giveUpPairing() {
        return this._giveUp(
            `[+${numOf(this.chatId)}] ❌ Pairing did not finish after ${MAX_PAIR_ATTEMPTS} tries -> likely cause: bad internet, the code was not entered in time, or WhatsApp is rate-limiting this number -> fix: wait 10-15 minutes, check your internet (turn off VPN/data saver), then type:  add`,
            '❌ *PAIRING TIMED OUT*\n\nWait 10-15 minutes, then use /pair again.');
    }

    // Anti-delete notice (text, or recovered media)
    async _reportDeleted(sock, key) {
        const settings = getSessionSettings(this.chatId);
        if (!settings.antidelete) return;
        const old = getCachedMessage(this.chatId, key.remoteJid, key.id);
        if (!old || (old.key && old.key.fromMe)) return;
        const dedupe = key.remoteJid + '_' + key.id;
        if (this._reported.has(dedupe)) return;
        this._reported.add(dedupe);
        if (this._reported.size > 500) this._reported.delete(this._reported.values().next().value);

        const sender = (old.key && old.key.participant) || key.participant || key.remoteJid;
        const m = unwrapMessage(old.message);
        const text = textOfMessage(m);
        const footer = CONFIG.BOT_FOOTER || '';
        let content = `🗑️ *Anti-Delete*\n\n👤 @${sender.split('@')[0]}\n`;
        const mType = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].find(t => m[t]);
        if (text && !mType) {
            await sock.sendMessage(key.remoteJid, { text: content + `\n*Deleted Message:*\n${text}` + `\n\n${footer}`, mentions: [sender] });
            return;
        }
        content += `\n*Deleted a media message*` + (text ? `\n${text}` : '');
        await sock.sendMessage(key.remoteJid, { text: content + `\n\n${footer}`, mentions: [sender] });
        if (!mType) return;
        try {
            const buffer = await require('@whiskeysockets/baileys').downloadMediaMessage(old, 'buffer', {},
                { logger: require('pino')({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }).catch(() => null);
            if (!buffer) return;
            if (mType === 'imageMessage') await sock.sendMessage(key.remoteJid, { image: buffer, caption: '🗑️ Recovered deleted image' });
            else if (mType === 'videoMessage') await sock.sendMessage(key.remoteJid, { video: buffer, caption: '🗑️ Recovered deleted video' });
            else if (mType === 'audioMessage') await sock.sendMessage(key.remoteJid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus' });
            else if (mType === 'stickerMessage') await sock.sendMessage(key.remoteJid, { sticker: buffer });
            else if (mType === 'documentMessage') await sock.sendMessage(key.remoteJid, { document: buffer, mimetype: m.documentMessage.mimetype || 'application/octet-stream', fileName: m.documentMessage.fileName || 'recovered' });
        } catch { /* media could not be recovered: the text notice above was already sent */ }
    }

    // Anti-edit notice (shows the text before and after)
    async _reportEdited(sock, key, edited) {
        const settings = getSessionSettings(this.chatId);
        const old = getCachedMessage(this.chatId, key.remoteJid, key.id);
        const newText = textOfMessage(unwrapMessage(edited));
        if (!old || !newText) return;
        if (settings.antiedit && !(old.key && old.key.fromMe)) {
            const oldText = textOfMessage(unwrapMessage(old.message)) || '[media/old content]';
            if (oldText !== newText) {
                const who = (old.key && old.key.participant) || key.participant || key.remoteJid;
                await sock.sendMessage(key.remoteJid, {
                    text: `✏️ *Anti-Edit Detected*\n\n*Before:*\n${oldText}\n\n*After:*\n${newText}\n\n👤 @${who.split('@')[0]}`,
                    mentions: [who]
                });
            }
        }
        updateCachedMessage(this.chatId, key.remoteJid, key.id, edited);   // a second edit must show the right "Before"
    }

    _scheduleStart(phone, ms) {
        if (this._stopped) return;
        if (this._timer) clearTimeout(this._timer);
        this._timer = setTimeout(() => {
            this._timer = null;
            this.start(phone).catch(e => {
                console.log(`[${this.chatId}] Start error: ${e && e.message} - trying again in 10s`);
                this._scheduleStart(phone, 10000);
            });
        }, ms);
    }

    async start(phone) {
        if (this._stopped) return;
        this._clearTimers();
        this._closeSock();
        const gen = this._gen;
        const id = this.chatId;

        // Unpaired + number given = always start from a clean folder (no half-written creds from a failed try)
        if (phone && !isPairedOnDisk(this.authPath)) {
            try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch {}
            fs.mkdirSync(this.authPath, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
        if (gen !== this._gen || this._stopped) return;

        // WhatsApp checks the client version during login and rejects outdated ones for some accounts.
        // Normal start: the version list of Baileys. If the pairing was NOT accepted twice in a row (or WA_VERSION_SOURCE=web in .env),
        // the CURRENT WhatsApp Web version is read from web.whatsapp.com instead.
        let version;
        if ((this._altVersion || process.env.WA_VERSION_SOURCE === 'web') && typeof fetchLatestWaWebVersion === 'function') {
            try {
                const r = await withTimeout(fetchLatestWaWebVersion(), 8000);
                if (r && r.version && r.isLatest !== false) {
                    version = r.version;
                    if (!this._altLogged) { this._altLogged = true; console.log(`[${id}] Using the current WhatsApp Web version ${version.join('.')} (the last pairing attempts were not accepted).`); }
                }
            } catch (e) { /* falls back to the normal source below */ }
        }
        if (!version) {
            try { ({ version } = await withTimeout(fetchLatestBaileysVersion(), 8000)); }
            catch (e) { console.log(`[${id}] Could not read the latest WhatsApp Web version (${e && e.message}) - using the built-in one.`); }
        }
        if (gen !== this._gen || this._stopped) return;

        if (phone) this._phone = String(phone).replace(/\D/g, '');
        const needPairing = !!phone && !credsPaired(state.creds);
        if (needPairing && this._codesShown >= MAX_PAIR_ATTEMPTS) return this._giveUpPairing();

        const sock = makeWASocket({
            version,
            auth: state,
            browser: (Browsers && Browsers.ubuntu) ? Browsers.ubuntu('Chrome') : ['Ubuntu', 'Chrome', '22.04.4'],
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000,
            keepAliveIntervalMs: 25000,
            retryRequestDelayMs: 500,
            maxMsgRetryCount: 5,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: false,   // true makes the phone stop ringing for new messages while the bot is online (users complain about it)
            getMessage: async () => undefined
        });
        this.sock = sock;

        sock.ev.on('creds.update', async () => {
            try { await saveCreds(); } catch (e) { console.log(`[${id}] Could not save the session: ${e && e.message}`); }
        });

        // ── Pairing code (asked only when WhatsApp is ready, and only once per socket) ──
        let codeAsked = false;
        let codeShown = false;
        const askCode = async () => {
            if (codeAsked || !needPairing || gen !== this._gen || this._stopped) return;
            codeAsked = true;
            try {
                const code = await sock.requestPairingCode(phone.replace(/[^0-9]/g, ''));
                if (gen !== this._gen || this._stopped) return;
                codeShown = true;
                this._lastPairCode = String(code);
                this._codeAt = Date.now();
                this._codesShown++;
                this._preFails = 0;
                if (MODE === 'terminal' || MODE === 'web') {
                    const pretty = String(code).replace(/(.{4})(?=.)/g, '$1-');
                    console.log('\n╔══════════════════════════════════════════╗');
                    console.log('║        🔑  WHATSAPP PAIRING CODE         ║');
                    console.log('╠══════════════════════════════════════════╣');
                    console.log('║                                          ║');
                    console.log('║            ' + pretty.padEnd(30) + '║');
                    console.log('║                                          ║');
                    console.log('╚══════════════════════════════════════════╝');
                    if (MODE === 'terminal') {
                        console.log('  1) Open WhatsApp → Settings → Linked Devices');
                        console.log('  2) Tap "Link a Device" → "Link with phone number instead"');
                        console.log('  3) Enter the code above (number: +' + phone + ')');
                        console.log('  ⏳ Enter it within ~2 minutes. After you enter it, wait: the bot restarts the connection once by itself (normal).');
                        console.log('  ❗ Do NOT type "add" again while waiting - every new code cancels the old one.\n');
                    } else {
                        console.log('  [Web Pair] Code for +' + phone + ' is now available on the website.\n');
                    }
                } else {
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
                    }).catch(() => {});
                }
                // Code expired and nobody entered it -> drop this socket, the close handler creates a fresh code
                this._codeTimer = setTimeout(() => {
                    if (gen !== this._gen || this._stopped || credsPaired(state.creds)) return;
                    console.log(`[${id}] ⌛ The code expired - creating a new one...`);
                    this._scheduleStart(phone, 500);
                }, CODE_LIFETIME_MS);
            } catch (e) {
                if (gen !== this._gen || this._stopped) return;
                const closed = /closed|428|timed out/i.test(String(e && e.message));
                if (closed) {
                    // The 'close' event of this socket schedules the next try
                    console.log(`[${id}] ⚠️ WhatsApp closed the connection before the code was ready (${e.message}) - retrying automatically...`);
                } else {
                    await this._giveUp(
                        `[+${numOf(id)}] ❌ Pairing code request refused: ${e && e.message} -> likely cause: wrong number (use country code, digits only) or WhatsApp rate-limit -> fix: check the number, wait 10-15 minutes, then type:  add`,
                        `❌ *PAIRING FAILED*\n\n\`\`\`\n${e && e.message}\n\`\`\``);
                }
            }
        };
        if (needPairing) {
            // Fallback: if WhatsApp never sends the first "qr" signal, try anyway after 8s
            this._timer = setTimeout(() => { askCode(); }, 8000);
        }

        // ── Connection ──
        sock.ev.on('connection.update', async (update) => {
            if (gen !== this._gen || this._stopped || this._manualLogout) return;
            const { connection, lastDisconnect, qr, isNewLogin } = update;

            if (qr) {
                if (needPairing) askCode();   // socket is ready -> now it is safe to ask for the code
                else this._sessionExpired();   // once, and the dead session is cleaned (no QR spam every 20 seconds)
            }

            if (isNewLogin) {
                this._justPaired = true;
                console.log(`[${id}] ✅ Pairing accepted! WhatsApp now restarts the connection once - please wait a few seconds...`);
            }

            if (connection === 'open') {
                this._everOpened = true;
                autoRepaired.delete(this.chatId);   // a later logout may be re-paired automatically again
                const wasReconnecting = this._reconnectCount;
                this._reconnectCount = 0;
                this._codesShown = 0;
                this._quickDrops = 0;
                this._preFails = 0;
                if (this._codeTimer) { clearTimeout(this._codeTimer); this._codeTimer = null; }
                if (this._keepAlive) clearInterval(this._keepAlive);

                // Keepalive
                this._keepAlive = setInterval(async () => {
                    try { await this.sock.sendPresenceUpdate('available'); } catch {}
                }, 4 * 60 * 1000);

                // Ensure default auto features are ON for this session
                const settings = getSessionSettings(this.chatId);
                // Already defaulted to true in awaiscode

                if (!this._announced) {
                this._announced = true;
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
                // Notify the bot owner (if set and different from this user)
                if (MODE === 'telegram' && OWNER_CHAT_ID && String(this.chatId) !== OWNER_CHAT_ID) {
                    const waJid = (this.sock && this.sock.user && this.sock.user.id) || 'unknown';
                    tgBot.sendMessage(OWNER_CHAT_ID,
                        `🔔 *New WhatsApp linked*\n\nUser Chat ID: \`${this.chatId}\`\nWhatsApp: \`${waJid}\``,
                        { parse_mode: 'Markdown' }
                    ).catch(() => {});
                }
                }

                const _bo = wasReconnecting && !this._justPaired;
                this._justPaired = false;
                console.log(`[${this.chatId}] Connected ✅` + (_bo ? `  (back online after ${wasReconnecting} reconnect tr${wasReconnecting === 1 ? 'y' : 'ies'} - no restart needed)` : ''));
            }

            if (connection === 'close') {
                this._clearTimers();
                const err = lastDisconnect && lastDisconnect.error;
                const code = err && err.output && err.output.statusCode;
                const why = describeClose(code, err);
                const pairedNow = credsPaired(state.creds);
                if (pairedNow) { try { await saveCreds(); } catch {} }   // make sure the new login is on disk before reconnecting
                if (gen !== this._gen || this._stopped) return;

                // A) Not linked yet: the try failed or the code expired -> clean restart with a fresh code
                if (!pairedNow && needPairing) {
                    if (code === 403) {
                        return this._giveUp(`[+${numOf(id)}] ❌ ${why} -> wait a few hours, then type:  add   (do not retry again and again)`,
                            `❌ *PAIRING REFUSED*\n\nWhatsApp refused this number for now (403). Wait a few hours, then /pair again.`);
                    }
                    if (this._codesShown >= 2) this._altVersion = true;
                    if (this._codesShown >= MAX_PAIR_ATTEMPTS) return this._giveUpPairing();
                    if (codeShown && /Invalid account signature/i.test(String(why))) {
                        // WhatsApp accepted the code but refused the login itself. This is NOT a rate limit: waiting does not help.
                        this._sigFails = (this._sigFails || 0) + 1;
                        let ver = '';
                        try { ver = require('./lib/bootstrap').installedVersion('@whiskeysockets/baileys'); } catch (e) { /* unknown */ }
                        console.log(`[${id}] ❌ WhatsApp rejected the account signature ("Invalid account signature") - this is NOT a rate limit.\n` +
                            `   Installed WhatsApp library: ${ver || 'unknown'}\n` +
                            `   1) If it is older than 6.7.22, update it:   npm install @whiskeysockets/baileys@6.7 --allow-git=all   and start again.\n` +
                            `   2) A WhatsApp Business number that is linked to the Meta Business Platform / coexistence is refused by some library versions -> try a normal WhatsApp number, or the newest 6.7.x.`);
                        if (this._sigFails >= 2) {
                            return this._giveUp(`[+${numOf(id)}] ❌ Stopped: WhatsApp keeps rejecting the account signature. See the 2 possible fixes above.`,
                                '❌ *PAIRING REJECTED*\n\nWhatsApp rejected the login of this account ("Invalid account signature"). The bot owner must update the WhatsApp library, or use a normal (not Business-platform) number.');
                        }
                        return this._scheduleStart(phone, 3000);
                    }
                    if (codeShown) {
                        const aliveSec = Math.round((Date.now() - (this._codeAt || Date.now())) / 1000);
                        const serverDrop = !!code && code !== 428 && code !== 408;   // sent by WhatsApp, not a plain network loss
                        if (aliveSec < 25 && serverDrop) {
                            // WhatsApp itself dropped the connection seconds after giving the code = almost always a RATE LIMIT
                            this._quickDrops++;
                            if (this._quickDrops >= 3) {
                                return this._giveUp(
                                    `[+${numOf(id)}] ❌ WhatsApp keeps dropping the connection right after giving the code (${why}). It is refusing pairing codes for this number right now (too many code requests). -> fix: do NOT try again for 1-2 hours (every try makes the block longer), then start the bot once and type the NEWEST code quickly. Tip: switch between Wi-Fi and mobile data, turn off VPN.`,
                                    '❌ *PAIRING BLOCKED FOR NOW*\n\nWhatsApp refuses new codes for this number. Wait 1-2 hours, then /pair once.');
                            }
                            console.log(`[${id}] WhatsApp dropped the connection ${aliveSec}s after the code (${why}) - this usually means a rate limit. Waiting ${Math.round(QUICKDROP_WAIT_MS / 1000)}s before ONE more try (${this._quickDrops}/3)...`);
                            return this._scheduleStart(phone, QUICKDROP_WAIT_MS);
                        }
                        // a code was out for a while and the connection dropped (or the code expired) -> fresh code
                        console.log(`[${id}] Connection closed after the code was shown: ${why} -> creating a new code in 3s...`);
                        return this._scheduleStart(phone, 3000);
                    }
                    // Closed BEFORE a code existed = almost always internet trouble. No code was requested, so WhatsApp is not
                    // bothered: keep retrying (no limit) and continue by itself when the internet is back.
                    this._preFails++;
                    if (code === 405 && this._preFails >= 5) {
                        return this._giveUp(`[+${numOf(id)}] ❌ ${why} -> this WhatsApp version is rejected -> fix:  npm i @whiskeysockets/baileys@latest  then start again and type:  add`,
                            `❌ *PAIRING FAILED*\n\nWhatsApp rejected the library version (405). Update Baileys and try again.`);
                    }
                    // First tries are quick (a short internet drop). If it keeps failing, slow down: hammering WhatsApp
                    // every few seconds makes a number-level block LAST LONGER.
                    const waitPre = this._preFails <= 6 ? Math.min(3000 + this._preFails * 2000, 20000)
                        : Math.min(30000 * (this._preFails - 6), 5 * 60 * 1000);
                    if (this._preFails === 6) {
                        console.log(`[${id}] ⚠️ 6 failed tries in a row (${why}). If your internet works (open a website to check), then WhatsApp is refusing this number or this connection right now -> STOP trying for a few hours (every new try can extend the block). The bot now slows down by itself.`);
                    }
                    if (this._preFails >= 30 && MODE !== 'terminal') {
                        return this._giveUp(`[+${numOf(id)}] ❌ WhatsApp did not accept the connection after 30 tries (${why}) -> wait a few hours, then try again once`,
                            `❌ *PAIRING FAILED*\n\nWhatsApp is not accepting a connection for this number right now. Wait a few hours (do not retry again and again), then /pair once.`);
                    }
                    console.log(`[${id}] Cannot reach WhatsApp yet: ${why} -> trying again in ${Math.round(waitPre / 1000)}s (it continues by itself when the internet is back)`);
                    return this._scheduleStart(phone, waitPre);
                }

                // B) Real logout (the number was linked before and WhatsApp removed the device)
                if (code === DisconnectReason.loggedOut) {
                    this.stop();   // first end the old socket, THEN delete its folder (a late write of the old login must never reach the next pairing)
                    try { fs.rmSync(this.authPath, { recursive: true, force: true }); } catch {}
                    clearSessionSettings(this.chatId);
                    delete sessions[this.chatId];
                    // Terminal on a real screen: the saved login of this number was dead (device removed on the phone, or the bot was off
                    // when it happened). Do not make the user type "add" again: create a fresh pairing code by itself (once).
                    if (MODE === 'terminal' && process.stdin.isTTY && !this._everOpened && !autoRepaired.has(this.chatId)) {
                        autoRepaired.add(this.chatId);
                        console.log(`[+${numOf(this.chatId)}] ♻️ The saved login of this number is no longer valid (the linked device was removed in WhatsApp). The old session was deleted -> creating a FRESH pairing code now...`);
                        const num = numOf(this.chatId);
                        setTimeout(() => { addNumber(num).catch(e => console.log('Error:', e && e.message)); }, 1500);
                        return;
                    }
                    await tgBot.sendMessage(this.chatId,
`❌ *LOGGED OUT*

\`\`\`
Session ended on WhatsApp.
Use /pair to connect again.
\`\`\``,
                    { parse_mode: 'Markdown' }).catch(() => {});
                    this.stop();
                    delete sessions[this.chatId];
                    if (MODE === 'terminal') {
                        console.log(`♻️ ${this.chatId.replace('terminal-', '+')} was logged out from WhatsApp (the linked device was removed on the phone). To link it again, type in this terminal:  add`);
                    }
                    return;
                }

                // C) Same session open in two copies of the bot -> stop, otherwise both kick each other forever
                if (code === DisconnectReason.connectionReplaced) {
                    this.stop();
                    console.log(`[${id}] ⚠️ ${why} -> fix: close the other copy (Termux: "tmux kill-server" or "pkill -f node"), then start the bot once.`);
                    return;
                }

                // D) WhatsApp refused the number
                if (code === 403) {
                    console.log(`[${id}] ❌ ${why} -> the bot stays on and retries slowly every 10 minutes (do not restart it again and again).`);
                    return this._scheduleStart('', 10 * 60 * 1000);
                }

                // E) Everything else (network drop, 515 restart after pairing, server hiccup): reconnect
                this._reconnectCount = (this._reconnectCount || 0) + 1;
                if (MODE === 'telegram' && this._reconnectCount === 15) {
                    // one notice only - the bot never gives up by itself
                    await tgBot.sendMessage(this.chatId,
`⚠️ *CONNECTION UNSTABLE*

\`\`\`
Internet or WhatsApp is down.
The bot keeps trying and comes back by itself.
\`\`\``,
                    { parse_mode: 'Markdown' }).catch(() => {});
                }
                const wait = code === DisconnectReason.restartRequired ? 800 : Math.min(2000 + this._reconnectCount * 1000, 15000);
                console.log(`[${id}] Connection closed: ${why} -> reconnecting in ${Math.round(wait / 1000)}s (try ${this._reconnectCount})`);
                this._scheduleStart('', wait);
            }
        });

        // ── Messages ──
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            for (const msg of messages) {
                try {
                    if (!msg.message) continue;

                    cacheMessage(this.chatId, msg);   // anti-delete / anti-edit (a small cache per session)

                    if (msg.key.remoteJid === 'status@broadcast') {
                        await handleStatus(sock, msg, this.chatId);
                        continue;
                    }

                    await handleCommands(sock, msg, this.chatId);
                } catch (e) {
                    console.log('Msg Error:', e.message);
                }
            }
        });

        // ── Anti-Delete & Anti-Edit ──
        // WhatsApp reports "deleted for everyone" and "edited" through messages.update (not messages.delete).
        sock.ev.on('messages.update', async (updates) => {
            try {
                for (const u of updates || []) {
                    const key = u && u.key;
                    const upd = (u && u.update) || {};
                    if (!key || !key.id || !key.remoteJid) continue;

                    // Deleted for everyone (REVOKE = stub type 1, message becomes null)
                    if (upd.messageStubType === 1 || upd.message === null) {
                        await this._reportDeleted(sock, key);
                        continue;
                    }
                    // Edited
                    const edited = (upd.message && upd.message.editedMessage && upd.message.editedMessage.message)
                        || (upd.message && upd.message.protocolMessage && upd.message.protocolMessage.editedMessage);
                    if (edited) await this._reportEdited(sock, key, edited);
                }
            } catch (e) {
                console.log('Anti-edit/delete error:', e.message);
            }
        });

        sock.ev.on('messages.delete', async (item) => {
            try {
                const keys = (item && item.keys) || (item && item.key ? [item.key] : []);
                for (const key of keys) await this._reportDeleted(sock, key);
            } catch (e) {
                console.log('Anti-delete error:', e.message);
            }
        });

        // ── Group participants (Welcome + Goodbye) ──
        this.sock.ev.on('group-participants.update', async (update) => {
            try {
                const settings = getSessionSettings(this.chatId);
                const meta = await this.sock.groupMetadata(update.id);
                const wImg = settings.botImg || getBotImg();

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

// The bot works in PRIVATE chats only (in a group everybody could press someone else's buttons / log them out)
const isPrivate = m => !!(m && m.chat && m.chat.type === 'private');

tgBot.onText(/^\/start(?:@\w+)?(?:\s.*)?$/i, async (msg) => {
    if (!isPrivate(msg)) return;
    await sendHome(msg.chat.id);
});

tgBot.onText(/^\/help(?:@\w+)?$/i, async (msg) => {
    if (!isPrivate(msg)) return;
    const id = msg.chat.id;
    await tgBot.sendMessage(id,
`❓ *HELP — 𝐀𝐖𝐀𝐈𝐒 𝐌𝐃*

\`\`\`
/start     Main panel
/pair NUM  Connect WhatsApp
/status    Connection info
/logout    Disconnect
/setimage  Set menu banner (owner only)
/stats     Bot statistics (owner only)
/myid      Show your Telegram Chat ID
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

tgBot.onText(/^\/myid(?:@\w+)?$/i, async (msg) => {
    if (!isPrivate(msg)) return;
    const id = msg.chat.id;
    await tgBot.sendMessage(id,
`🆔 *Your Telegram Chat ID*

\`\`\`
${id}
\`\`\`

Copy this number and put it in .env as TELEGRAM_OWNER_CHAT_ID (or use the setup menu).`,
    { parse_mode: 'Markdown' });
});

const pairCooldown = new Map();   // chatId -> time of the last /pair (a user cannot hammer WhatsApp with code requests)

// Phone number of a running session (for the "already linked by someone else" check)
function sessionPhone(sess) {
    if (!sess) return '';
    if (sess._phone) return sess._phone;
    const c = readCreds(sess.authPath);
    return String((c && c.me && c.me.id) || '').split(':')[0].split('@')[0].replace(/\D/g, '');
}

tgBot.onText(/^\/pair(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
    if (!isPrivate(msg)) return;
    const id = msg.chat.id;
    const rawInput = String((match && match[1]) || '').trim();
    if (!rawInput) {
        await tgBot.sendMessage(id,
`🔗 *PAIR WHATSAPP*

Send your number with country code:

\`\`\`
/pair 92xxxxxxxxx
\`\`\`

Rules
\`\`\`
• Country code first (92 = Pakistan, 91 = India)
• Spaces, + and - are fine
• 03001234567 also works (Pakistan)
\`\`\``,
        { parse_mode: 'Markdown', reply_markup: pairKeyboard() });
        return;
    }
    const phone = cleanPhone(rawInput);   // accepts "+92 300 1234567", "0300-1234567", "92300..."
    if (!phone) {
        await tgBot.sendMessage(id,
`❌ *INVALID NUMBER*

\`\`\`
Use the country code first,
8-15 digits, not starting with 0.
Example: /pair 923001234567
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
    // This number is already linked by another Telegram user -> two copies would kick each other out forever (440)
    if (Object.keys(sessions).some(k => sessionPhone(sessions[k]) === phone)) {
        await tgBot.sendMessage(id, '⚠️ *NUMBER IN USE*\n\nThis WhatsApp number is already linked by another user of this bot.', { parse_mode: 'Markdown' });
        return;
    }
    const maxUsers = parseInt(process.env.MAX_TELEGRAM_USERS, 10) || 30;
    if (Object.keys(sessions).length >= maxUsers) {
        await tgBot.sendMessage(id, '⚠️ *BOT IS FULL*\n\nThis bot is serving the maximum number of users right now. Please try again later.', { parse_mode: 'Markdown' });
        return;
    }
    const wait = Math.ceil((30000 - (Date.now() - (pairCooldown.get(String(id)) || 0))) / 1000);
    if (wait > 0) {
        await tgBot.sendMessage(id, `⏳ Please wait ${wait}s before the next /pair (WhatsApp blocks numbers that ask for too many codes).`);
        return;
    }
    pairCooldown.set(String(id), Date.now());

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

tgBot.onText(/^\/status(?:@\w+)?$/i, async (msg) => {
    if (!isPrivate(msg)) return;
    await sendStatusCard(msg.chat.id);
});

tgBot.onText(/^\/(?:logout|stop)(?:@\w+)?$/i, async (msg) => {
    if (!isPrivate(msg)) return;
    const id = msg.chat.id;
    const s = sessions[id];
    if (s) { try { await s.logout(); } catch {} }   // also removes the linked device on WhatsApp
    else { try { fs.rmSync(path.join(CONFIG.SESSIONS_DIR, String(id)), { recursive: true, force: true }); } catch {} }
    await tgBot.sendMessage(id,
`🚪 *LOGGED OUT*

\`\`\`
Session cleared successfully.
Use /pair to connect again.
\`\`\``,
    { parse_mode: 'Markdown', reply_markup: mainKeyboard() });
});

tgBot.onText(/^\/stats(?:@\w+)?$/i, async (msg) => {
    if (!isPrivate(msg)) return;
    const id = msg.chat.id;
    if (!isTelegramOwner(id)) { await tgBot.sendMessage(id, '🔒 Only the bot owner can use /stats.'); return; }
    const ids = Object.keys(sessions);
    const online = ids.filter(k => sessions[k] && sessions[k].sock && sessions[k].sock.user).length;
    const mb = Math.round(process.memoryUsage().rss / 1048576);
    await tgBot.sendMessage(id,
`📈 *BOT STATS*

\`\`\`
Users linked : ${ids.length}
Online now   : ${online}
Max users    : ${parseInt(process.env.MAX_TELEGRAM_USERS, 10) || 30}
Memory       : ${mb} MB
Uptime       : ${menuUp()}
\`\`\``, { parse_mode: 'Markdown' });
});

tgBot.onText(/^\/setimage(?:@\w+)?(?:\s+(.+))?$/i, async (msg, match) => {
    if (!isPrivate(msg)) return;
    const id = msg.chat.id;
    if (!isTelegramOwner(id)) {
        await tgBot.sendMessage(id, '🔒 Only the bot owner can change the global banner image.');
        return;
    }
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
    if (!q.message || !q.message.chat || q.message.chat.type !== 'private') {   // old/inaccessible message or a group
        try { await tgBot.answerCallbackQuery(q.id); } catch {}
        return;
    }
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
        if (s) { try { await s.logout(); } catch {} }
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
/logout /setimage (owner)
/myid
\`\`\`

WhatsApp: \`.menu\`  \`.ai\``,
        { chat_id: id, message_id: mid, parse_mode: 'Markdown', reply_markup: backKeyboard() }).catch(() => {});
    }
});

// ── Telegram mode: start-up helpers ───────────────
// After a restart / crash / reboot every saved WhatsApp login must come back by itself (users must NOT have to /pair again)
function restoreTelegramSessions() {
    let dirs = [];
    try { dirs = fs.readdirSync(CONFIG.SESSIONS_DIR); } catch { return; }
    const numeric = dirs.filter(d => /^\d{5,15}$/.test(d));
    const ids = [];
    for (const d of numeric) {
        const dir = path.join(CONFIG.SESSIONS_DIR, d);
        const creds = readCreds(dir);
        if (credsPaired(creds)) ids.push(d);
        else if (creds || !fs.existsSync(path.join(dir, 'creds.json'))) {
            // unfinished pairing (code never entered): remove it, the user simply uses /pair again
            try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
        } else {
            console.log(`⚠️ [${d}] creds.json is unreadable - left untouched (the user can /logout and /pair again).`);
        }
    }
    if (!ids.length) return;
    console.log(`♻️ Restoring ${ids.length} saved WhatsApp session(s) (one every 1.5s, so the start is gentle on RAM and on WhatsApp)...`);
    let i = 0;
    const next = () => {
        if (i >= ids.length) return;
        const d = ids[i++];
        if (!sessions[d]) {
            const s = new Session(Number(d), { restored: true });
            sessions[d] = s;
            s.start('').catch(e => {
                console.log(`[${d}] Restore error: ${e && e.message} - trying again in 10s`);
                s._scheduleStart('', 10000);
            });
        }
        setTimeout(next, 1500);
    };
    next();
}

function notifyOwnerStarted() {
    if (!OWNER_CHAT_ID) return;
    tgBot.sendMessage(OWNER_CHAT_ID, '✅ *AWAIS X MD is online*\n\nSaved sessions reconnect by themselves. Use /stats for details.', { parse_mode: 'Markdown' })
        .catch(e => console.log(`⚠️ Could not message the owner (Chat ID ${OWNER_CHAT_ID}): ${String(e && e.message).slice(0, 90)}\n   -> open your bot in Telegram and press /start once, and check that the ID is YOUR user ID (@userinfobot).`));
}

// Downloaded/converted temp files older than 1 hour are removed (they pile up and fill a phone's storage)
function cleanTempFiles() {
    for (const dir of [CONFIG.TEMP_DIR, CONFIG.TMP_DIR]) {
        let names = [];
        try { names = fs.readdirSync(dir); } catch { continue; }
        for (const f of names) {
            if (f === '.gitkeep') continue;
            const p = path.join(dir, f);
            try { if (Date.now() - fs.statSync(p).mtimeMs > 60 * 60 * 1000) fs.rmSync(p, { recursive: true, force: true }); } catch {}
        }
    }
}

// ── Terminal mode: MULTI-NUMBER (several WhatsApp numbers on one device) ──
const MAX_NUMBERS = parseInt(process.env.MAX_NUMBERS, 10) || 5;
const TERM_PREFIX = 'terminal-';
const numOf = id => String(id).replace(/^(terminal|web)-/, '');
const autoRepaired = new Set();   // numbers that already got one automatic fresh pairing after a logout (no endless loop)

function isRegistered(authPath) { return isPairedOnDisk(authPath); }

// Old single-number layout (sessions/terminal) → sessions/terminal-<number>
function migrateLegacy() {
    try {
        const old = path.join(CONFIG.SESSIONS_DIR, 'terminal');
        const creds = JSON.parse(fs.readFileSync(path.join(old, 'creds.json'), 'utf8'));
        const num = String(creds?.me?.id || '').split(':')[0].split('@')[0].replace(/\D/g, '');
        if (credsPaired(creds) && num) {
            fs.renameSync(old, path.join(CONFIG.SESSIONS_DIR, TERM_PREFIX + num));
            console.log(`🔁 Old session +${num} was converted to the new format.`);
        }
    } catch {}
}

// Unfinished pairings (code requested, never entered) leave junk folders. Remove them at start so they are never
// mistaken for a saved number (that was the reason the bot paired a number "by itself" without asking).
function cleanLeftovers() {
    try {
        for (const d of fs.readdirSync(CONFIG.SESSIONS_DIR)) {
            if (!/^terminal-\d+$/.test(d)) continue;
            const dir = path.join(CONFIG.SESSIONS_DIR, d);
            const hasCreds = fs.existsSync(path.join(dir, 'creds.json'));
            const creds = hasCreds ? readCreds(dir) : null;
            if (hasCreds && !creds) { console.log(`⚠️ +${numOf(d)}: creds.json is unreadable - left untouched (type remove ${numOf(d)} if it never connects).`); continue; }
            if (!creds || !credsPaired(creds)) {
                try { fs.rmSync(dir, { recursive: true, force: true }); console.log(`🧹 Removed an unfinished pairing of +${numOf(d)} (never completed) - you will be asked for the number.`); } catch {}
            }
        }
    } catch {}
}
function savedNumbers() {
    try {
        return fs.readdirSync(CONFIG.SESSIONS_DIR)
            .filter(d => /^terminal-\d+$/.test(d) && isRegistered(path.join(CONFIG.SESSIONS_DIR, d)))
            .map(numOf);
    } catch { return []; }
}

function makeRl() {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.on('SIGINT', () => process.emit('SIGINT')); // CTRL+C must still stop the bot
    return rl;
}

async function askPhone(rl) {
    const own = !rl;
    rl = rl || makeRl();
    const ask = q => new Promise(r => rl.question(q, a => r((a || '').trim())));
    let phone = '';
    while (true) {
        const a = await ask('📱 Enter the WhatsApp number (with country code, no +)\n   Pakistan: 923001234567 | India: 919876543210   (empty Enter = cancel)\n   ➜ ');
        if (!a && !own) return '';
        phone = cleanPhone(a);
        if (phone) break;
        console.log('❌ Invalid phone number -> it must be 8-15 digits including the country code (no + or spaces) -> example: 923001234567\n');
    }
    if (own) rl.close();
    return phone;
}

// Connect one number (pair it first if it has no saved session)
async function addNumber(phone, quiet = false) {
    phone = cleanPhone(phone);
    if (!phone) { console.log('❌ Invalid phone number -> it must be 8-15 digits including the country code -> example: 923001234567'); return false; }
    const id = TERM_PREFIX + phone;
    if (sessions[id]) { console.log(`ℹ️ +${phone} is already running.`); return false; }
    if (Object.keys(sessions).length >= MAX_NUMBERS) {
        console.log(`❌ MAX_NUMBERS reached: only ${MAX_NUMBERS} numbers can run at the same time -> this protects your RAM -> remove a number (remove NUMBER) or raise MAX_NUMBERS in .env / npm run setup.`);
        return false;
    }
    const session = new Session(id);
    sessions[id] = session;
    const registered = isRegistered(session.authPath);
    if (!registered && !quiet) console.log(`⏳ Creating the pairing code for +${phone}, please wait...`);
    if (registered && !quiet) console.log(`✅ +${phone}: saved session found, connecting...`);
    await session.start(registered ? '' : phone);
    if (Object.keys(sessions).length > 3) console.log('⚠️ More than 3 numbers use a lot of RAM (about 70-100 MB per number).');
    return true;
}

async function removeNumber(phone) {
    phone = cleanPhone(phone);
    if (!phone) { console.log('❌ Invalid phone number -> use the full number with country code -> example: remove 923001234567'); return; }
    const id = TERM_PREFIX + phone;
    const s = sessions[id];
    if (s) { try { await s.logout(); } catch {} }   // also removes the linked device on WhatsApp
    const dir = path.join(CONFIG.SESSIONS_DIR, id);
    if (!s && !fs.existsSync(dir)) { console.log('❌ This number is not in the list -> it was never added or is already removed -> type list to see the numbers.'); return; }
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    console.log(`🗑️ +${phone} removed (session deleted). To link it again, type: add`);
}

function listNumbers() {
    const ids = Object.keys(sessions);
    if (!ids.length) return console.log('📭 No number is connected. Type:  add');
    console.log('\n📋 Numbers:');
    ids.forEach((id, i) => {
        const on = !!sessions[id]?.sock?.user;
        console.log(`  ${i + 1}) +${numOf(id)}  ${on ? '🟢 connected' : '🟡 connecting / pairing'}`);
    });
    console.log('');
}

const CONSOLE_HELP = `
┌──────────── TERMINAL COMMANDS ────────────┐
│ add            pair a new number           │
│ list           all numbers + status        │
│ remove NUMBER  remove a number (logout)    │
│ help           show this list again        │
│ CTRL+C         stop the bot                │
└────────────────────────────────────────────┘`;

// Commands typed while the bot is running
function startConsole() {
    if (!process.stdin.isTTY || global.__awaisConsole) return;
    const rl = makeRl();
    global.__awaisConsole = rl;
    console.log(CONSOLE_HELP);
    rl.on('line', async line => {
        const [cmd, arg] = line.trim().split(/\s+/);
        try {
            if (cmd === 'add') {
                const ph = cleanPhone(arg) || await askPhone(rl);
                if (ph) await addNumber(ph);
            } else if (cmd === 'list' || cmd === 'ls') listNumbers();
            else if (cmd === 'remove' || cmd === 'rm' || cmd === 'delete') {
                if (!arg) console.log('Use:  remove 923001234567'); else await removeNumber(arg);
            } else if (cmd === 'help' || cmd === '?') console.log(CONSOLE_HELP);
            else if (cmd) console.log('Unknown command. Type: help');
        } catch (e) { console.log('Error:', e.message); }
    });
}

async function startTerminal() {
    migrateLegacy();
    cleanLeftovers();
    const saved = savedNumbers();
    const wantAdd = process.argv.slice(2).includes('--add');

    // Numbers queued by the launcher menu (pair them in order after the saved ones)
    const queued = Array.from(new Set((global.__awaisQueuedNumbers || []).map(cleanPhone).filter(n => n && !saved.includes(n))));

    if (saved.length) {
        console.log(`✅ Found ${saved.length} saved number(s): ${saved.map(n => '+' + n).join(', ')}`);
        for (const n of saved) { await addNumber(n, true); await new Promise(r => setTimeout(r, 1500)); }
    } else if (!queued.length) {
        let phone = cleanPhone(process.env.WHATSAPP_NUMBER);
        if (!phone) {
            if (!process.stdin.isTTY) {
                console.log('❌ No WhatsApp number to pair -> WHATSAPP_NUMBER is missing in .env and this run cannot ask questions -> set WHATSAPP_NUMBER in .env, or run in an interactive terminal: npm run terminal');
                process.exit(2);
            }
            phone = await askPhone();
        }
        await addNumber(phone);
    }
    for (const n of queued) { await addNumber(n); await new Promise(r => setTimeout(r, 1500)); }

    startConsole();
    if (wantAdd && saved.length && process.stdin.isTTY) {
        const ph = await askPhone(global.__awaisConsole);
        if (ph) await addNumber(ph);
    }

    if (!global.__awaisHeartbeat) {
        global.__awaisHeartbeat = setInterval(() => {
            const ids = Object.keys(sessions);
            const on = ids.filter(id => sessions[id]?.sock?.user).length;
            console.log(`[alive] ${new Date().toLocaleTimeString()} | numbers: ${on}/${ids.length} connected | uptime: ${menuUp()}`);
        }, 10 * 60 * 1000);
    }
}
function menuUp() {
    const up = process.uptime();
    return `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`;
}

// ── Web Pair mode ─────────────────────────────────
async function startWeb() {
    const { startWebServer } = require('./lib/webserver');
    const WEB_PREFIX = 'web-';

    // Load any already-paired web sessions so they stay connected
    try {
        for (const d of fs.readdirSync(CONFIG.SESSIONS_DIR)) {
            if (!d.startsWith(WEB_PREFIX)) continue;
            const dir = path.join(CONFIG.SESSIONS_DIR, d);
            if (!isPairedOnDisk(dir)) {
                if (readCreds(dir) || !fs.existsSync(path.join(dir, 'creds.json'))) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }   // unfinished pairing
                continue;
            }
            const id = d;
            if (sessions[id]) continue;
            const session = new Session(id);
            sessions[id] = session;
            console.log(`✅ Restoring web session ${id}...`);
            session._announced = true;   // no "connected" message again after a restart
            session.start('').catch(e => { console.log(`[${id}] restore error: ${e && e.message} - trying again in 10s`); session._scheduleStart('', 10000); });
            await new Promise(r => setTimeout(r, 1200));
        }
    } catch {}

    startWebServer({
        // null = ok, otherwise a message for the website visitor
        canAccept(phone) {
            const id = WEB_PREFIX + phone;
            if (sessions[id] && sessions[id].sock && sessions[id].sock.user) return null;   // already connected: nothing new to start
            const max = parseInt(process.env.MAX_WEB_SESSIONS, 10) || 30;
            const count = Object.keys(sessions).filter(k => k.startsWith(WEB_PREFIX)).length;
            return count >= max ? 'This server is full right now (' + max + ' numbers connected). Please try again later.' : null;
        },
        stats() {
            const ids = Object.keys(sessions).filter(k => k.startsWith(WEB_PREFIX));
            return { numbers: ids.length, online: ids.filter(k => sessions[k].sock && sessions[k].sock.user).length };
        },
        startPairing(phone, jobId, pairJobs) {
            const id = WEB_PREFIX + phone;
            // If already running and connected, just mark job done
            if (sessions[id] && sessions[id].sock && sessions[id].sock.user) {
                const job = pairJobs.get(jobId);
                if (job) { job.status = 'connected'; }
                return;
            }
            // Stop any half-open session for this number
            if (sessions[id]) {
                try { sessions[id].stop(); } catch {}
                delete sessions[id];
            }
            const session = new Session(id);
            sessions[id] = session;

            // Hook into the session's code display and connection events via temporary overrides
            const origSend = session._notify || (() => {});
            // We intercept by patching after start begins – use a simple poller instead
            let lastCode = null;
            const codeWatcher = setInterval(() => {
                const job = pairJobs.get(jobId);
                if (!job || job.status === 'connected' || job.status === 'error') {
                    clearInterval(codeWatcher);
                    return;
                }
                // Read the latest code from session internal state if available
                if (session._lastPairCode && session._lastPairCode !== lastCode) {
                    lastCode = session._lastPairCode;
                    job.status = 'code';
                    job.code = lastCode;
                }
                if (session.sock && session.sock.user) {
                    job.status = 'connected';
                    clearInterval(codeWatcher);
                }
            }, 1000);

            // Also listen for connection open
            const checkConnected = setInterval(() => {
                const job = pairJobs.get(jobId);
                if (!job) { clearInterval(checkConnected); return; }
                if (session.sock && session.sock.user) {
                    job.status = 'connected';
                    clearInterval(checkConnected);
                    clearInterval(codeWatcher);
                }
                if (session._stopped || session._gaveUp) {
                    if (job.status !== 'connected') {
                        job.status = 'error';
                        job.message = session._failMsg || 'Pairing failed or timed out. Wait a few minutes and try again.';
                    }
                    clearInterval(checkConnected);
                    clearInterval(codeWatcher);
                }
            }, 2000);

            session.start(phone).catch(e => {
                const job = pairJobs.get(jobId);
                if (job) {
                    job.status = 'error';
                    job.message = (e && e.message) || 'Connection failed';
                }
                clearInterval(codeWatcher);
                clearInterval(checkConnected);
            });
        }
    });

    console.log('Web Pair mode ready. Users can open the website and pair numbers.');
    console.log('Sessions stay connected in the background. Press CTRL+C to stop.');
}

// ── Start ─────────────────────────────────────────
console.log('🚀 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT starting...  [mode: ' + MODE + ']');
console.log('Auto Status Seen + React + Autoreacts + Autotyping ON by default.');
cleanTempFiles();
setInterval(cleanTempFiles, 30 * 60 * 1000).unref();
if (MODE === 'telegram') {
    console.log('Telegram premium panel ready. /start for buttons.');
    restoreTelegramSessions();
    notifyOwnerStarted();
} else if (MODE === 'web') {
    console.log('Web Pair mode: professional pairing website for multiple users.');
    startWeb().catch(e => { console.error('❌ Web start error: ' + e.message + ' -> run again with DEBUG=1 for details'); if (process.env.DEBUG === '1') console.error(e.stack); process.exit(1); });
} else {
    console.log('Terminal mode (multi-number): no Telegram bot needed. Press CTRL+C to stop.');
    startTerminal().catch(e => { console.error('❌ Start error: ' + e.message + ' -> run again with DEBUG=1 for details'); if (process.env.DEBUG === '1') console.error(e.stack); process.exit(1); });
}

// Exposed for the automatic tests only (the bot itself is started by index.js)
module.exports = { addNumber, removeNumber, sessions };
