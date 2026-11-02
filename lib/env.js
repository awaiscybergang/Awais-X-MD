/**
 * .env helpers: read, write (keeps other lines & comments), placeholders, masking,
 * Telegram token check. Built-ins only (works before npm install).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const EXAMPLE_PATH = path.join(ROOT, '.env.example');

const TOKEN_RE = /^\d{6,}:[A-Za-z0-9_-]{30,}$/;
// Example values that must be treated as "not set"
const PLACEHOLDERS = {
    TELEGRAM_BOT_TOKEN: ['your_telegram_bot_token_here'],
    GEMINI_API_KEY: ['your_gemini_api_key_here'],
    OWNER_NUMBER: ['923xxxxxxxxx', '91xxxxxxxxxx'],
    WHATSAPP_NUMBER: ['923xxxxxxxxx', '91xxxxxxxxxx'],
    TELEGRAM_OWNER_CHAT_ID: ['123456789', 'your_telegram_chat_id_here']
};

// Telegram owner ID = the numeric USER id (positive digits only). Group ids (negative) are not valid owners.
function chatIdOk(id) {
    const s = String(id || '').trim();
    return !!s && /^\d{5,15}$/.test(s) && !PLACEHOLDERS.TELEGRAM_OWNER_CHAT_ID.includes(s);
}

function parseEnv(text) {
    const out = {};
    for (const line of String(text).split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !line.trim().startsWith('#')) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
    return out;
}

function readEnv() {
    try { return parseEnv(fs.readFileSync(ENV_PATH, 'utf8')); } catch (e) { return {}; }
}

function tokenOk(t) {
    return !!t && !PLACEHOLDERS.TELEGRAM_BOT_TOKEN.includes(String(t).trim()) && TOKEN_RE.test(String(t).trim());
}

// Current value of a setting: real environment first, then .env; placeholders count as empty
function get(key) {
    const v = String(process.env[key] || readEnv()[key] || '').trim();
    return (PLACEHOLDERS[key] || []).includes(v) ? '' : v;
}

// Blank out example placeholders so dotenv/the bot never use them as real values
function sanitizePlaceholders() {
    const file = readEnv();
    for (const k of Object.keys(PLACEHOLDERS)) {
        const v = String(process.env[k] || file[k] || '').trim();
        if (PLACEHOLDERS[k].includes(v)) process.env[k] = ''; // dotenv will not override an existing (empty) value
    }
}

// Update/insert KEY=VALUE lines in .env (keeps other lines & comments). Throws on write errors.
function saveEnv(values) {
    let text = '';
    try { text = fs.readFileSync(ENV_PATH, 'utf8'); }
    catch (e) {
        try { text = fs.readFileSync(EXAMPLE_PATH, 'utf8'); } catch (e2) { /* no example either: start empty */ }
    }
    for (const [k, v0] of Object.entries(values)) {
        const v = String(v0).replace(/[\r\n]/g, '');
        const re = new RegExp('^[ \\t]*#?[ \\t]*' + k + '[ \\t]*=.*$', 'm');
        if (re.test(text)) text = text.replace(re, () => k + '=' + v);
        else text += (text.endsWith('\n') || !text ? '' : '\n') + k + '=' + v + '\n';
    }
    fs.writeFileSync(ENV_PATH, text);
}

// Save to .env AND to this process, so the change is used right away
function set(values) {
    for (const [k, v] of Object.entries(values)) process.env[k] = String(v);
    saveEnv(values);
}

// Human explanation for a failed .env write
function writeErrorHelp(e) {
    const code = e && e.code;
    if (code === 'EACCES' || code === 'EPERM') return ['permissions on the project folder or .env do not allow writing', 'Run: chmod u+rw .env  (or fix the folder owner), then try again'];
    if (code === 'EROFS') return ['the file system is read-only', 'Move the project to a writable folder'];
    if (code === 'ENOSPC') return ['the disk is full', 'Free some disk space, then try again'];
    return [(e && e.message) || 'unknown write error', 'Check that the project folder is writable, then try again'];
}

// Hide secrets: 123456789:AAxxxx...yyyy -> 1234****yyyy
function mask(s) {
    s = String(s || '');
    if (!s) return '';
    if (s.length < 9) return '****';
    return s.slice(0, 4) + '****' + s.slice(-4);
}

// Ask Telegram if the token is real.
// Returns { ok:true, username } | { ok:false } (rejected) | { ok:null, code } (could not reach Telegram)
function verifyToken(token) {
    return new Promise(resolve => {
        const req = https.get('https://api.telegram.org/bot' + token + '/getMe', { timeout: 15000 }, res => {
            let body = '';
            res.on('data', d => { body += d; });
            res.on('end', () => {
                let j = null;
                try { j = JSON.parse(body); } catch (e) { /* not JSON */ }
                if (res.statusCode === 200 && j && j.ok) return resolve({ ok: true, username: (j.result && j.result.username) || '' });
                if (res.statusCode === 401 || res.statusCode === 404) return resolve({ ok: false });
                resolve({ ok: null, code: 'HTTP ' + res.statusCode });
            });
        });
        req.on('timeout', () => { req.destroy(); resolve({ ok: null, code: 'TIMEOUT' }); });
        req.on('error', e => resolve({ ok: null, code: e.code || 'ERROR' }));
    });
}

// Normalise a phone number: digits only, 8-15 long, else ''.
//  - 0092300... / 00923... -> 92300...   (international "00" prefix)
//  - 03001234567           -> 923001234567 (Pakistan local format)
//  - any other number that starts with 0 has NO country code -> rejected (WhatsApp needs the country code)
function cleanPhone(t) {
    let n = String(t || '').replace(/\D/g, '');
    if (n.startsWith('00')) n = n.slice(2);
    if (/^03\d{9}$/.test(n)) n = '92' + n.slice(1);
    if (!n || n.startsWith('0')) return '';
    return n.length >= 8 && n.length <= 15 ? n : '';
}

module.exports = { ROOT, ENV_PATH, PLACEHOLDERS, parseEnv, readEnv, tokenOk, chatIdOk, get, sanitizePlaceholders, saveEnv, set, writeErrorHelp, mask, verifyToken, cleanPhone };
