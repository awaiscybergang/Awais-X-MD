/**
 * AWAIS X MD - Premium Web Pair Server
 * Multi-user pairing website (runs on Termux / VPS / PC)
 * Port: WEB_PORT (default 3000)
 */
'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');

const { cleanPhone } = require('./env');            // same number rules everywhere (accepts +92 / 0092 / 03xx, rejects a missing country code)
const { createLimiter } = require('./ratelimit');

const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.env.WEB_PORT, 10) || 3000;

// In-memory store for active pairing requests (sessionId -> state)
const pairJobs = new Map();

function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>AWAIS X MD — Web Pair</title>
<meta name="description" content="AWAIS X MD premium multi-device WhatsApp bot. Pair your number instantly from the web.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<style>
:root {
  --bg: #07070c;
  --bg2: #0e0e16;
  --card: #12121c;
  --border: rgba(255,255,255,0.07);
  --text: #f0f0f5;
  --muted: #8b8b9e;
  --accent: #7c5cff;
  --accent2: #a78bfa;
  --green: #22c55e;
  --red: #ef4444;
  --orange: #f59e0b;
  --glow: 0 0 40px rgba(124,92,255,0.25);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,92,255,0.18), transparent),
    radial-gradient(ellipse 60% 40% at 100% 100%, rgba(167,139,250,0.08), transparent);
}
.container { max-width: 520px; margin: 0 auto; padding: 24px 18px; width: 100%; flex: 1; display: flex; flex-direction: column; }
header { text-align: center; margin-bottom: 28px; padding-top: 12px; }
.logo {
  display: inline-flex; align-items: center; gap: 10px;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  font-weight: 800; font-size: 1.7rem; letter-spacing: -0.5px;
}
.logo span { font-size: 1.9rem; -webkit-text-fill-color: initial; }
.tagline { color: var(--muted); font-size: 0.9rem; margin-top: 8px; font-weight: 500; }
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: var(--glow);
  margin-bottom: 20px;
}
.card h2 { font-size: 1.15rem; font-weight: 700; margin-bottom: 6px; }
.card p.desc { color: var(--muted); font-size: 0.85rem; margin-bottom: 22px; line-height: 1.5; }
label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.4px; }
.input-wrap { position: relative; margin-bottom: 18px; }
input[type="tel"], input[type="text"] {
  width: 100%; padding: 14px 16px;
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 12px; color: var(--text); font-size: 1rem;
  font-family: 'JetBrains Mono', monospace; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124,92,255,0.2); }
.hint { font-size: 0.75rem; color: var(--muted); margin-top: 6px; }
.btn {
  width: 100%; padding: 15px;
  background: linear-gradient(135deg, var(--accent), #6d4aff);
  color: #fff; border: none; border-radius: 12px;
  font-size: 1rem; font-weight: 700; cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, opacity 0.2s;
  font-family: inherit;
}
.btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,92,255,0.4); }
.btn:active:not(:disabled) { transform: translateY(0); }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.status-box {
  display: none; margin-top: 20px; padding: 18px;
  background: var(--bg2); border-radius: 14px; border: 1px solid var(--border);
  text-align: center;
}
.status-box.show { display: block; animation: fadeIn 0.3s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 2.1rem; font-weight: 700; letter-spacing: 8px;
  color: var(--accent2); margin: 12px 0 8px;
  text-shadow: 0 0 20px rgba(167,139,250,0.4);
}
.status-msg { font-size: 0.9rem; color: var(--muted); line-height: 1.5; }
.status-msg.ok { color: var(--green); }
.status-msg.err { color: var(--red); }
.status-msg.warn { color: var(--orange); }
.spinner {
  width: 28px; height: 28px; border: 3px solid rgba(124,92,255,0.2);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin 0.7s linear infinite; margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.steps {
  display: grid; gap: 10px; margin-top: 8px;
}
.step {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; background: var(--bg2); border-radius: 12px;
  border: 1px solid var(--border); font-size: 0.85rem;
}
.step-num {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
  background: rgba(124,92,255,0.15); color: var(--accent2);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700;
}
.features {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;
}
.feat {
  background: var(--card); border: 1px solid var(--border);
  border-radius: 14px; padding: 14px; text-align: center;
}
.feat strong { display: block; font-size: 0.85rem; margin-bottom: 2px; }
.feat span { font-size: 0.72rem; color: var(--muted); }
footer {
  margin-top: auto; padding: 28px 0 16px; text-align: center;
}
.channel-btn {
  display: inline-flex; align-items: center; gap: 8px;
  background: #25D366; color: #fff; text-decoration: none;
  padding: 12px 22px; border-radius: 50px; font-weight: 700;
  font-size: 0.9rem; margin-bottom: 16px;
  box-shadow: 0 6px 20px rgba(37,211,102,0.3);
  transition: transform 0.15s, box-shadow 0.15s;
}
.channel-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(37,211,102,0.4); }
.copyright { font-size: 0.78rem; color: var(--muted); line-height: 1.6; }
.copyright a { color: var(--accent2); text-decoration: none; }
@media (max-width: 400px) {
  .features { grid-template-columns: 1fr; }
  .code { font-size: 1.7rem; letter-spacing: 5px; }
}
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo"><span>⚡</span> AWAIS X MD</div>
    <p class="tagline">Premium Multi-Device WhatsApp Bot · Web Pair</p>
  </header>

  <div class="features">
    <div class="feat"><strong>167+ Commands</strong><span>AI · Download · Groups</span></div>
    <div class="feat"><strong>Multi-Device</strong><span>No QR needed</span></div>
    <div class="feat"><strong>Free Forever</strong><span>Open source</span></div>
    <div class="feat"><strong>24/7 Ready</strong><span>Termux · VPS · PC</span></div>
  </div>

  <div class="card">
    <h2>🔗 Pair WhatsApp</h2>
    <p class="desc">Enter your number with country code. You will get an 8-character pairing code. Enter it in WhatsApp → Linked Devices → Link with phone number.</p>

    <label for="phone">WhatsApp Number</label>
    <div class="input-wrap">
      <input type="tel" id="phone" placeholder="923001234567" autocomplete="tel" inputmode="numeric">
      <p class="hint">Country code + number · no + or spaces · Pakistan: 92… · India: 91…</p>
    </div>

    <button class="btn" id="pairBtn" onclick="startPair()">Get Pairing Code</button>

    <div class="status-box" id="statusBox">
      <div id="statusContent"></div>
    </div>
  </div>

  <div class="card">
    <h2>How it works</h2>
    <div class="steps">
      <div class="step"><div class="step-num">1</div><div>Type your full number with country code and tap <strong>Get Pairing Code</strong>.</div></div>
      <div class="step"><div class="step-num">2</div><div>Wait a few seconds. An 8-character code will appear here.</div></div>
      <div class="step"><div class="step-num">3</div><div>Open WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number → enter the code.</div></div>
      <div class="step"><div class="step-num">4</div><div>When connected, type <code>.menu</code> on WhatsApp to see all commands.</div></div>
    </div>
  </div>

  <footer>
    <a class="channel-btn" href="https://whatsapp.com/channel/0029VbBzlMlIt5rzSeMBE922" target="_blank" rel="noopener">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Join WhatsApp Channel
    </a>
    <p class="copyright">
      © 2027 Powerful MD Bot Awais x Hacker<br>
      Free · Open Source · Built for everyone
    </p>
  </footer>
</div>

<script>
const phoneEl = document.getElementById('phone');
const btn = document.getElementById('pairBtn');
const box = document.getElementById('statusBox');
const content = document.getElementById('statusContent');
let pollTimer = null;
let currentId = null;
let pollStart = 0;
let failCount = 0;
let lastShown = '';

// Never put server text into the page unescaped
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function show(html) { content.innerHTML = html; box.classList.add('show'); }
function setBusy(v) { btn.disabled = v; phoneEl.disabled = v; }
function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

// fetch with a 20 second limit: a slow connection must never freeze the page
async function api(url, opts) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, 20000);
  try {
    const res = await fetch(url, Object.assign({}, opts || {}, { signal: ctl.signal }));
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'Server answered with an unexpected reply (' + res.status + '). Try again in a minute.' }; }
    return { ok: res.ok, status: res.status, data: data };
  } finally { clearTimeout(t); }
}

async function startPair() {
  const num = phoneEl.value.replace(/\\D/g, '');
  if (num.length < 8 || num.length > 15) {
    show('<p class="status-msg err">Invalid number. Use country code + number only (8-15 digits).<br>Example: 923001234567</p>');
    return;
  }
  setBusy(true);
  stopPolling();
  failCount = 0;
  lastShown = '';
  show('<div class="spinner"></div><p class="status-msg">Requesting pairing code…</p>');

  try {
    const r = await api('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: num })
    });
    if (!r.ok || r.data.error) {
      show('<p class="status-msg err">' + esc(r.data.error || 'Something went wrong') + '</p>');
      setBusy(false);
      return;
    }
    currentId = r.data.id;
    pollStart = Date.now();
    show('<div class="spinner"></div><p class="status-msg">Waiting for the code…<br>(on slow internet this can take up to a minute)</p>');
    pollTimer = setInterval(checkStatus, 2000);
  } catch (e) {
    show('<p class="status-msg err">Network error or very slow connection. Check your internet and try again.</p>');
    setBusy(false);
  }
}

function copyCode() {
  const b = document.getElementById('copyBtn');
  const done = function () { if (b) b.textContent = 'Copied ✓'; };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(lastShown).then(done, function () {});
  } else {
    const ta = document.createElement('textarea');
    ta.value = lastShown; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }
}

async function checkStatus() {
  if (!currentId) return;
  if (Date.now() - pollStart > 12 * 60 * 1000) {
    stopPolling();
    show('<p class="status-msg err">Timed out. Refresh the page and try again.</p>');
    setBusy(false);
    return;
  }
  try {
    const r = await api('/api/status/' + encodeURIComponent(currentId));
    failCount = 0;
    const data = r.data || {};
    if (data.status === 'code') {
      if (data.code !== lastShown) {                       // redraw only when the code changed (no flicker)
        lastShown = data.code;
        show(
          '<p class="status-msg">Enter this code in WhatsApp</p>' +
          '<div class="code">' + esc(data.code) + '</div>' +
          '<button class="btn" id="copyBtn" style="margin-top:8px" onclick="copyCode()">Copy code</button>' +
          '<p class="status-msg" style="margin-top:12px">WhatsApp → Linked Devices → Link with phone number<br>Code expires in ~2 minutes (a new one appears by itself)</p>'
        );
      }
    } else if (data.status === 'connected') {
      stopPolling();
      show('<p class="status-msg ok">✅ Connected successfully!<br>Open WhatsApp and type <strong>.menu</strong></p>');
      setBusy(false);
    } else if (data.status === 'error') {
      stopPolling();
      show('<p class="status-msg err">' + esc(data.message || data.error || 'Pairing failed') + '</p>');
      setBusy(false);
    }
  } catch (e) {
    failCount++;
    if (failCount === 5) show('<p class="status-msg warn">Connection to the server is unstable… still trying, please wait.</p>');
  }
}

phoneEl.addEventListener('keydown', e => { if (e.key === 'Enter') startPair(); });
</script>
</body>
</html>`;
}

/**
 * Start the web pair server.
 * @param {object} handlers - { startPairing(phone, jobId, pairJobs), canAccept(phone) -> null | message, stats() }
 * @returns {{server: http.Server, pairJobs: Map, PORT: number}}
 */
function startWebServer(handlers) {
    handlers = handlers || {};
    const app = express();
    app.disable('x-powered-by');
    // Behind cloudflared / nginx on the same machine the real visitor IP is in X-Forwarded-For (trusted from localhost only,
    // so nobody can fake it when the port is reachable directly).
    app.set('trust proxy', 'loopback');
    app.use(express.json({ limit: '4kb' }));

    const perIp = createLimiter({ max: parseInt(process.env.WEB_MAX_PER_IP_HOUR, 10) || 8, windowMs: 60 * 60 * 1000 });
    const perNumber = createLimiter({ max: parseInt(process.env.WEB_MAX_PER_NUMBER_HOUR, 10) || 6, windowMs: 60 * 60 * 1000 });
    const activeByPhone = new Map();   // phone -> { id, ip }

    // Clean old jobs + limiter entries every minute (not only when somebody visits)
    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of pairJobs) if (now - v.created > 10 * 60 * 1000) pairJobs.delete(k);
        for (const [p, v] of activeByPhone) { const j = pairJobs.get(v.id); if (!j || (j.status !== 'waiting' && j.status !== 'code')) activeByPhone.delete(p); }
        perIp.sweep(); perNumber.sweep();
    }, 60 * 1000).unref();

    // Security headers + CORS for tunnels
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
        next();
    });

    let html = null;
    app.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(html || (html = getHtml()));
    });

    app.get('/health', (req, res) => {
        let extra = {};
        try { extra = (handlers.stats && handlers.stats()) || {}; } catch (e) { /* stats are optional */ }
        res.json(Object.assign({ ok: true, name: 'AWAIS X MD', mode: 'web' }, extra));
    });

    app.post('/api/pair', (req, res) => {
        try {
            const phone = cleanPhone(req.body && req.body.number);
            if (!phone) {
                return res.status(400).json({ error: 'Invalid number. Use the country code first, digits only (8-15), not starting with 0. Example: 923001234567' });
            }
            const ip = req.ip || 'unknown';

            // Same visitor asks again for the same number while a pairing is running -> show the running one (no new code request)
            const running = activeByPhone.get(phone);
            const runningJob = running && pairJobs.get(running.id);
            if (runningJob && (runningJob.status === 'waiting' || runningJob.status === 'code') && Date.now() - runningJob.created < 3 * 60 * 1000) {
                if (running.ip === ip) return res.json({ id: running.id, phone });
                return res.status(409).json({ error: 'This number is being linked right now by someone else. Wait 2-3 minutes and try again.' });
            }

            // Server full / too many running jobs: refuse BEFORE counting the attempt against the visitor's limits
            const full = handlers.canAccept ? handlers.canAccept(phone) : null;
            if (full) return res.status(503).json({ error: full });
            let active = 0;
            for (const j of pairJobs.values()) if (j.status === 'waiting' || j.status === 'code') active++;
            if (active >= 15) return res.status(429).json({ error: 'Too many people pairing right now. Wait 1-2 minutes and try again.' });

            const lim = perIp.hit(ip);
            if (!lim.ok) return res.status(429).json({ error: 'Too many attempts from your connection. Try again in ' + Math.ceil(lim.retryAfterSec / 60) + ' minute(s).' });
            const nl = perNumber.hit(phone);
            if (!nl.ok) return res.status(429).json({ error: 'Too many pairing codes were requested for this number. Wait ' + Math.ceil(nl.retryAfterSec / 60) + ' minute(s) (WhatsApp blocks numbers that ask for too many codes).' });

            const id = makeId();
            const job = { status: 'waiting', phone, created: Date.now() };
            pairJobs.set(id, job);
            activeByPhone.set(phone, { id, ip });
            // Kick off Baileys pairing (non-blocking)
            if (typeof handlers.startPairing === 'function') {
                try { handlers.startPairing(phone, id, pairJobs); }
                catch (e) { job.status = 'error'; job.message = 'Could not start pairing: ' + ((e && e.message) || 'unknown error'); }
            }
            res.json({ id, phone });
        } catch (e) {
            res.status(500).json({ error: 'Server error. Try again.' });
        }
    });

    app.get('/api/status/:id', (req, res) => {
        const job = pairJobs.get(req.params.id);
        if (!job) return res.status(404).json({ status: 'error', message: 'Session expired. Refresh and try again.' });
        res.setHeader('Cache-Control', 'no-store');
        res.json({
            status: job.status,
            code: job.code || null,
            message: job.message || null,
            phone: job.phone
        });
    });

    // Catch-all
    app.use((req, res) => res.redirect('/'));

    // Bad JSON / oversized body: a short JSON answer, never a stack trace
    app.use((err, req, res, next) => {   // eslint-disable-line no-unused-vars
        res.status(err && err.status === 413 ? 413 : 400).json({ error: 'Bad request.' });
    });

    const server = http.createServer(app);
    server.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('🌐  AWAIS X MD Web Pair is running');
        console.log('    Local:   http://localhost:' + PORT);
        console.log('    Network: http://0.0.0.0:' + PORT);
        console.log('');
        console.log('    For public link on Termux / VPS (free subdomain):');
        console.log('      npx cloudflared tunnel --url http://localhost:' + PORT);
        console.log('    or');
        console.log('      npx localtunnel --port ' + PORT);
        console.log('');
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error('❌ Port ' + PORT + ' is already in use -> another program (or a second copy of the bot) uses it -> set WEB_PORT=3001 (or another free port) in .env, or stop the other copy, then start again.');
        } else {
            console.error('❌ Web server error: ' + e.message);
        }
        process.exit(2);   // 2 = configuration problem: start.sh / PM2 do not restart in a loop
    });

    return { server, pairJobs, PORT };
}

module.exports = { startWebServer, cleanPhone, PORT };
