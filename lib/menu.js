/**
 * Interactive launcher menu (only used in an interactive terminal).
 * Every choice is saved to .env automatically. Secrets are never printed in full.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');
const { spawnSync } = require('child_process');
const env = require('./env');
const ui = require('./ui');
const bootstrap = require('./bootstrap');
const { c } = ui;

const SESSIONS_DIR = path.join(env.ROOT, 'sessions');
const TERM_PREFIX = 'terminal-';

// ───────────────────────── state helpers ─────────────────────────
function maxNumbers() { return parseInt(env.get('MAX_NUMBERS'), 10) || 5; }

function currentMode() {
    const m = env.get('BOT_MODE').toLowerCase();
    return m === 'telegram' || m === 'terminal' || m === 'web' ? m : '';
}

// "Linked" = WhatsApp accepted the pairing (creds.account / device id "number:device@..."). creds.registered is NOT
// usable: current Baileys sets it to true as soon as a pairing CODE is requested, so an unfinished pairing would
// look like a saved number (it was then reused without asking for the number).
function isRegistered(dir) {
    try {
        const c = JSON.parse(fs.readFileSync(path.join(dir, 'creds.json'), 'utf8'));
        return !!(c.account || /:\d+@/.test(String((c.me && c.me.id) || '')));
    } catch (e) { return false; }
}

// Paired numbers = sessions/terminal-<number>/ whose creds.json shows an accepted pairing
function savedNumbers() {
    try {
        return fs.readdirSync(SESSIONS_DIR)
            .filter(d => /^terminal-\d+$/.test(d) && isRegistered(path.join(SESSIONS_DIR, d)))
            .map(d => d.slice(TERM_PREFIX.length));
    } catch (e) { return []; }
}

// Numbers waiting to be paired on the next start (read by startTerminal() in awaismain.js)
function queue() {
    if (!Array.isArray(global.__awaisQueuedNumbers)) global.__awaisQueuedNumbers = [];
    return global.__awaisQueuedNumbers;
}

function allNumbers() { return Array.from(new Set(savedNumbers().concat(queue()))); }

function isReady() {
    const m = currentMode();
    if (m === 'terminal' || m === 'web') return true;
    if (m === 'telegram') {
        return env.tokenOk(env.get('TELEGRAM_BOT_TOKEN')) && env.chatIdOk(env.get('TELEGRAM_OWNER_CHAT_ID'));
    }
    return false;
}

// Save to .env; on failure show the error and keep the value for this run only
function save(values) {
    try { env.set(values); return true; } catch (e) {
        const h = env.writeErrorHelp(e);
        ui.fail('Could not save .env', h[0], h[1]);
        ui.warn('The value is used for this run only (it was NOT saved).');
        return false;
    }
}

// ───────────────────────── prompts ─────────────────────────
function createPrompter() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let muted = false;
    let closing = false;
    const write = rl._writeToOutput;
    rl._writeToOutput = function (s) { write.call(rl, muted ? String(s).replace(/[^\r\n]/g, '*') : s); };
    rl.on('SIGINT', () => { console.log('\nCancelled (CTRL+C).'); process.exit(130); });
    rl.on('close', () => { if (!closing) { console.log('\nInput closed. Bye.'); process.exit(0); } });

    const ask = q => new Promise(res => rl.question(q, a => res(String(a || '').trim())));
    // Secret input: echoed as ***
    const secret = q => new Promise(res => {
        process.stdout.write(q);
        muted = true;
        rl.question('', a => { muted = false; res(String(a || '').trim().replace(/^["']|["']$/g, '')); });
    });
    const yesNo = async (q, def) => {
        while (true) {
            const a = (await ask(q + (def ? ' (Y/n): ' : ' (y/N): '))).toLowerCase();
            if (!a) return !!def;
            if (a === 'y' || a === 'yes') return true;
            if (a === 'n' || a === 'no') return false;
            console.log('Please answer y or n.');
        }
    };
    const close = () => { closing = true; rl.close(); };
    return { ask, secret, yesNo, close };
}

function width() { return Math.max(20, Math.min((process.stdout.columns || 80) - 1, 60)); }
function title(t) {
    console.log('\n' + c.purple('─'.repeat(width())));
    console.log(c.bold(' ' + t));
    console.log(c.purple('─'.repeat(width())));
}

function badPhone(a) {
    ui.fail('Invalid phone number: "' + a + '"', 'a number must be 8-15 digits including the country code (it cannot start with 0; +, spaces and - are removed)',
        'Example: 923001234567 (Pakistan) or 919876543210 (India). 03001234567 also works for Pakistan.');
}

async function askNumber(p, label) {
    while (true) {
        const a = await p.ask((label || 'WhatsApp number') + ' (country code, digits only, no +; Enter = cancel)\n  > ');
        if (!a) return '';
        const n = env.cleanPhone(a);
        if (n) return n;
        badPhone(a);
    }
}

// ───────────────────────── numbers ─────────────────────────
// Add a number to the "pair on next start" queue. Returns true if it will be used.
function queueNumber(n) {
    const all = allNumbers();
    const max = maxNumbers();
    if (!all.includes(n) && all.length >= max) {
        ui.fail('MAX_NUMBERS reached (limit: ' + max + ' numbers)', 'one device can run only ' + max + ' numbers at the same time (each uses about 70-100 MB RAM)',
            ['Remove a number:   menu 5 -> remove', 'Or raise the limit: menu 5 -> change max numbers']);
        return false;
    }
    if (savedNumbers().includes(n)) ui.info('+' + n + ' is already paired. It will reconnect on start.');
    else if (queue().includes(n)) ui.info('+' + n + ' is already in the pairing queue.');
    else {
        queue().push(n);
        ui.ok('+' + n + ' queued. Its pairing code will be shown here when the bot starts (menu option 1).');
        if (all.length + 1 > 3) ui.warn('More than 3 numbers need a lot of RAM (about 70-100 MB each).');
    }
    return true;
}

// Terminal-mode numbers only make sense in Terminal mode
async function ensureTerminalMode(p) {
    if (currentMode() === 'terminal') return true;
    if (currentMode() === 'telegram') {
        const sw = await p.yesNo('Current mode is Telegram. Switch to Terminal mode?', true);
        if (!sw) return false;
    }
    save({ BOT_MODE: 'terminal' });
    return true;
}

async function actTerminal(p) {
    title('TERMINAL MODE (personal, no Telegram bot)');
    console.log(' The pairing code is shown right here in this terminal.');
    console.log(' On your phone: WhatsApp > Linked Devices > Link a Device');
    console.log(' > "Link with phone number instead".\n');
    const n = await askNumber(p);
    if (!n) return console.log('Cancelled.');
    if (!queueNumber(n)) return;
    save({ BOT_MODE: 'terminal', WHATSAPP_NUMBER: n });
    if (await p.yesNo('Start the bot now?', true)) return 'start';
}

function listNumbers() {
    const saved = savedNumbers();
    const q = queue().filter(n => !saved.includes(n));
    const rows = saved.map(n => ({ n, tag: 'paired' })).concat(q.map(n => ({ n, tag: 'queued - pairs on start' })));
    if (!rows.length) { console.log(c.dim('  No numbers yet. Use "Add number".')); return rows; }
    rows.forEach((r, i) => console.log('  ' + (i + 1) + ') +' + r.n + '  ' + c.dim('[' + r.tag + ']')));
    console.log(c.dim('  ' + rows.length + ' of max ' + maxNumbers()));
    return rows;
}

async function removeNumber(p) {
    const rows = listNumbers();
    if (!rows.length) return;
    const a = await p.ask('Number to remove (list number or full number; Enter = cancel): ');
    if (!a) return console.log('Cancelled.');
    let n = '';
    if (/^\d{1,2}$/.test(a) && rows[parseInt(a, 10) - 1]) n = rows[parseInt(a, 10) - 1].n;
    else n = env.cleanPhone(a);
    if (!n) return badPhone(a);
    const dir = path.join(SESSIONS_DIR, TERM_PREFIX + n);
    const inQueue = queue().includes(n);
    if (!fs.existsSync(dir) && !inQueue) {
        return ui.fail('Number +' + n + ' is not in the list', 'it was never added or it is already removed', 'Choose "list" to see the saved numbers.');
    }
    if (!(await p.yesNo('Delete the session of +' + n + '? This cannot be undone', false))) return console.log('Cancelled.');
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {
        return ui.fail('Could not delete the session folder of +' + n, e.message, 'Close any program using sessions/' + TERM_PREFIX + n + ' and try again.');
    }
    global.__awaisQueuedNumbers = queue().filter(x => x !== n);
    if (env.get('WHATSAPP_NUMBER') === n) save({ WHATSAPP_NUMBER: '' });
    ui.ok('+' + n + ' removed. (Also remove the device in WhatsApp > Linked Devices if it is still listed.)');
}

async function changeMax(p) {
    console.log(' Current limit: ' + maxNumbers() + '  (allowed: 1-10, default 5)');
    while (true) {
        const a = await p.ask('New limit (Enter = cancel): ');
        if (!a) return console.log('Cancelled.');
        const v = parseInt(a, 10);
        if (!/^\d+$/.test(a) || v < 1 || v > 10) {
            ui.fail('Invalid limit: "' + a + '"', 'the limit must be a whole number from 1 to 10', 'Enter for example 3 or 5.');
            continue;
        }
        if (v > 3) {
            ui.warn('RAM warning: every number uses about 70-100 MB. ' + v + ' numbers can need ' + v * 100 + ' MB or more.');
            if (!(await p.yesNo('Use ' + v + ' anyway?', false))) continue;
        }
        if (allNumbers().length > v) ui.warn('You already have ' + allNumbers().length + ' numbers: the extra ones will not connect until you remove some.');
        if (save({ MAX_NUMBERS: String(v) })) ui.ok('MAX_NUMBERS = ' + v + ' saved.');
        return;
    }
}

async function actNumbers(p) {
    while (true) {
        title('MANAGE NUMBERS (Terminal mode)');
        console.log('  1) Add number');
        console.log('  2) List numbers');
        console.log('  3) Remove number');
        console.log('  4) Change max numbers (now ' + maxNumbers() + ')');
        console.log('  5) Back');
        const a = await p.ask('Choose (1-5): ');
        try {
            if (a === '1') {
                if (!(await ensureTerminalMode(p))) continue;
                const n = await askNumber(p);
                if (n) queueNumber(n);
            } else if (a === '2') { console.log(''); listNumbers(); }
            else if (a === '3') await removeNumber(p);
            else if (a === '4') await changeMax(p);
            else if (a === '5') return;
            else console.log(c.red('Invalid choice "' + a + '". Enter a number from 1 to 5.'));
        } catch (e) { ui.fail('This action failed', ui.errText(e), 'Try again. Run with DEBUG=1 for details.'); }
    }
}

// ───────────────────────── telegram ─────────────────────────
/**
 * Set/change the Telegram bot token (validated), optional owner number.
 * opts.askStart: ask "start now?" at the end.  Returns 'start' | true (saved) | false (cancelled).
 */
async function telegramSetup(p, opts) {
    opts = opts || {};
    let own = false;
    if (!p) { p = createPrompter(); own = true; }
    try {
        title('TELEGRAM BOT MODE (multi-user)');
        console.log(' Many people can link their WhatsApp with /pair in your bot.');
        console.log(' How to get a token:');
        console.log('   1) Open Telegram and search @BotFather');
        console.log('   2) Send /newbot and choose a name + username');
        console.log('   3) Copy the token (123456789:AAxxxx...) and paste it here');
        console.log(c.dim(' (what you type is hidden)\n'));

        const cur = env.get('TELEGRAM_BOT_TOKEN');
        let token = '';
        if (env.tokenOk(cur)) {
            console.log(' Current token: ' + env.mask(cur));
            const a = await p.ask(' Press Enter to keep it, or type "new" to change it: ');
            if (a.toLowerCase() !== 'new') token = cur;
        }
        while (!token) {
            const t = await p.secret('Telegram Bot Token (Enter = cancel): ');
            if (!t) { console.log('\nCancelled.'); return false; }
            if (!env.tokenOk(t)) {
                ui.fail('Invalid token format', 'a token looks like 123456789:AAH-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (digits, colon, 30+ characters)',
                    'Copy the full token again from @BotFather (/mybots -> your bot -> API Token).');
                continue;
            }
            process.stdout.write('Checking token with Telegram... ');
            const v = await env.verifyToken(t);
            if (v.ok === false) {
                console.log('rejected.');
                ui.fail('Telegram rejected this token', 'the token has a typo, was revoked, or belongs to a deleted bot',
                    ['Copy it again from @BotFather, or create a new one with /newbot (or /revoke).']);
                continue;
            }
            if (v.ok === null) {
                console.log('could not check.');
                ui.fail('Telegram is unreachable (' + v.code + ')', 'no internet, DNS problem, or Telegram is blocked on this network',
                    ['Check your internet connection (a VPN may be needed in some countries).', 'The token format looks fine, so you can still save it now.']);
                if (!(await p.yesNo('Save this token without checking it?', false))) continue;
            } else {
                console.log('OK' + (v.username ? ' (bot: @' + v.username + ')' : ''));
            }
            token = t;
        }
        const ok1 = save({ TELEGRAM_BOT_TOKEN: token, BOT_MODE: 'telegram' });

        // Owner Telegram Chat ID (required for security + admin controls)
        const curChat = env.get('TELEGRAM_OWNER_CHAT_ID');
        console.log('\n Owner Telegram Chat ID (REQUIRED for security):');
        console.log('   This is YOUR Telegram user ID. Only this ID gets admin powers.');
        console.log('   How to get it: open Telegram → search @userinfobot or @getidsbot → Start → it replies your ID.');
        console.log('   Then open YOUR new bot in Telegram and press Start once (otherwise it cannot message you).');
        let chatId = '';
        if (env.chatIdOk(curChat)) {
            console.log(' Current Chat ID: ' + curChat);
            const a = await p.ask(' Press Enter to keep it, or type a new ID: ');
            if (!a) chatId = curChat;
            else chatId = a;
        }
        while (!env.chatIdOk(chatId)) {
            if (chatId) ui.fail('Invalid Chat ID', '"' + chatId + '" is not a valid Telegram user ID', 'It must be your numeric USER id: digits only (5-15), no minus sign. Example: 987654321');
            const t = await p.ask(' Owner Telegram Chat ID (numbers only, Enter = cancel): ');
            if (!t) { console.log('\nCancelled.'); return false; }
            chatId = t.trim();
        }
        const okChat = save({ TELEGRAM_OWNER_CHAT_ID: chatId });

        const curOwner = env.get('OWNER_NUMBER');
        console.log('\n Owner WhatsApp number (optional): the number that can use owner-only commands on WhatsApp.');
        const o = await p.ask(' Number with country code, no + ' + (curOwner ? '(now +' + curOwner + ', Enter = keep)' : '(Enter = skip)') + ': ');
        if (o) {
            const n = env.cleanPhone(o);
            if (n) save({ OWNER_NUMBER: n }); else badPhone(o);
        }
        if (ok1 && okChat) ui.ok('Telegram mode saved (token + owner Chat ID).');
        else if (ok1) ui.ok('Telegram token saved.');
        if (opts.askStart && await p.yesNo('\nStart the bot now?', true)) return 'start';
        return true;
    } finally { if (own) p.close(); }
}

// ───────────────────────── settings ─────────────────────────
async function settingGemini(p) {
    const cur = env.get('GEMINI_API_KEY');
    console.log('\n Gemini API key (for .ai .gpt .gemini .ask). Free key: https://aistudio.google.com/apikey');
    console.log(' Status: ' + (cur ? 'set (' + env.mask(cur) + ')' : 'not set'));
    console.log('  1) ' + (cur ? 'Change key' : 'Set key'));
    console.log('  2) Remove key');
    console.log('  3) Skip');
    const a = await p.ask('Choose (1-3): ');
    if (a === '1') {
        while (true) {
            const k = await p.secret('Gemini API key (hidden, Enter = cancel): ');
            if (!k) return console.log('\nCancelled.');
            if (k.length < 20 || /\s/.test(k)) {
                ui.fail('That does not look like a Gemini API key', 'keys are long (about 39 characters, usually start with AIza) and have no spaces', 'Create or copy a key at https://aistudio.google.com/apikey');
                continue;
            }
            if (save({ GEMINI_API_KEY: k })) ui.ok('Gemini key saved (' + env.mask(k) + ').');
            return;
        }
    } else if (a === '2') {
        if (save({ GEMINI_API_KEY: '' })) ui.ok('Gemini key removed. AI commands will not work until you add one.');
    } else if (a !== '3') console.log(c.red('Invalid choice "' + a + '".'));
}

async function settingOwner(p) {
    const cur = env.get('OWNER_NUMBER');
    console.log('\n Owner WhatsApp number (digits only, country code, no +). Current: ' + (cur ? '+' + cur : 'not set (the bot default applies)'));
    while (true) {
        const a = await p.ask('New number (Enter = cancel, "clear" = remove): ');
        if (!a) return console.log('Cancelled.');
        if (a.toLowerCase() === 'clear') { if (save({ OWNER_NUMBER: '' })) ui.ok('Owner number removed.'); return; }
        const n = env.cleanPhone(a);
        if (!n) { badPhone(a); continue; }
        if (save({ OWNER_NUMBER: n })) ui.ok('Owner number saved: +' + n);
        return;
    }
}

async function settingModel(p) {
    const cur = env.get('GEMINI_MODEL');
    console.log('\n Gemini model (optional; empty = automatic). Current: ' + (cur || 'automatic'));
    const a = await p.ask('Model name (Enter = cancel, "clear" = automatic): ');
    if (!a) return console.log('Cancelled.');
    if (a.toLowerCase() === 'clear') { if (save({ GEMINI_MODEL: '' })) ui.ok('Model set to automatic.'); return; }
    if (!/^[A-Za-z0-9._\-\/]+$/.test(a)) return ui.fail('Invalid model name', 'model names contain only letters, digits and . _ - /', 'Example: gemini-2.0-flash');
    if (save({ GEMINI_MODEL: a })) ui.ok('Model saved: ' + a);
}

async function settingTelegramOwner(p) {
    const cur = env.get('TELEGRAM_OWNER_CHAT_ID');
    console.log('\n Owner Telegram Chat ID (for admin powers + notifications).');
    console.log(' Current: ' + (env.chatIdOk(cur) ? cur : 'not set'));
    console.log(' How to get: Telegram → @userinfobot or @getidsbot → Start → copy the number.');
    while (true) {
        const a = await p.ask('New Chat ID (Enter = cancel, "clear" = remove): ');
        if (!a) return console.log('Cancelled.');
        if (a.toLowerCase() === 'clear') { if (save({ TELEGRAM_OWNER_CHAT_ID: '' })) ui.ok('Owner Chat ID removed.'); return; }
        if (!env.chatIdOk(a.trim())) {
            ui.fail('Invalid Chat ID', '"' + a + '" must be numbers only (5-15 digits)', 'Example: 123456789');
            continue;
        }
        if (save({ TELEGRAM_OWNER_CHAT_ID: a.trim() })) ui.ok('Owner Chat ID saved: ' + a.trim());
        return;
    }
}

async function actSettings(p) {
    while (true) {
        title('SETTINGS');
        console.log('  1) Gemini API key');
        console.log('  2) Owner WhatsApp number');
        console.log('  3) Telegram Owner Chat ID');
        console.log('  4) Gemini model (optional)');
        console.log('  5) Back');
        const a = await p.ask('Choose (1-5): ');
        try {
            if (a === '1') await settingGemini(p);
            else if (a === '2') await settingOwner(p);
            else if (a === '3') await settingTelegramOwner(p);
            else if (a === '4') await settingModel(p);
            else if (a === '5') return;
            else console.log(c.red('Invalid choice "' + a + '". Enter a number from 1 to 5.'));
        } catch (e) { ui.fail('This action failed', ui.errText(e), 'Try again. Run with DEBUG=1 for details.'); }
    }
}

// ───────────────────────── doctor ─────────────────────────
function findFfmpeg() {
    const fp = env.get('FFMPEG_PATH');
    if (fp) return fs.existsSync(fp) ? 'FFMPEG_PATH (' + fp + ')' : '';
    try { if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0) return 'system ffmpeg'; } catch (e) { /* not found */ }
    try { const f = require('ffmpeg-static'); if (f && fs.existsSync(f)) return 'ffmpeg-static'; } catch (e) { /* not installed */ }
    return '';
}

function reachTelegram() {
    return new Promise(res => {
        const req = https.get('https://api.telegram.org', { timeout: 6000 }, r => { r.resume(); res(true); });
        req.on('timeout', () => { req.destroy(); res(false); });
        req.on('error', () => res(false));
    });
}

async function doctor() {
    title('SYSTEM CHECK (doctor)');
    const row = (good, label, text, hint) => {
        console.log((good === true ? c.green('✔') : good === false ? c.red('✖') : c.yellow('⚠')) + ' ' + label.padEnd(10) + ' ' + text);
        if (hint) console.log('             ' + c.dim(hint));
    };
    const major = parseInt(process.versions.node, 10);
    row(major >= 18, 'Node.js', 'v' + process.versions.node, major >= 18 ? '' : 'Need 18+. Install Node.js LTS.');
    const miss = bootstrap.missingPackages();
    row(!miss.length, 'Packages', miss.length ? 'missing: ' + miss.join(', ') : 'all ' + bootstrap.REQUIRED.length + ' installed', miss.length ? 'Run: npm install' : '');
    const ff = findFfmpeg();
    const hint = bootstrap.isTermux() ? 'Termux: pkg install ffmpeg' : process.platform === 'win32' ? 'Windows: winget install Gyan.FFmpeg' : process.platform === 'darwin' ? 'macOS: brew install ffmpeg' : 'Linux: sudo apt-get install ffmpeg';
    row(ff ? true : null, 'ffmpeg', ff || 'not found (stickers/audio/video commands need it)', ff ? '' : hint);
    if (bootstrap.isTermux()) {
        const w = spawnSync('sh', ['-c', 'command -v termux-wake-lock'], { encoding: 'utf8' });
        const has = !!(w.stdout || '').trim();
        row(has ? true : null, 'Wake-lock', has ? 'termux-wake-lock available' : 'not available', has ? '' : 'Run: pkg install termux-api  (and install the Termux:API app)');
    } else row(true, 'Wake-lock', 'not needed (not Termux)');
    const mode = currentMode();
    row(mode ? true : null, 'Mode', mode || 'not set', mode ? '' : 'Choose option 2, 3 or 4 in the menu.');
    const saved = savedNumbers();
    row(true, 'Numbers', saved.length ? saved.map(n => '+' + n).join(', ') + '  (max ' + maxNumbers() + ')' : 'none paired yet  (max ' + maxNumbers() + ')');
    const tok = env.get('TELEGRAM_BOT_TOKEN');
    row(env.tokenOk(tok) ? true : (mode === 'telegram' ? false : null), 'TG token', env.tokenOk(tok) ? 'set (' + env.mask(tok) + ')' : 'not set');
    const ocid = env.get('TELEGRAM_OWNER_CHAT_ID');
    row(env.chatIdOk(ocid) ? true : (mode === 'telegram' ? false : null), 'TG owner', env.chatIdOk(ocid) ? ocid : 'not set (required for Telegram mode)');
    const gk = env.get('GEMINI_API_KEY');
    row(gk ? true : null, 'Gemini', gk ? 'key set (' + env.mask(gk) + ')' : 'not set (AI commands disabled)');
    let writable = true;
    try { fs.existsSync(env.ENV_PATH) ? fs.accessSync(env.ENV_PATH, fs.constants.W_OK) : fs.accessSync(env.ROOT, fs.constants.W_OK); } catch (e) { writable = false; }
    row(writable, '.env', writable ? 'writable' : 'NOT writable', writable ? '' : 'Run: chmod u+rw .env');
    process.stdout.write(c.dim('  checking Telegram connection...'));
    const net = await reachTelegram();
    process.stdout.write('\r\x1b[K');
    row(net ? true : null, 'Internet', net ? 'Telegram reachable' : 'Telegram not reachable', net ? '' : 'Telegram mode needs it; WhatsApp may still work.');
}

// ───────────────────────── web pair setup ─────────────────────────
async function webSetup(p, opts) {
    opts = opts || {};
    let own = false;
    if (!p) { p = createPrompter(); own = true; }
    try {
        title('WEB PAIR MODE (multi-user website)');
        console.log(' A professional pairing website will run on this device.');
        console.log(' Multiple users can open the link and pair their WhatsApp numbers.');
        console.log('');
        console.log(' Default port: 3000  (change with WEB_PORT=xxxx in .env)');
        console.log(' For a public link on Termux:');
        console.log('   npx cloudflared tunnel --url http://localhost:3000');
        console.log('   (gives a free random subdomain, works 24/7 while tunnel is running)');
        console.log('');
        const port = env.get('WEB_PORT') || '3000';
        const a = await p.ask(' Web port (Enter = ' + port + '): ');
        const chosen = (a && /^\d{2,5}$/.test(a)) ? a : port;
        save({ BOT_MODE: 'web', WEB_PORT: chosen });
        ui.ok('Web Pair mode saved (port ' + chosen + ').');
        if (opts.askStart && await p.yesNo('\nStart the web pair server now?', true)) return 'start';
        return true;
    } finally { if (own) p.close(); }
}

// ───────────────────────── main menu ─────────────────────────
function showMenu() {
    const mode = currentMode();
    const tok = env.get('TELEGRAM_BOT_TOKEN');
    const ocid = env.get('TELEGRAM_OWNER_CHAT_ID');
    const gk = env.get('GEMINI_API_KEY');
    title('MAIN MENU');
    console.log(c.dim('  Mode: ' + (mode || 'not set') + '  |  Numbers: ' + allNumbers().length + '/' + maxNumbers()));
    console.log(c.dim('  Token: ' + (env.tokenOk(tok) ? env.mask(tok) : 'not set') + '  |  Owner ID: ' + (env.chatIdOk(ocid) ? ocid : 'not set') + '  |  Gemini: ' + (gk ? 'set' : 'not set')));
    console.log('');
    console.log(isReady() ? '  1) Start the bot' : c.dim('  1) Start the bot (set up a mode first)'));
    console.log('  2) Telegram Bot mode (multi-user)');
    console.log('  3) Terminal mode (personal)');
    console.log('  4) Web Pair mode (website for multiple users)');
    console.log('  5) Manage numbers (Terminal mode)');
    console.log('  6) Settings (Gemini, owner, Telegram ID, model)');
    console.log('  7) System check (doctor)');
    console.log('  8) Exit');
}

async function handle(a, p) {
    switch (a) {
        case '1':
            if (!isReady()) {
                const m = currentMode();
                let cause = 'no mode is configured';
                if (m === 'telegram') {
                    if (!env.tokenOk(env.get('TELEGRAM_BOT_TOKEN'))) cause = 'Telegram mode is selected but the bot token is missing';
                    else if (!env.chatIdOk(env.get('TELEGRAM_OWNER_CHAT_ID'))) cause = 'Telegram mode is selected but Owner Chat ID is missing';
                }
                ui.fail('Nothing to start yet', cause, 'Choose option 2 (Telegram), 3 (Terminal) or 4 (Web Pair) first and complete the setup.');
                return;
            }
            return 'start';
        case '2': return (await telegramSetup(p, { askStart: true })) === 'start' ? 'start' : undefined;
        case '3': return actTerminal(p);
        case '4': return (await webSetup(p, { askStart: true })) === 'start' ? 'start' : undefined;
        case '5': return actNumbers(p);
        case '6': return actSettings(p);
        case '7': return doctor();
        case '8':
            console.log('Goodbye.');
            process.exit(0);
            return;
        default:
            console.log(c.red('Invalid choice "' + a + '". Enter a number from 1 to 8.'));
    }
}

/** Show the menu until the user starts the bot (resolves 'start') or exits (process exits 0). */
async function run() {
    const p = createPrompter();
    while (true) {
        showMenu();
        const a = await p.ask('\nChoose an option (1-8): ');
        let r;
        try { r = await handle(a, p); } catch (e) {
            ui.fail('Menu action failed', ui.errText(e), 'You are back at the menu. Run with DEBUG=1 for details.');
        }
        if (r === 'start') { p.close(); return 'start'; }
    }
}

module.exports = { run, telegramSetup, webSetup, createPrompter, doctor, savedNumbers, findFfmpeg };
