/**
 * 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT - All Commands
 * Har command apne session ke saath kaam karta hai
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const {
    CONFIG, loadConfig, saveConfig, getBotImg, getMenuSong,
    JOKES, QUOTES, REACT_EMOJIS, QURAN_SURAHS, AX, hasGali, isEmojiOnly
} = require('./awaisconfig');

// Optional yt
let yts = null;
try { yts = require('yt-search'); } catch {}
let ytdl = null;
try { ytdl = require('@distube/ytdl-core'); } catch {}
let playdl = null;
try { playdl = require('play-dl'); } catch {}

const yt = require('./lib/youtube');
const { toAudio } = require('./lib/converter');

// Per session settings store (in-memory + config fallback)
const sessionSettings = {}; // chatId -> settings object

function getSessionSettings(chatId) {
    if (!sessionSettings[chatId]) {
        const cfg = loadConfig();
        sessionSettings[chatId] = {
            autoreacts: cfg.autoreacts !== false,
            autotyping: cfg.autotyping !== false,
            autorecording: cfg.autorecording === true,
            statusSeen: true,
            statusReact: true,
            antidelete: cfg.antidelete !== false,
            antiedit: cfg.antiedit !== false,
            antigali: cfg.antigali !== false,
            antilink: cfg.antilink !== false,
            antiemoji: cfg.antiemoji !== false,
            welcome: cfg.welcome !== false,
            goodbye: cfg.goodbye !== false,
            welcomeMsg: cfg.welcomeMsg || '',
            goodbyeMsg: cfg.goodbyeMsg || ''
        };
    }
    return sessionSettings[chatId];
}

function setSessionSetting(chatId, key, val) {
    const s = getSessionSettings(chatId);
    s[key] = val;
    const cfg = loadConfig();
    const persistKeys = ['autoreacts', 'autotyping', 'autorecording', 'antidelete', 'antiedit', 'welcome', 'goodbye', 'welcomeMsg', 'goodbyeMsg'];
    if (persistKeys.includes(key)) {
        cfg[key] = val;
        saveConfig(cfg);
    }
}

// Store for anti-delete / anti-edit (message cache)
const msgCache = new Map(); // key = `${jid}_${id}` -> full msg
const CACHE_LIMIT = 2000;

// ── Helpers ───────────────────────────────────────
const safeFileName = (t, fb) => (String(t || '').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().slice(0, 60)) || fb;

async function react(sock, msg, emoji) {
    try { await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }); } catch {}
}

async function sendText(sock, from, text, msg) {
    return sock.sendMessage(from, { text: text + CONFIG.BOT_FOOTER }, { quoted: msg });
}

async function sendWithTyping(sock, from, text, msg, chatId) {
    const settings = getSessionSettings(chatId);
    if (settings.autotyping) {
        try { await sock.sendPresenceUpdate('composing', from); } catch {}
        await new Promise(r => setTimeout(r, 800));
    }
    return sendText(sock, from, text, msg);
}

// ── MENU ──────────────────────────────────────────
// Put your banner image link here (or use .setimage)
const DEFAULT_MENU_IMG = 'https://i.ibb.co/Gvj78h8g/1783418851011.png';

// ── MENU (premium boxed design) ───────────────────
const SMALLCAPS = {
    a:'ᴀ', b:'ʙ', c:'ᴄ', d:'ᴅ', e:'ᴇ', f:'ғ', g:'ɢ', h:'ʜ', i:'ɪ', j:'ᴊ', k:'ᴋ', l:'ʟ', m:'ᴍ',
    n:'ɴ', o:'ᴏ', p:'ᴘ', q:'ǫ', r:'ʀ', s:'s', t:'ᴛ', u:'ᴜ', v:'ᴠ', w:'ᴡ', x:'x', y:'ʏ', z:'ᴢ'
};
function smallCaps(t) {
    return String(t).toLowerCase().replace(/[a-z]/g, c => SMALLCAPS[c]);
}

// Menu sections: [title, [commands...]] — yahan se menu automatically banta hai
const MENU_SECTIONS = [
    ["GENERAL", ["menu","help","info","about","rules","joke","quote","time","date","setimage","setbanner","owner","script","support"]],
    ["YOUTUBE", ["play","song","video","ytv","ytmp3","ytmp4"]],
    ["DOWNLOAD", ["insta","ig","extractweb","tiktok","facebook","twitter","mediafire"]],
    ["STUDENT LAB", ["pdfunlock","pdflock","zipunlock","ziplock","txttofile","filetotxt","pdfmerge","img2pdf","pdf2img","compress","calc","translate","dictionary","wiki"]],
    ["DEVELOPER TOOLS", ["extractweb","webss","whois","ip","ping","runtime","base64","decode64","hash","uuid","password","qr","shortlink","github"]],
    ["ISLAMIC", ["quran","surah","ayat","surahlist","yasin","mulk","rahman","kahf","waqiah","ikhlas","fatiha","nas","falaq","quranaudio","hadith","dua","tasbeeh","prayertime","hijri"]],
    ["AWAIS TOOLS", ["autoreacts","autotyping","autorecording","statusseen","statusreact","getdp","jid","vv","vv2","💓","💗","💖","💘","💝","💞","💟","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","😻","😘","🫀","toimg","tovideo","tomp3","sticker","steal"]],
    ["ANTI FEATURES", ["antidelete","antiedit","antigali","antilink","antiemoji"]],
    ["GROUP", ["tagall","hidetag","kick","promote","demote","warn","unwarn","mute","unmute","lock","unlock","groupinfo","link","revoke","setname","setdesc","listadmin","welcome","goodbye","setwelcome","setgoodbye","poll","announce"]],
    ["FUN", ["meme","fact","advice","pickup","roast","compliment","flip","roll","ship","lovemeter","truth","dare","emojimix"]],
    ["DPZ LAB", ["boydp","girldp","coupledp","animedp","randomdp","wallpaper","cat","dog"]],
    ["AI & MORE", ["gpt","ai","gemini","ask","imagine","weather","news","crypto","currency"]]
];

function menuRuntime() {
    const up = process.uptime();
    const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = Math.floor(up % 60);
    return `${h}h ${m}m ${s}s`;
}

function getFullMenu() {
    let version = '2.0.0';
    try { version = require('./package.json').version || version; } catch {}
    const total = new Set(MENU_SECTIONS.flatMap(s => s[1])).size;

    let out = `❖ ── ✦ *${smallCaps('awais md multi-device')}* ✦ ── ❖\n\n`;
    out += `╔═════ ⌈ *👑 ${smallCaps('user info')}* ⌋ ═════✧\n`;
    out += `║ 🚀 *${smallCaps('owner:')}* AWAIS-MD\n`;
    out += `║ 📂 *${smallCaps('commands:')}* ${total}\n`;
    out += `║ ⏱️ *${smallCaps('runtime:')}* ${menuRuntime()}\n`;
    out += `║ ⚡ *${smallCaps('prefix:')}* [ ${CONFIG.PREFIX} ]\n`;
    out += `║ 🔐 *${smallCaps('mode:')}* public\n`;
    out += `║ 📌 *${smallCaps('version:')}* ${version}\n`;
    out += `╚══════════════════════✧\n`;

    for (const [title, cmds] of MENU_SECTIONS) {
        out += `╔═════ ⌈ *⚡ ${smallCaps(title)}* ⌋ ═════✧\n`;
        for (const c of cmds) out += `║ ◈ \`${smallCaps(c)}\`\n`;
        out += `╚══════════════════════✧\n`;
    }
    return out.trim();
}

// ── YOUTUBE HELPERS (from original) ───────────────
let ytActive = 0;

async function ytResolve(sock, from, msg, query, mode, kind) {
    const q = (query || '').trim();
    const reply = text => sock.sendMessage(from, { text: text + CONFIG.BOT_FOOTER }, { quoted: msg });

    if (!q) {
        await reply(kind === 'audio'
            ? (mode === 'link' ? '❌ YouTube *link* do!\n*Example:* .ytmp3 https://youtu.be/xxx' : '❌ Type the *song name*!\n*Example:* .play Tum Hi Ho')
            : (mode === 'link' ? '❌ YouTube *link* do!\n*Example:* .ytmp4 https://youtu.be/xxx' : '❌ Type the *video name*!\n*Example:* .video Faded'));
        return null;
    }

    const direct = yt.normalizeUrl(q);
    if (direct) {
        const id = yt.extractVideoId(direct);
        return { url: direct, title: '', thumb: yt.thumbnailFor(id), duration: '', seconds: 0 };
    }
    if (mode === 'link') { await reply('❌ This is not a valid YouTube link!'); return null; }

    const found = await yt.search(q);
    if (!found) {
        await reply(`❌ ${kind === 'audio' ? 'Song' : 'Video'} not found!`);
        return null;
    }
    return { url: found.url, title: found.title, thumb: found.thumbnail, duration: found.duration, seconds: found.seconds };
}

const ytLog = m => console.log('[YT]', m);

// Audio buffer ki asli format pehchano (API mp3 deti hai, ytdl-core webm/m4a deta hai)
function sniffAudio(b) {
    if (b.length > 3 && b.toString('latin1', 0, 3) === 'ID3') return { mp3: true };
    if (b.length > 2 && b[0] === 0xFF && (b[1] & 0xE0) === 0xE0) return { mp3: true };
    if (b.length > 4 && b.readUInt32BE(0) === 0x1A45DFA3) return { mp3: false, ext: 'webm', mime: 'audio/webm' };
    if (b.length > 8 && b.toString('latin1', 4, 8) === 'ftyp') return { mp3: false, ext: 'm4a', mime: 'audio/mp4' };
    if (b.length > 4 && b.toString('latin1', 0, 4) === 'OggS') return { mp3: false, ext: 'ogg', mime: 'audio/ogg' };
    return { mp3: false, ext: 'bin', mime: 'audio/mpeg' };
}

const fmtMin = s => Math.round(s / 60);

async function songDownload(sock, from, msg, query, mode) {
    if (ytActive >= CONFIG.YT_MAX_ACTIVE) {
        await sendText(sock, from, '⏳ Bot is busy, try again later.', msg);
        return;
    }
    ytActive++;
    try {
        await react(sock, msg, '🎵');
        const info = await ytResolve(sock, from, msg, query, mode, 'audio');
        if (!info) return;

        if (info.seconds && info.seconds > yt.LIMITS.maxAudioSeconds) {
            await sendText(sock, from, `❌ Ye audio bohat lambi hai (max ${fmtMin(yt.LIMITS.maxAudioSeconds)} min).`, msg);
            return;
        }

        await sendText(sock, from, `📥 Downloading...\n*${info.title || 'Audio'}*`, msg);
        const res = await yt.download('audio', info.url, ytLog);
        if (!res || !res.ok || !res.buffer) {
            console.log('[YT] audio fail:', ((res && res.errors) || []).join(' | '));
            await sendText(sock, from, '❌ Download fail! Saare sources try kar liye, thori der baad dobara try karo.', msg);
            return;
        }

        // Hamesha asli MP3 bhejo (ytdl-core/play-dl webm ya m4a dete hain)
        let audio = res.buffer, mime = 'audio/mpeg', ext = 'mp3';
        const kind = sniffAudio(audio);
        if (!kind.mp3) {
            try {
                audio = await toAudio(audio, kind.ext);
            } catch (e) {
                console.log('[YT] mp3 convert fail:', e.message);
                audio = res.buffer; mime = kind.mime; ext = kind.ext === 'bin' ? 'mp3' : kind.ext;
            }
        }

        const title = res.title || info.title || 'audio';
        await sock.sendMessage(from, {
            audio,
            mimetype: mime,
            fileName: `${safeFileName(title, 'song')}.${ext}`,
            ptt: false
        }, { quoted: msg });
        await sendText(sock, from, `✅ *${title}*\n${CONFIG.POWERED_BY}`, msg);
    } catch (e) {
        console.log('Song error:', e.message);
        await sendText(sock, from, `❌ Error: ${e.message}`, msg);
    } finally {
        ytActive--;
    }
}

async function ytVideoDownload(sock, from, msg, query, mode) {
    if (ytActive >= CONFIG.YT_MAX_ACTIVE) {
        await sendText(sock, from, '⏳ Bot is busy, try again later.', msg);
        return;
    }
    ytActive++;
    try {
        await react(sock, msg, '🎬');
        const info = await ytResolve(sock, from, msg, query, mode, 'video');
        if (!info) return;

        if (info.seconds && info.seconds > yt.LIMITS.maxVideoSeconds) {
            await sendText(sock, from, `❌ Ye video bohat lambi hai (max ${fmtMin(yt.LIMITS.maxVideoSeconds)} min).`, msg);
            return;
        }

        await sendText(sock, from, `📥 Downloading video...\n*${info.title || 'Video'}*`, msg);
        const res = await yt.download('video', info.url, ytLog);
        if (!res || !res.ok || !res.buffer) {
            console.log('[YT] video fail:', ((res && res.errors) || []).join(' | '));
            await sendText(sock, from, '❌ Download fail! Saare sources try kar liye, thori der baad dobara try karo.', msg);
            return;
        }

        const title = res.title || info.title || 'video';
        const cap = `✅ *${title}*\n${CONFIG.POWERED_BY}`;
        const fileName = `${safeFileName(title, 'video')}.mp4`;
        if (res.buffer.length > yt.LIMITS.videoInlineMaxBytes) {
            // Badi video inline fail ho jati hai -> document bana ke bhejo
            await sock.sendMessage(from, { document: res.buffer, mimetype: 'video/mp4', fileName, caption: cap }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { video: res.buffer, mimetype: 'video/mp4', fileName, caption: cap }, { quoted: msg });
        }
    } catch (e) {
        console.log('Video error:', e.message);
        await sendText(sock, from, `❌ Error: ${e.message}`, msg);
    } finally {
        ytActive--;
    }
}

// Instagram
async function instaDownload(sock, from, msg, url) {
    if (!url || !url.includes('instagram.com')) {
        await sendText(sock, from, '❌ Send an Instagram link!\n*Example:* .insta https://instagram.com/reel/xxx', msg);
        return;
    }
    for (const e of ['📥', '⏳', '📸']) await react(sock, msg, e);
    await sendText(sock, from, '📥 Instagram se download ho raha hai...', msg);

    const instaApis = [
        async () => {
            const r = await axios.get(`https://api.vreden.my.id/api/igdownload?url=${encodeURIComponent(url)}`, AX);
            if (r?.data?.status && r?.data?.result?.length) return r.data.result;
            throw new Error('fail');
        },
        async () => {
            const r = await axios.get(`https://okatsu-rolezapiiz.vercel.app/downloader/instagram?url=${encodeURIComponent(url)}`, AX);
            if (r?.data?.result?.length) return r.data.result;
            throw new Error('fail');
        }
    ];

    let mediaList = null;
    for (const api of instaApis) {
        try { mediaList = await api(); if (mediaList?.length) break; } catch {}
    }

    if (!mediaList?.length) {
        await sendText(sock, from, '❌ Download fail! Use a public post link.', msg);
        return;
    }

    for (const item of mediaList.slice(0, 5)) {
        const mUrl = item.url || item.download_url || item.src;
        const isVid = item.type === 'video' || /\.(mp4|mov)/i.test(mUrl || '');
        try {
            await sock.sendMessage(from, isVid
                ? { video: { url: mUrl }, caption: `✅ Instagram Video\n${CONFIG.POWERED_BY}` }
                : { image: { url: mUrl }, caption: `✅ Instagram Image\n${CONFIG.POWERED_BY}` }
            , { quoted: msg });
        } catch {}
    }
}

// ── STUDENT LAB ───────────────────────────────────
async function handlePdfUnlock(sock, from, msg) {
    // Reply to a PDF message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted?.documentMessage) {
        await sendText(sock, from, '❌ Kisi PDF ko *reply* karke .pdfunlock likho.\n(Password protected PDF ke liye password bhi do: .pdfunlock mypass)', msg);
        return;
    }
    await sendText(sock, from, '🔓 PDF unlock feature abhi basic mode mein hai.\nOnline tool use karo ya password se open karke naya PDF bhejo.', msg);
    // Full unlock needs pdf-lib + password which is complex without lib; placeholder for now
}

async function handlePdfLock(sock, from, msg, pass) {
    if (!pass) {
        await sendText(sock, from, '❌ Password do!\n*Example:* .pdflock mysecret123 (PDF ko reply karke)', msg);
        return;
    }
    await sendText(sock, from, '🔒 PDF lock: Reply PDF + password. (Full support ke liye pdf-lib add karna padega)', msg);
}

async function handleZipUnlock(sock, from, msg) {
    await sendText(sock, from, '📂 ZIP unlock: ZIP file ko reply karke .zipunlock likho.\n(Password protected ke liye .zipunlock password)', msg);
}

async function handleZipLock(sock, from, msg, pass) {
    await sendText(sock, from, '📦 ZIP lock: Files ko reply + password ke saath .ziplock', msg);
}

async function handleTxtToFile(sock, from, msg, text) {
    if (!text) {
        await sendText(sock, from, '❌ Provide text!\n*Example:* .txttofile Hello World ye file banegi', msg);
        return;
    }
    const buf = Buffer.from(text, 'utf8');
    await sock.sendMessage(from, {
        document: buf,
        mimetype: 'text/plain',
        fileName: 'awais_txt.txt',
        caption: `✅ TXT file ready!\n${CONFIG.POWERED_BY}`
    }, { quoted: msg });
}

async function handleFileToTxt(sock, from, msg) {
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const doc = quoted?.documentMessage;
    if (!doc) {
        await sendText(sock, from, '❌ Reply to a text file with .filetotxt', msg);
        return;
    }
    // Baileys download would be needed; placeholder
    await sendText(sock, from, '📄 File to TXT: Supported for text files. (Download + read logic needed)', msg);
}

// Extra student tools
async function handleImg2Pdf(sock, from, msg) {
    await sendText(sock, from, '🖼️ Image ko reply karke .img2pdf\n(PDF conversion ke liye sharp/pdf-lib add karna padega)', msg);
}

async function handlePdf2Img(sock, from, msg) {
    await sendText(sock, from, '📑 PDF ko reply karke .pdf2img', msg);
}

async function handleCompress(sock, from, msg) {
    await sendText(sock, from, '🗜️ Media ko reply karke .compress', msg);
}

// ── DEVELOPER TOOLS ───────────────────────────────
async function handleExtractWeb(sock, from, msg, url) {
    if (!url || !url.startsWith('http')) {
        await sendText(sock, from, '❌ Valid URL do!\n*Example:* .extractweb https://example.com', msg);
        return;
    }
    try {
        await react(sock, msg, '🌐');
        const r = await axios.get(url, { ...AX, timeout: 15000, maxContentLength: 2 * 1024 * 1024 });
        const text = (r.data || '').toString().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3500);
        await sendText(sock, from, `🌐 *Extracted from:* ${url}\n\n${text || 'No text found'}`, msg);
    } catch (e) {
        await sendText(sock, from, `❌ Extract fail: ${e.message}`, msg);
    }
}

async function handleWebSS(sock, from, msg, url) {
    if (!url) {
        await sendText(sock, from, '❌ URL do!\n*Example:* .webss https://google.com', msg);
        return;
    }
    // Use free screenshot API
    try {
        await react(sock, msg, '📸');
        const ssUrl = `https://api.apiflash.com/v1/urltoimage?access_key=demo&url=${encodeURIComponent(url)}&format=jpeg`;
        await sock.sendMessage(from, {
            image: { url: ssUrl },
            caption: `📸 Screenshot of ${url}\n${CONFIG.POWERED_BY}`
        }, { quoted: msg });
    } catch (e) {
        await sendText(sock, from, `❌ SS fail: ${e.message}`, msg);
    }
}

async function handleWhois(sock, from, msg, domain) {
    if (!domain) {
        await sendText(sock, from, '❌ Domain do!\n*Example:* .whois google.com', msg);
        return;
    }
    try {
        const r = await axios.get(`https://api.whois.vu/?q=${encodeURIComponent(domain)}`, AX);
        await sendText(sock, from, `🔍 *WHOIS:* ${domain}\n\n\`\`\`${JSON.stringify(r.data, null, 2).slice(0, 3000)}\`\`\``, msg);
    } catch (e) {
        await sendText(sock, from, `❌ WHOIS fail: ${e.message}`, msg);
    }
}

async function handleIp(sock, from, msg, q) {
    if (!q) {
        await sendText(sock, from, '❌ IP ya domain do!\n*Example:* .ip 8.8.8.8', msg);
        return;
    }
    try {
        const r = await axios.get(`http://ip-api.com/json/${encodeURIComponent(q)}`, AX);
        const d = r.data;
        await sendText(sock, from, `🌍 *IP Info*\nIP: ${d.query}\nCountry: ${d.country}\nCity: ${d.city}\nISP: ${d.isp}\nOrg: ${d.org}`, msg);
    } catch (e) {
        await sendText(sock, from, `❌ Fail: ${e.message}`, msg);
    }
}

// ── ISLAMIC ───────────────────────────────────────
async function handleSurah(sock, from, msg, query) {
    if (!query) {
        await sendText(sock, from, '❌ Surah number ya name do!\n*Example:* .surah 1  ya  .surah fatiha\n.list ke liye .surahlist', msg);
        return;
    }
    let surah = null;
    const num = parseInt(query);
    if (!isNaN(num) && num >= 1 && num <= 114) {
        surah = QURAN_SURAHS.find(s => s.num === num);
    } else {
        const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        surah = QURAN_SURAHS.find(s => s.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(q) || s.ar.includes(query));
    }
    if (!surah) {
        await sendText(sock, from, '❌ Surah not found. Use .surahlist', msg);
        return;
    }

    try {
        await react(sock, msg, '🫀');
        // Fetch Arabic + English
        const [arRes, enRes] = await Promise.all([
            axios.get(`https://api.alquran.cloud/v1/surah/${surah.num}`, AX),
            axios.get(`https://api.alquran.cloud/v1/surah/${surah.num}/en.sahih`, AX)
        ]);
        const arData = arRes.data?.data;
        const enData = enRes.data?.data;
        if (!arData) throw new Error('API fail');

        let text = `🫀 *${surah.name}* (${surah.ar})\n📖 Surah No: ${surah.num} | Ayahs: ${arData.numberOfAyahs}\n\n`;

        // Send first 10 ayahs or summary if long
        const maxAyah = Math.min(arData.ayahs.length, 8);
        for (let i = 0; i < maxAyah; i++) {
            const a = arData.ayahs[i];
            const e = enData?.ayahs?.[i];
            text += `*${a.numberInSurah}.* ${a.text}\n`;
            if (e) text += `_${e.text}_\n\n`;
        }
        if (arData.ayahs.length > maxAyah) {
            text += `\n... +${arData.ayahs.length - maxAyah} more ayahs\nUse .ayat ${surah.num}:1 for specific`;
        }
        text += `\n${CONFIG.POWERED_BY}`;

        // Split if too long
        if (text.length > 4000) {
            await sock.sendMessage(from, { text: text.slice(0, 4000) }, { quoted: msg });
            await sock.sendMessage(from, { text: text.slice(4000) + CONFIG.BOT_FOOTER }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text }, { quoted: msg });
        }
    } catch (e) {
        await sendText(sock, from, `❌ Quran API error: ${e.message}`, msg);
    }
}

async function handleSurahList(sock, from, msg) {
    let text = '🫀 *Quran Surah List (1-114)*\n\n';
    QURAN_SURAHS.forEach(s => {
        text += `${s.num}. ${s.name}\n`;
    });
    text += `\nUse: .surah <number> or .surah <name>`;
    // Send in parts
    const parts = text.match(/[\s\S]{1,3500}/g) || [text];
    for (const p of parts) {
        await sock.sendMessage(from, { text: p + CONFIG.BOT_FOOTER }, { quoted: msg });
    }
}

async function handleAyat(sock, from, msg, query) {
    // format 2:255 or 36:1
    const m = (query || '').match(/(\d+)[:\s]+(\d+)/);
    if (!m) {
        await sendText(sock, from, '❌ Format: .ayat <surah>:<ayat>\n*Example:* .ayat 2:255', msg);
        return;
    }
    const sn = parseInt(m[1]), an = parseInt(m[2]);
    try {
        const r = await axios.get(`https://api.alquran.cloud/v1/ayah/${sn}:${an}/editions/quran-uthmani,en.sahih`, AX);
        const data = r.data?.data;
        if (!Array.isArray(data) || data.length < 2) throw new Error('Not found');
        const ar = data[0], en = data[1];
        const text = `🫀 *Ayah ${sn}:${an}*\n\n${ar.text}\n\n_${en.text}_\n\n${CONFIG.POWERED_BY}`;
        await sock.sendMessage(from, { text }, { quoted: msg });
    } catch (e) {
        await sendText(sock, from, `❌ Ayah not found: ${e.message}`, msg);
    }
}

async function handleQuranAudio(sock, from, msg, num) {
    const n = parseInt(num);
    if (!n || n < 1 || n > 114) {
        await sendText(sock, from, '❌ .quranaudio <1-114>', msg);
        return;
    }
    // Use everyayah or similar free source
    const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${n}.mp3`; // may not be exact, adjust
    try {
        await react(sock, msg, '🎧');
        await sock.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            caption: `🎧 Surah ${n} Audio\n${CONFIG.POWERED_BY}`
        }, { quoted: msg });
    } catch (e) {
        await sendText(sock, from, `❌ Audio fail. Try later.`, msg);
    }
}

async function handleHadith(sock, from, msg) {
    try {
        const r = await axios.get('https://api.hadith.gading.dev/books/muslim?range=1-300', AX);
        const hadiths = r.data?.data?.hadiths;
        if (!hadiths?.length) throw new Error('no data');
        const h = hadiths[Math.floor(Math.random() * hadiths.length)];
        await sendText(sock, from, `📜 *Hadith*\n\n${h.arab}\n\n_${h.id}_\n\n${CONFIG.POWERED_BY}`, msg);
    } catch {
        await sendText(sock, from, '📜 Hadith fetch fail. Try again.', msg);
    }
}

async function handleDua(sock, from, msg) {
    const duas = [
        'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ\n\n_Rabbana atina fid-dunya hasanatan..._',
        'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ\n\n_Allahumma inni as\'alukal-afiyah_',
        'رَبِّ اشْرَحْ لِي صَدْرِي\n\n_Rabbi ishrah li sadri_'
    ];
    await sendText(sock, from, `🤲 *Dua*\n\n${duas[Math.floor(Math.random() * duas.length)]}`, msg);
}

// ── AWAIS TOOLS ───────────────────────────────────
async function handleGetDp(sock, from, msg) {
    let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        || msg.message?.extendedTextMessage?.contextInfo?.participant
        || from;
    try {
        const pp = await sock.profilePictureUrl(target, 'image');
        await sock.sendMessage(from, {
            image: { url: pp },
            caption: `🖼️ DP of @${target.split('@')[0]}\n${CONFIG.POWERED_BY}`,
            mentions: [target]
        }, { quoted: msg });
    } catch {
        await sendText(sock, from, '❌ Could not fetch DP (private or not set).', msg);
    }
}

async function handleJid(sock, from, msg) {
    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
        || msg.message?.extendedTextMessage?.contextInfo?.participant
        || msg.key.participant
        || from;
    await sendText(sock, from, `🆔 *JID:* \`${target}\``, msg);
}

// ── VIEW ONCE UNLOCK (works on reply to view-once media) ──
async function handleViewOnce(sock, from, msg, emoji = '👁️') {
    try {
        await react(sock, msg, emoji);

        const context = msg.message?.extendedTextMessage?.contextInfo
            || msg.message?.imageMessage?.contextInfo
            || msg.message?.videoMessage?.contextInfo;

        const quoted = context?.quotedMessage;
        if (!quoted) {
            await sendText(sock, from, `❌ *Reply* to a View-Once image/video/audio with this command.\nExample: reply + ${emoji}`, msg);
            return;
        }

        // Support viewOnceMessage / viewOnceMessageV2 / normal media
        let mediaMsg = quoted.viewOnceMessage?.message
            || quoted.viewOnceMessageV2?.message
            || quoted.viewOnceMessageV2Extension?.message
            || quoted;

        const type = Object.keys(mediaMsg || {})[0];
        if (!type || !['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'].includes(type)) {
            await sendText(sock, from, '❌ No unlockable media found in the replied message.', msg);
            return;
        }

        // Download media using Baileys
        const buffer = await require('@whiskeysockets/baileys').downloadMediaMessage(
            { message: mediaMsg, key: { remoteJid: from, id: context.stanzaId || msg.key.id } },
            'buffer',
            {},
            { logger: require('pino')({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage }
        ).catch(() => null);

        if (!buffer) {
            // Fallback: try to re-send using url if available
            const m = mediaMsg[type];
            if (m?.url) {
                const isImg = type === 'imageMessage';
                const isVid = type === 'videoMessage';
                const isAud = type === 'audioMessage';
                if (isImg) await sock.sendMessage(from, { image: { url: m.url }, caption: `${emoji} Unlocked\n${CONFIG.POWERED_BY}` }, { quoted: msg });
                else if (isVid) await sock.sendMessage(from, { video: { url: m.url }, caption: `${emoji} Unlocked\n${CONFIG.POWERED_BY}` }, { quoted: msg });
                else if (isAud) await sock.sendMessage(from, { audio: { url: m.url }, mimetype: m.mimetype || 'audio/ogg; codecs=opus', ptt: !!m.ptt }, { quoted: msg });
                else await sendText(sock, from, '❌ Failed to download media.', msg);
                return;
            }
            await sendText(sock, from, '❌ Failed to download the view-once media.', msg);
            return;
        }

        const m = mediaMsg[type];
        const caption = `${emoji} *Unlocked View-Once*\n${CONFIG.POWERED_BY}`;

        if (type === 'imageMessage') {
            await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg });
        } else if (type === 'videoMessage') {
            await sock.sendMessage(from, { video: buffer, caption, mimetype: m.mimetype || 'video/mp4' }, { quoted: msg });
        } else if (type === 'audioMessage') {
            await sock.sendMessage(from, { audio: buffer, mimetype: m.mimetype || 'audio/ogg; codecs=opus', ptt: !!m.ptt }, { quoted: msg });
        } else if (type === 'stickerMessage') {
            await sock.sendMessage(from, { sticker: buffer }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { document: buffer, mimetype: m.mimetype || 'application/octet-stream', fileName: m.fileName || 'unlocked.bin', caption }, { quoted: msg });
        }
    } catch (e) {
        console.log('ViewOnce error:', e.message);
        await sendText(sock, from, `❌ Unlock failed: ${e.message}`, msg);
    }
}

// ── DPZ LAB ───────────────────────────────────────
const DP_APIS = {
    boy: 'https://api.waifu.pics/sfw/waifu', // fallback random
    girl: 'https://api.waifu.pics/sfw/waifu',
    couple: 'https://api.waifu.pics/sfw/waifu',
    anime: 'https://api.waifu.pics/sfw/waifu',
    random: 'https://picsum.photos/512'
};

async function handleDpz(sock, from, msg, type) {
    try {
        await react(sock, msg, '🧫');
        if (type === 'random') {
            await sock.sendMessage(from, {
                image: { url: `https://picsum.photos/512?random=${Date.now()}` },
                caption: `🖼️ Random DP\n${CONFIG.POWERED_BY}`
            }, { quoted: msg });
            return;
        }
        // Use waifu.pics for anime style
        const r = await axios.get('https://api.waifu.pics/sfw/waifu', AX);
        const url = r.data?.url;
        if (!url) throw new Error('no url');
        await sock.sendMessage(from, {
            image: { url },
            caption: `🖼️ ${type.toUpperCase()} DP\n${CONFIG.POWERED_BY}`
        }, { quoted: msg });
    } catch (e) {
        await sendText(sock, from, `❌ DP fail: ${e.message}`, msg);
    }
}

// ── GEMINI AI (Google free API) ───────────────────
const AI_SYSTEM = `You are Awais AI, a smart, friendly and helpful WhatsApp assistant.
You were created by Awais Mayo Hacker.
Important identity rules (always follow):
- If anyone asks who made you, who created you, kisne banaya, who is your developer/owner/creator → answer clearly: "I was created by Awais Mayo Hacker."
- If anyone asks who are you, kon ho, what is your name → answer: "I am Awais AI."
- Never say you are Google, Gemini, ChatGPT, or any other AI brand.
- You can speak in English and Roman Urdu / simple Urdu when the user does.
- Be helpful, clear and respectful. Keep answers not too long for WhatsApp.`;

function isIdentityQuestion(text) {
    const t = (text || '').toLowerCase();
    const whoMade = /(who made you|who created you|kisne banaya|kis ne banaya|who is your (creator|developer|owner|maker)|your creator|your developer|tumhe kisne|tune kisne)/i;
    const whoAre = /(who are you|kon ho|what are you|what's your name|what is your name|tum kaun|your name)/i;
    if (whoMade.test(t)) return 'maker';
    if (whoAre.test(t)) return 'self';
    return null;
}

// ── GEMINI MODELS ─────────────────────────────────
// Google models retire karta rehta hai, isliye ek ki jagah list use hoti hai:
// jo model band/limit pe ho bot khud agle pe chala jata hai, aur jo chal gaya wo yaad rakhta hai.
// Apna model pehle chalana ho to .env mein daalo:  GEMINI_MODEL=model-name
const GEMINI_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
];
let geminiGoodModel = null; // last model jo kaam kiya

async function callGemini(apiKey, userText) {
    const models = [...new Set([geminiGoodModel, process.env.GEMINI_MODEL, ...GEMINI_MODELS].filter(Boolean))];
    const body = {
        system_instruction: { parts: [{ text: AI_SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048 // thinking models ke tokens bhi isi mein ginay jaate hain
        }
    };

    let lastHttpErr = null, sawEmpty = false;
    for (const model of models) {
        try {
            const r = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
                body,
                { timeout: 45000, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey } }
            );
            const parts = r.data?.candidates?.[0]?.content?.parts || [];
            const reply = parts.filter(p => p && p.text && !p.thought).map(p => p.text).join('').trim();
            if (reply) {
                if (geminiGoodModel !== model) console.log('[AI] using model:', model);
                geminiGoodModel = model;
                return reply;
            }
            sawEmpty = true;
            console.log('[AI] empty reply from', model, r.data?.candidates?.[0]?.finishReason || r.data?.promptFeedback?.blockReason || '');
        } catch (e) {
            const status = e.response?.status;
            const raw = e.response?.data?.error?.message || e.message || '';
            console.log(`[AI] ${model} fail (${status || 'no response'}): ${String(raw).slice(0, 120)}`);
            if (geminiGoodModel === model) geminiGoodModel = null;
            lastHttpErr = e;
            // Key hi galat ho to doosre models try karne ka faida nahi
            if (/API key not valid|API_KEY_INVALID|API key expired/i.test(raw)) throw e;
            // Model band (404) / limit (429) / permission (403) / server (5xx) -> agla model; baaki (timeout, 400) -> ruk jao
            if (![403, 404, 429, 500, 502, 503, 504].includes(status)) throw e;
        }
    }
    if (lastHttpErr && !sawEmpty) throw lastHttpErr;
    return '';
}

async function handleGeminiAI(sock, from, msg, userText) {
    // Fast local identity answers (no API needed)
    const idType = isIdentityQuestion(userText);
    if (idType === 'maker') {
        await sendText(sock, from, '👑 I was created by *Awais Mayo Hacker*.', msg);
        return;
    }
    if (idType === 'self') {
        await sendText(sock, from, '🤖 I am *Awais AI* — your smart WhatsApp assistant.\nCreated by *Awais Mayo Hacker*.', msg);
        return;
    }

    const apiKey = CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
        await sendText(sock, from, '❌ Gemini API key not set.\n\n1. Get free key: https://aistudio.google.com/apikey\n2. Put it in `.env` as:\nGEMINI_API_KEY=your_key_here\n3. Restart the bot.', msg);
        return;
    }

    try {
        await react(sock, msg, '🤖');
        try { await sock.sendPresenceUpdate('composing', from); } catch {}

        const reply = await callGemini(apiKey, userText);

        if (!reply) {
            await sendText(sock, from, '❌ Awais AI gave empty response. Try again.', msg);
            return;
        }

        // Split long replies for WhatsApp
        if (reply.length > 4000) {
            const chunks = reply.match(/[\s\S]{1,3900}/g) || [reply];
            for (const chunk of chunks) {
                await sock.sendMessage(from, { text: chunk }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(from, { text: reply + CONFIG.BOT_FOOTER }, { quoted: msg });
        }
    } catch (e) {
        const errMsg = e.response?.data?.error?.message || e.message || 'Unknown error';
        console.log('Gemini error:', errMsg);
        if (/API key not valid|API_KEY_INVALID|API key expired/i.test(errMsg)) {
            await sendText(sock, from, '❌ Invalid Gemini API key. Get a free key from:\nhttps://aistudio.google.com/apikey', msg);
        } else if (e.response?.status === 429) {
            await sendText(sock, from, '⏳ Gemini ki free limit poori ho gayi hai. Thori der baad dobara try karo.', msg);
        } else {
            await sendText(sock, from, `❌ Awais AI error: ${String(errMsg).slice(0, 150)}`, msg);
        }
    }
}

// ── MAIN COMMAND HANDLER ──────────────────────────
async function handleCommands(sock, msg, sessionChatId) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const isFromMe = msg.key.fromMe;
    const sender = msg.key.participant || from;
    const senderN = sender.split('@')[0];

    const text = msg.message?.conversation
        || msg.message?.extendedTextMessage?.text
        || msg.message?.imageMessage?.caption
        || msg.message?.videoMessage?.caption
        || '';
    const cmd = text.trim();
    const cmdL = cmd.toLowerCase();
    const args = cmd.slice(1).trim().split(/\s+/);
    const command = (args[0] || '').toLowerCase();
    const q = args.slice(1).join(' ').trim();

    // Auto react if enabled
    const settings = getSessionSettings(sessionChatId);
    if (settings.autoreacts && !isFromMe && text) {
        const emoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
        await react(sock, msg, emoji);
    }

    // Auto typing
    if (settings.autotyping && text.startsWith('.')) {
        try { await sock.sendPresenceUpdate('composing', from); } catch {}
    }

    // Group meta
    let meta = null, admins = [], botAdmin = false, isAdmin = false, allJids = [];
    if (isGroup) {
        try {
            meta = await sock.groupMetadata(from);
            admins = meta.participants.filter(p => p.admin);
            const botJid = sock.user?.id ? require('@whiskeysockets/baileys').jidNormalizedUser(sock.user.id) : '';
            botAdmin = admins.some(a => require('@whiskeysockets/baileys').jidNormalizedUser(a.id) === botJid);
            isAdmin = isFromMe || admins.some(a => require('@whiskeysockets/baileys').jidNormalizedUser(a.id) === require('@whiskeysockets/baileys').jidNormalizedUser(sender));
            allJids = meta.participants.map(p => p.id);
        } catch {}
    }

    // ── GENERAL ──
    if (command === 'menu' || command === 'help') {
        // Image hamesha show hogi (config se ya default link se)
        const botImg = getBotImg() || DEFAULT_MENU_IMG;
        try {
            await sock.sendMessage(from, {
                image: { url: botImg },
                caption: getFullMenu()
            }, { quoted: msg });
        } catch {
            // Image fail ho to sirf text bhej do
            await sock.sendMessage(from, { text: getFullMenu() }, { quoted: msg });
        }
        // Menu song
        const songPath = getMenuSong();
        if (songPath) {
            try {
                const songBuf = fs.readFileSync(songPath);
                await sock.sendMessage(from, {
                    audio: songBuf,
                    mimetype: 'audio/mpeg',
                    fileName: 'awais_audio.mp3',
                    ptt: false
                });
            } catch {}
        }
        return true;
    }

    if (command === 'info') {
        await sendText(sock, from, `ℹ️ *${CONFIG.BOT_NAME}*\nMulti-Device WhatsApp Bot\nOwner: ${CONFIG.OWNER_NUMBER}\nPowered by Baileys`, msg);
        return true;
    }
    if (command === 'about') {
        await sendText(sock, from, `🖤 *About*\n${CONFIG.BOT_NAME}\nMade with ❤️ by Awais\nYT: ${CONFIG.YT_LINK}`, msg);
        return true;
    }
    if (command === 'rules') {
        await sendText(sock, from, `📜 *Rules*\n1. No spam\n2. No gali in groups (auto kick)\n3. No links without admin\n4. Respect admins\n5. Enjoy the bot!`, msg);
        return true;
    }
    if (command === 'joke') {
        await sendText(sock, from, JOKES[Math.floor(Math.random() * JOKES.length)], msg);
        return true;
    }
    if (command === 'quote') {
        await sendText(sock, from, QUOTES[Math.floor(Math.random() * QUOTES.length)], msg);
        return true;
    }
    if (command === 'time') {
        const now = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
        await sendText(sock, from, `🕐 *Time (PKT):* ${now}`, msg);
        return true;
    }
    if (command === 'setbanner' || command === 'setimage') {
        const url = q;
        if (!url || !url.startsWith('http')) {
            await sendText(sock, from, '❌ Image URL do!\n*Example:* .setimage https://i.ibb.co/xxx.jpg', msg);
            return true;
        }
        const cfg = loadConfig();
        cfg.BOT_IMG = url;
        saveConfig(cfg);
        await sendText(sock, from, '✅ Bot image saved! Check with .menu', msg);
        return true;
    }

    // ── YOUTUBE ──
    if (['play', 'song', 'ytmp3'].includes(command)) {
        const mode = command === 'ytmp3' ? 'link' : 'name';
        await songDownload(sock, from, msg, q, mode);
        return true;
    }
    if (['video', 'ytv', 'ytmp4'].includes(command)) {
        const mode = command === 'ytmp4' ? 'link' : 'name';
        await ytVideoDownload(sock, from, msg, q, mode);
        return true;
    }

    // ── INSTA ──
    if (command === 'insta' || command === 'ig') {
        await instaDownload(sock, from, msg, q);
        return true;
    }

    // ── STUDENT LAB ──
    if (command === 'pdfunlock') { await handlePdfUnlock(sock, from, msg); return true; }
    if (command === 'pdflock') { await handlePdfLock(sock, from, msg, q); return true; }
    if (command === 'zipunlock') { await handleZipUnlock(sock, from, msg); return true; }
    if (command === 'ziplock') { await handleZipLock(sock, from, msg, q); return true; }
    if (command === 'txttofile') { await handleTxtToFile(sock, from, msg, q); return true; }
    if (command === 'filetotxt') { await handleFileToTxt(sock, from, msg); return true; }
    if (command === 'img2pdf') { await handleImg2Pdf(sock, from, msg); return true; }
    if (command === 'pdf2img') { await handlePdf2Img(sock, from, msg); return true; }
    if (command === 'compress') { await handleCompress(sock, from, msg); return true; }
    if (command === 'pdfmerge') { await sendText(sock, from, '📑 PDF merge: reply to PDFs (advanced).', msg); return true; }

    // ── DEV TOOLS ──
    if (command === 'extractweb') { await handleExtractWeb(sock, from, msg, q); return true; }
    if (command === 'webss') { await handleWebSS(sock, from, msg, q); return true; }
    if (command === 'whois') { await handleWhois(sock, from, msg, q); return true; }
    if (command === 'ip') { await handleIp(sock, from, msg, q); return true; }
    if (command === 'ping') {
        const start = Date.now();
        await sendText(sock, from, `🏓 Pong! ${Date.now() - start}ms`, msg);
        return true;
    }
    if (command === 'runtime') {
        const up = process.uptime();
        const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60), s = Math.floor(up % 60);
        await sendText(sock, from, `⏱️ Runtime: ${h}h ${m}m ${s}s`, msg);
        return true;
    }
    if (command === 'base64') {
        if (!q) { await sendText(sock, from, '❌ Provide text', msg); return true; }
        await sendText(sock, from, `\`\`\`${Buffer.from(q).toString('base64')}\`\`\``, msg);
        return true;
    }
    if (command === 'decode64') {
        if (!q) { await sendText(sock, from, '❌ Provide base64 string', msg); return true; }
        try {
            await sendText(sock, from, Buffer.from(q, 'base64').toString('utf8'), msg);
        } catch { await sendText(sock, from, '❌ Invalid base64', msg); }
        return true;
    }

    // ── ISLAMIC ──
    if (command === 'quran' || command === 'surah') { await handleSurah(sock, from, msg, q); return true; }
    if (command === 'surahlist') { await handleSurahList(sock, from, msg); return true; }
    if (command === 'ayat') { await handleAyat(sock, from, msg, q); return true; }
    if (command === 'quranaudio') { await handleQuranAudio(sock, from, msg, q); return true; }
    if (command === 'hadith') { await handleHadith(sock, from, msg); return true; }
    if (command === 'dua') { await handleDua(sock, from, msg); return true; }
    if (command === 'tasbeeh') {
        await sendText(sock, from, '📿 *Tasbeeh*\nSubhanAllah 33\nAlhamdulillah 33\nAllahu Akbar 34\n\nTotal 100', msg);
        return true;
    }
    // Shortcut popular surahs
    const popular = {
        'fatiha': 1, 'yasin': 36, 'mulk': 67, 'rahman': 55, 'kahf': 18,
        'waqiah': 56, 'ikhlas': 112, 'nas': 114, 'falaq': 113, 'kawthar': 108
    };
    if (popular[command]) {
        await handleSurah(sock, from, msg, String(popular[command]));
        return true;
    }

    // ── AWAIS TOOLS ──
    if (command === 'autoreacts') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'autoreacts', true); await sendText(sock, from, '✅ Auto-Reacts *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'autoreacts', false); await sendText(sock, from, '✅ Auto-Reacts *OFF*', msg); }
        else await sendText(sock, from, `Auto-Reacts: *${settings.autoreacts ? 'ON' : 'OFF'}*\nUsage: .autoreacts on/off`, msg);
        return true;
    }
    if (command === 'autotyping') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'autotyping', true); await sendText(sock, from, '✅ Auto-Typing *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'autotyping', false); await sendText(sock, from, '✅ Auto-Typing *OFF*', msg); }
        else await sendText(sock, from, `Auto-Typing: *${settings.autotyping ? 'ON' : 'OFF'}*\nUsage: .autotyping on/off`, msg);
        return true;
    }
    if (command === 'autorecording') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'autorecording', true); await sendText(sock, from, '✅ Auto-Recording *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'autorecording', false); await sendText(sock, from, '✅ Auto-Recording *OFF*', msg); }
        else await sendText(sock, from, `Auto-Recording: *${settings.autorecording ? 'ON' : 'OFF'}*`, msg);
        return true;
    }
    if (command === 'statusseen') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'statusSeen', true); await sendText(sock, from, '✅ Status Seen *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'statusSeen', false); await sendText(sock, from, '✅ Status Seen *OFF*', msg); }
        else await sendText(sock, from, `Status Seen: *${settings.statusSeen ? 'ON' : 'OFF'}*`, msg);
        return true;
    }
    if (command === 'statusreact') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'statusReact', true); await sendText(sock, from, '✅ Status React *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'statusReact', false); await sendText(sock, from, '✅ Status React *OFF*', msg); }
        else await sendText(sock, from, `Status React: *${settings.statusReact ? 'ON' : 'OFF'}*`, msg);
        return true;
    }

    // Anti features
    if (command === 'antidelete') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'antidelete', true); await sendText(sock, from, '✅ Anti-Delete *ON*\nDeleted messages will be recovered.', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'antidelete', false); await sendText(sock, from, '✅ Anti-Delete *OFF*', msg); }
        else await sendText(sock, from, `Anti-Delete: *${settings.antidelete ? 'ON' : 'OFF'}*\nUsage: .antidelete on/off`, msg);
        return true;
    }
    if (command === 'antiedit') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'antiedit', true); await sendText(sock, from, '✅ Anti-Edit *ON*\nEdited messages will be shown.', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'antiedit', false); await sendText(sock, from, '✅ Anti-Edit *OFF*', msg); }
        else await sendText(sock, from, `Anti-Edit: *${settings.antiedit ? 'ON' : 'OFF'}*\nUsage: .antiedit on/off`, msg);
        return true;
    }
    if (command === 'antigali') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'antigali', true); await sendText(sock, from, '✅ Anti-Abuse *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'antigali', false); await sendText(sock, from, '✅ Anti-Abuse *OFF*', msg); }
        else await sendText(sock, from, `Anti-Abuse: *${settings.antigali !== false ? 'ON' : 'OFF'}*\nUsage: .antigali on/off`, msg);
        return true;
    }
    if (command === 'antilink') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'antilink', true); await sendText(sock, from, '✅ Anti-Link *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'antilink', false); await sendText(sock, from, '✅ Anti-Link *OFF*', msg); }
        else await sendText(sock, from, `Anti-Link: *${settings.antilink !== false ? 'ON' : 'OFF'}*\nUsage: .antilink on/off`, msg);
        return true;
    }
    if (command === 'antiemoji') {
        if (q === 'on') { setSessionSetting(sessionChatId, 'antiemoji', true); await sendText(sock, from, '✅ Anti-Emoji *ON*', msg); }
        else if (q === 'off') { setSessionSetting(sessionChatId, 'antiemoji', false); await sendText(sock, from, '✅ Anti-Emoji *OFF*', msg); }
        else await sendText(sock, from, `Anti-Emoji: *${settings.antiemoji !== false ? 'ON' : 'OFF'}*\nUsage: .antiemoji on/off`, msg);
        return true;
    }

    if (command === 'getdp') { await handleGetDp(sock, from, msg); return true; }
    if (command === 'jid') { await handleJid(sock, from, msg); return true; }

    // View-Once unlock commands (reply to view-once media)
    const vvEmojis = ['vv', 'vv2', '💓', '💗', '💖', '💘', '💝', '💞', '💟', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '😻', '😘', '🫀'];
    if (vvEmojis.includes(command) || command.startsWith('v')) {
        const emoji = ['vv', 'vv2'].includes(command) ? '👁️' : (command.replace(/^v/, '') || '👁️');
        await handleViewOnce(sock, from, msg, emoji.length < 3 ? emoji : command);
        return true;
    }

    // ── GROUP COMMANDS ──
    if (isGroup && isAdmin) {
        if (command === 'tagall') {
            let t = `📢 *ATTENTION!*\n\n`;
            allJids.forEach(j => { t += `@${j.split('@')[0]} `; });
            await sock.sendMessage(from, { text: t + CONFIG.BOT_FOOTER, mentions: allJids });
            return true;
        }
        if (command === 'kick') {
            const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (target && botAdmin) {
                await sock.groupParticipantsUpdate(from, [target], 'remove');
                await sendText(sock, from, `🚫 @${target.split('@')[0]} kicked!`, msg);
            } else await sendText(sock, from, '❌ Mention user + bot must be admin', msg);
            return true;
        }
        if (command === 'warn') {
            const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) { await sendText(sock, from, '❌ Mention a user to warn', msg); return true; }
            global.__warns = global.__warns || {};
            const key = `${from}_${target}`;
            global.__warns[key] = (global.__warns[key] || 0) + 1;
            const count = global.__warns[key];
            await sock.sendMessage(from, { text: `⚠️ @${target.split('@')[0]} warned (${count}/3)\n${CONFIG.BOT_FOOTER}`, mentions: [target] }, { quoted: msg });
            if (count >= 3 && botAdmin) {
                await sock.groupParticipantsUpdate(from, [target], 'remove');
                await sendText(sock, from, `🚫 @${target.split('@')[0]} removed after 3 warnings`, msg);
                global.__warns[key] = 0;
            }
            return true;
        }
        if (command === 'unwarn') {
            const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!target) { await sendText(sock, from, '❌ Mention a user', msg); return true; }
            global.__warns = global.__warns || {};
            const key = `${from}_${target}`;
            global.__warns[key] = 0;
            await sendText(sock, from, `✅ Warnings cleared for @${target.split('@')[0]}`, msg);
            return true;
        }
        if (command === 'promote') {
            const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (target && botAdmin) {
                await sock.groupParticipantsUpdate(from, [target], 'promote');
                await sendText(sock, from, `⬆️ Promoted @${target.split('@')[0]}`, msg);
            } else await sendText(sock, from, '❌ Mention + bot admin needed', msg);
            return true;
        }
        if (command === 'demote') {
            const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (target && botAdmin) {
                await sock.groupParticipantsUpdate(from, [target], 'demote');
                await sendText(sock, from, `⬇️ Demoted @${target.split('@')[0]}`, msg);
            } else await sendText(sock, from, '❌ Mention + bot admin needed', msg);
            return true;
        }
        if (command === 'hidetag') {
            await sock.sendMessage(from, { text: (q || 'Hidetag') + CONFIG.BOT_FOOTER, mentions: allJids });
            return true;
        }
        if (command === 'groupinfo') {
            await sendText(sock, from, `👥 *${meta.subject}*\nMembers: ${meta.participants.length}\nAdmins: ${admins.length}\nDesc: ${meta.desc || 'N/A'}`, msg);
            return true;
        }
        if (command === 'link') {
            try {
                const code = await sock.groupInviteCode(from);
                await sendText(sock, from, `🔗 https://chat.whatsapp.com/${code}`, msg);
            } catch { await sendText(sock, from, '❌ Could not get link (is bot admin?)', msg); }
            return true;
        }
        if (command === 'revoke') {
            try {
                await sock.groupRevokeInvite(from);
                await sendText(sock, from, '✅ Invite link revoked!', msg);
            } catch { await sendText(sock, from, '❌ Fail', msg); }
            return true;
        }
        if (command === 'setname') {
            if (q && botAdmin) {
                await sock.groupUpdateSubject(from, q);
                await sendText(sock, from, '✅ Group name updated!', msg);
            } else await sendText(sock, from, '❌ Provide a name + bot must be admin', msg);
            return true;
        }
        if (command === 'setdesc') {
            if (q && botAdmin) {
                await sock.groupUpdateDescription(from, q);
                await sendText(sock, from, '✅ Description updated!', msg);
            } else await sendText(sock, from, '❌ Provide description + bot must be admin', msg);
            return true;
        }
        if (command === 'listadmin') {
            let t = '👑 *Admins*\n';
            admins.forEach(a => t += `@${a.id.split('@')[0]}\n`);
            await sock.sendMessage(from, { text: t + CONFIG.BOT_FOOTER, mentions: admins.map(a => a.id) });
            return true;
        }
        if (command === 'mute' || command === 'lock') {
            if (botAdmin) {
                await sock.groupSettingUpdate(from, 'announcement');
                await sendText(sock, from, '🔒 Group locked (only admins can send messages)', msg);
            }
            return true;
        }
        if (command === 'unmute' || command === 'unlock') {
            if (botAdmin) {
                await sock.groupSettingUpdate(from, 'not_announcement');
                await sendText(sock, from, '🔓 Group unlocked', msg);
            }
            return true;
        }
        // Welcome / Goodbye
        if (command === 'welcome') {
            if (q === 'on') { setSessionSetting(sessionChatId, 'welcome', true); await sendText(sock, from, '✅ Welcome messages *ON*', msg); }
            else if (q === 'off') { setSessionSetting(sessionChatId, 'welcome', false); await sendText(sock, from, '✅ Welcome messages *OFF*', msg); }
            else await sendText(sock, from, `Welcome: *${settings.welcome ? 'ON' : 'OFF'}*\nUsage: .welcome on/off`, msg);
            return true;
        }
        if (command === 'goodbye') {
            if (q === 'on') { setSessionSetting(sessionChatId, 'goodbye', true); await sendText(sock, from, '✅ Goodbye messages *ON*', msg); }
            else if (q === 'off') { setSessionSetting(sessionChatId, 'goodbye', false); await sendText(sock, from, '✅ Goodbye messages *OFF*', msg); }
            else await sendText(sock, from, `Goodbye: *${settings.goodbye ? 'ON' : 'OFF'}*\nUsage: .goodbye on/off`, msg);
            return true;
        }
        if (command === 'setwelcome') {
            if (!q) { await sendText(sock, from, '❌ Write a message.\nExample: .setwelcome Welcome @user to the group!', msg); return true; }
            setSessionSetting(sessionChatId, 'welcomeMsg', q);
            await sendText(sock, from, '✅ Custom welcome message saved!', msg);
            return true;
        }
        if (command === 'setgoodbye') {
            if (!q) { await sendText(sock, from, '❌ Write a message.\nExample: .setgoodbye Goodbye @user!', msg); return true; }
            setSessionSetting(sessionChatId, 'goodbyeMsg', q);
            await sendText(sock, from, '✅ Custom goodbye message saved!', msg);
            return true;
        }
    }

    // ── NEW GENERAL ──
    if (command === 'date') {
        const d = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        await sendText(sock, from, `📅 *Date:* ${d}`, msg); return true;
    }
    if (command === 'owner') {
        await sendText(sock, from, `👑 *Owner*\nNumber: ${CONFIG.OWNER_NUMBER}\nBot: ${CONFIG.BOT_NAME}`, msg); return true;
    }
    if (command === 'script' || command === 'support') {
        await sendText(sock, from, `📜 *${CONFIG.BOT_NAME}*\nPremium Multi-Device Bot\nYT: ${CONFIG.YT_LINK}\nSupport: Contact Owner`, msg); return true;
    }

    // ── DOWNLOAD EXTRAS ──
    if (command === 'tiktok') {
        if (!q) { await sendText(sock, from, '❌ Give TikTok link\nExample: .tiktok https://tiktok.com/...', msg); return true; }
        try {
            await react(sock, msg, '📥');
            const r = await axios.get(`https://api.vreden.my.id/api/tiktok?url=${encodeURIComponent(q)}`, AX);
            const d = r.data?.result || r.data?.data;
            const video = d?.video || d?.play || d?.url;
            if (video) await sock.sendMessage(from, { video: { url: video }, caption: `✅ TikTok\n${CONFIG.POWERED_BY}` }, { quoted: msg });
            else await sendText(sock, from, '❌ Download failed', msg);
        } catch (e) { await sendText(sock, from, `❌ ${e.message}`, msg); }
        return true;
    }
    if (command === 'facebook' || command === 'fb') {
        if (!q) { await sendText(sock, from, '❌ Give Facebook link', msg); return true; }
        try {
            await react(sock, msg, '📥');
            const r = await axios.get(`https://api.vreden.my.id/api/fbdownload?url=${encodeURIComponent(q)}`, AX);
            const d = r.data?.result || r.data?.data;
            const video = d?.video || d?.url || (Array.isArray(d) ? d[0]?.url : null);
            if (video) await sock.sendMessage(from, { video: { url: video }, caption: `✅ Facebook\n${CONFIG.POWERED_BY}` }, { quoted: msg });
            else await sendText(sock, from, '❌ Download failed', msg);
        } catch (e) { await sendText(sock, from, `❌ ${e.message}`, msg); }
        return true;
    }
    if (command === 'twitter' || command === 'x') {
        if (!q) { await sendText(sock, from, '❌ Give Twitter/X link', msg); return true; }
        try {
            await react(sock, msg, '📥');
            const r = await axios.get(`https://api.vreden.my.id/api/twitter?url=${encodeURIComponent(q)}`, AX);
            const d = r.data?.result || r.data?.data;
            const media = d?.video || d?.url || d?.media;
            if (media) await sock.sendMessage(from, { video: { url: media }, caption: `✅ Twitter/X\n${CONFIG.POWERED_BY}` }, { quoted: msg });
            else await sendText(sock, from, '❌ Download failed', msg);
        } catch (e) { await sendText(sock, from, `❌ ${e.message}`, msg); }
        return true;
    }
    if (command === 'mediafire') {
        if (!q) { await sendText(sock, from, '❌ Give MediaFire link', msg); return true; }
        try {
            const r = await axios.get(`https://api.vreden.my.id/api/mediafiredl?url=${encodeURIComponent(q)}`, AX);
            const d = r.data?.result || r.data?.data;
            await sendText(sock, from, `📁 *MediaFire*\nName: ${d?.filename || 'file'}\nSize: ${d?.filesize || 'N/A'}\nLink: ${d?.url || d?.download || 'N/A'}`, msg);
        } catch (e) { await sendText(sock, from, `❌ ${e.message}`, msg); }
        return true;
    }

    // ── STUDENT EXTRAS ──
    if (command === 'calc') {
        if (!q) { await sendText(sock, from, '❌ Example: .calc 2+2*5', msg); return true; }
        try {
            const safe = q.replace(/[^0-9+\-*/().%\s]/g, '');
            const result = Function(`"use strict"; return (${safe})`)();
            await sendText(sock, from, `🧮 *Result:* ${result}`, msg);
        } catch { await sendText(sock, from, '❌ Invalid expression', msg); }
        return true;
    }
    if (command === 'translate' || command === 'tr') {
        if (!q) { await sendText(sock, from, '❌ Example: .translate en|Hello world\nOr: .translate Hello world', msg); return true; }
        try {
            let lang = 'en', text = q;
            const m = q.match(/^([a-z]{2})\|(.+)/i);
            if (m) { lang = m[1]; text = m[2]; }
            const r = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`, AX);
            const out = r.data?.responseData?.translatedText;
            await sendText(sock, from, `🌐 *Translation (${lang})*\n\n${out || 'Failed'}`, msg);
        } catch (e) { await sendText(sock, from, `❌ ${e.message}`, msg); }
        return true;
    }
    if (command === 'dictionary' || command === 'dict') {
        if (!q) { await sendText(sock, from, '❌ Example: .dictionary hello', msg); return true; }
        try {
            const r = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`, AX);
            const d = r.data?.[0];
            const meaning = d?.meanings?.[0]?.definitions?.[0]?.definition || 'No definition';
            await sendText(sock, from, `📖 *${d?.word || q}*\n\n${meaning}`, msg);
        } catch { await sendText(sock, from, '❌ Word not found', msg); }
        return true;
    }
    if (command === 'wiki') {
        if (!q) { await sendText(sock, from, '❌ Example: .wiki Albert Einstein', msg); return true; }
        try {
            const r = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`, AX);
            await sendText(sock, from, `📚 *${r.data?.title}*\n\n${(r.data?.extract || 'No info').slice(0, 1500)}`, msg);
        } catch { await sendText(sock, from, '❌ Not found', msg); }
        return true;
    }

    // ── DEV EXTRAS ──
    if (command === 'hash') {
        if (!q) { await sendText(sock, from, '❌ Example: .hash hello', msg); return true; }
        const crypto = require('crypto');
        const md5 = crypto.createHash('md5').update(q).digest('hex');
        const sha = crypto.createHash('sha256').update(q).digest('hex');
        await sendText(sock, from, `🔐 *Hash*\nMD5: \`${md5}\`\nSHA256: \`${sha}\``, msg); return true;
    }
    if (command === 'uuid') {
        const crypto = require('crypto');
        await sendText(sock, from, `🆔 \`${crypto.randomUUID()}\``, msg); return true;
    }
    if (command === 'password' || command === 'pass') {
        const len = parseInt(q) || 12;
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
        let pass = '';
        for (let i = 0; i < Math.min(len, 32); i++) pass += chars[Math.floor(Math.random() * chars.length)];
        await sendText(sock, from, `🔑 *Password:* \`${pass}\``, msg); return true;
    }
    if (command === 'qr') {
        if (!q) { await sendText(sock, from, '❌ Example: .qr https://google.com', msg); return true; }
        await sock.sendMessage(from, { image: { url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(q)}` }, caption: `📱 QR Code\n${CONFIG.POWERED_BY}` }, { quoted: msg });
        return true;
    }
    if (command === 'shortlink' || command === 'short') {
        if (!q) { await sendText(sock, from, '❌ Example: .short https://example.com', msg); return true; }
        try {
            const r = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`, AX);
            await sendText(sock, from, `🔗 *Short Link:*\n${r.data}`, msg);
        } catch { await sendText(sock, from, '❌ Failed', msg); }
        return true;
    }
    if (command === 'github' || command === 'gh') {
        if (!q) { await sendText(sock, from, '❌ Example: .github torvalds', msg); return true; }
        try {
            const r = await axios.get(`https://api.github.com/users/${encodeURIComponent(q)}`, AX);
            const d = r.data;
            await sendText(sock, from, `🐙 *GitHub*\nName: ${d.name || d.login}\nBio: ${d.bio || 'N/A'}\nRepos: ${d.public_repos}\nFollowers: ${d.followers}\nURL: ${d.html_url}`, msg);
        } catch { await sendText(sock, from, '❌ User not found', msg); }
        return true;
    }

    // ── ISLAMIC EXTRAS ──
    if (command === 'prayertime' || command === 'prayer') {
        const city = q || 'Karachi';
        try {
            const r = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Pakistan&method=1`, AX);
            const t = r.data?.data?.timings;
            if (!t) throw new Error('fail');
            await sendText(sock, from, `🕌 *Prayer Times — ${city}*\n\nFajr: ${t.Fajr}\nDhuhr: ${t.Dhuhr}\nAsr: ${t.Asr}\nMaghrib: ${t.Maghrib}\nIsha: ${t.Isha}`, msg);
        } catch { await sendText(sock, from, '❌ Could not fetch prayer times', msg); }
        return true;
    }
    if (command === 'hijri') {
        try {
            const r = await axios.get('https://api.aladhan.com/v1/gToH', AX);
            const d = r.data?.data?.hijri;
            await sendText(sock, from, `🌙 *Hijri Date*\n${d?.day} ${d?.month?.en} ${d?.year} AH\n${d?.weekday?.en || ''}`, msg);
        } catch { await sendText(sock, from, '❌ Failed', msg); }
        return true;
    }

    // ── MEDIA CONVERT ──
    if (command === 'toimg' || command === 'toimage') {
        await sendText(sock, from, '🖼️ Reply to a sticker with .toimg to convert it to image.', msg); return true;
    }
    if (command === 'tovideo') {
        await sendText(sock, from, '🎬 Reply to a sticker/gif with .tovideo', msg); return true;
    }
    if (command === 'tomp3') {
        await sendText(sock, from, '🎵 Reply to a video with .tomp3 to extract audio.', msg); return true;
    }
    if (command === 'sticker' || command === 's') {
        await sendText(sock, from, '🎨 Reply to an image/video with .sticker to make a sticker.', msg); return true;
    }
    if (command === 'steal') {
        await sendText(sock, from, '🥷 Reply to a sticker with .steal to take it.', msg); return true;
    }

    // ── GROUP EXTRAS ──
    if (command === 'poll' && isGroup) {
        if (!q || !q.includes('|')) { await sendText(sock, from, '❌ Example: .poll Best color?|Red|Blue|Green', msg); return true; }
        const parts = q.split('|').map(s => s.trim());
        const name = parts[0];
        const values = parts.slice(1).slice(0, 12);
        if (values.length < 2) { await sendText(sock, from, '❌ Need at least 2 options', msg); return true; }
        await sock.sendMessage(from, { poll: { name, values, selectableCount: 1 } });
        return true;
    }
    if (command === 'announce' && isGroup && isAdmin) {
        if (!q) { await sendText(sock, from, '❌ Write announcement text', msg); return true; }
        await sock.sendMessage(from, { text: `📢 *ANNOUNCEMENT*\n\n${q}\n\n${CONFIG.POWERED_BY}`, mentions: allJids });
        return true;
    }

    // ── FUN ──
    if (command === 'meme') {
        try {
            const r = await axios.get('https://meme-api.com/gimme', AX);
            await sock.sendMessage(from, { image: { url: r.data.url }, caption: `😂 ${r.data.title}\n${CONFIG.POWERED_BY}` }, { quoted: msg });
        } catch { await sendText(sock, from, '❌ Meme failed', msg); }
        return true;
    }
    if (command === 'fact') {
        try {
            const r = await axios.get('https://uselessfacts.jsph.pl/api/v2/facts/random', AX);
            await sendText(sock, from, `🧠 *Fact*\n\n${r.data?.text || 'No fact'}`, msg);
        } catch { await sendText(sock, from, '❌ Failed', msg); }
        return true;
    }
    if (command === 'advice') {
        try {
            const r = await axios.get('https://api.adviceslip.com/advice', AX);
            await sendText(sock, from, `💡 *Advice*\n\n${r.data?.slip?.advice || 'Stay positive!'}`, msg);
        } catch { await sendText(sock, from, '💡 Stay positive and keep going!', msg); }
        return true;
    }
    if (command === 'pickup') {
        const lines = [
            'Are you a magician? Because whenever I look at you, everyone else disappears.',
            'Do you have a map? I keep getting lost in your eyes.',
            'Is your name Google? Because you have everything I\'m searching for.',
            'Are you Wi-Fi? Because I feel a connection.'
        ];
        await sendText(sock, from, `💘 ${lines[Math.floor(Math.random() * lines.length)]}`, msg); return true;
    }
    if (command === 'roast') {
        const lines = [
            'You are proof that evolution can go in reverse.',
            'Somewhere out there, a tree is tirelessly producing oxygen for you. You owe it an apology.',
            'You have something on your chin... no, the third one down.',
            'Light travels faster than sound, which is why you seemed bright until you spoke.'
        ];
        await sendText(sock, from, `🔥 ${lines[Math.floor(Math.random() * lines.length)]}`, msg); return true;
    }
    if (command === 'compliment') {
        const lines = [
            'You are awesome, never forget that!',
            'Your energy is contagious in the best way.',
            'You make the world a better place just by being in it.',
            'You have a great sense of humor!'
        ];
        await sendText(sock, from, `💖 ${lines[Math.floor(Math.random() * lines.length)]}`, msg); return true;
    }
    if (command === 'flip') {
        await sendText(sock, from, Math.random() > 0.5 ? '🪙 Heads' : '🪙 Tails', msg); return true;
    }
    if (command === 'roll') {
        const n = parseInt(q) || 6;
        await sendText(sock, from, `🎲 You rolled: *${Math.floor(Math.random() * n) + 1}* (1-${n})`, msg); return true;
    }
    if (command === 'ship') {
        const p = q.split(/[|&+,]/).map(s => s.trim()).filter(Boolean);
        if (p.length < 2) { await sendText(sock, from, '❌ Example: .ship Ali|Sara', msg); return true; }
        const score = Math.floor(Math.random() * 101);
        await sendText(sock, from, `💘 *Ship*\n${p[0]} ❤️ ${p[1]}\nLove Meter: *${score}%*`, msg); return true;
    }
    if (command === 'lovemeter') {
        if (!q) { await sendText(sock, from, '❌ Example: .lovemeter Ali', msg); return true; }
        const score = Math.floor(Math.random() * 101);
        await sendText(sock, from, `❤️ Love Meter for *${q}*: *${score}%*`, msg); return true;
    }
    if (command === 'truth') {
        const list = ['What is your biggest fear?', 'What is the most embarrassing thing you have done?', 'Who was your first crush?', 'What secret have you never told anyone?'];
        await sendText(sock, from, `🔵 *Truth*\n${list[Math.floor(Math.random() * list.length)]}`, msg); return true;
    }
    if (command === 'dare') {
        const list = ['Send a funny voice note', 'Change your status for 1 hour', 'Text your crush "Hi"', 'Do 10 push-ups'];
        await sendText(sock, from, `🔴 *Dare*\n${list[Math.floor(Math.random() * list.length)]}`, msg); return true;
    }
    if (command === 'emojimix') {
        await sendText(sock, from, '😀 Example: .emojimix 😀+🔥\n(Feature needs emoji mix API)', msg); return true;
    }

    // ── DPZ + MORE ──
    if (command === 'boydp') { await handleDpz(sock, from, msg, 'boy'); return true; }
    if (command === 'girldp') { await handleDpz(sock, from, msg, 'girl'); return true; }
    if (command === 'coupledp') { await handleDpz(sock, from, msg, 'couple'); return true; }
    if (command === 'animedp') { await handleDpz(sock, from, msg, 'anime'); return true; }
    if (command === 'randomdp') { await handleDpz(sock, from, msg, 'random'); return true; }
    if (command === 'wallpaper') {
        try {
            await sock.sendMessage(from, { image: { url: `https://picsum.photos/1080/1920?random=${Date.now()}` }, caption: `🖼️ Wallpaper\n${CONFIG.POWERED_BY}` }, { quoted: msg });
        } catch { await sendText(sock, from, '❌ Failed', msg); }
        return true;
    }
    if (command === 'cat') {
        try {
            const r = await axios.get('https://api.thecatapi.com/v1/images/search', AX);
            await sock.sendMessage(from, { image: { url: r.data[0].url }, caption: `🐱 Meow\n${CONFIG.POWERED_BY}` }, { quoted: msg });
        } catch { await sendText(sock, from, '❌ Failed', msg); }
        return true;
    }
    if (command === 'dog') {
        try {
            const r = await axios.get('https://dog.ceo/api/breeds/image/random', AX);
            await sock.sendMessage(from, { image: { url: r.data.message }, caption: `🐶 Woof\n${CONFIG.POWERED_BY}` }, { quoted: msg });
        } catch { await sendText(sock, from, '❌ Failed', msg); }
        return true;
    }

    // ── AI & MORE (Gemini) ──
    if (command === 'gpt' || command === 'ai' || command === 'gemini' || command === 'ask') {
        if (!q) {
            await sendText(sock, from, '❌ Example:\n.ai Who are you?\n.gpt Explain gravity', msg);
            return true;
        }
        await handleGeminiAI(sock, from, msg, q);
        return true;
    }
    if (command === 'imagine') {
        if (!q) {
            await sendText(sock, from, '❌ Example: .imagine a cat astronaut in space', msg);
            return true;
        }
        // Free image gen via Pollinations (no key needed)
        try {
            await react(sock, msg, '🎨');
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(q)}?width=1024&height=1024&nologo=true`;
            await sock.sendMessage(from, {
                image: { url },
                caption: `🎨 *Awais AI Image*\nPrompt: ${q}\n${CONFIG.POWERED_BY}`
            }, { quoted: msg });
        } catch (e) {
            await sendText(sock, from, `❌ Image failed: ${e.message}`, msg);
        }
        return true;
    }
    if (command === 'weather') {
        const city = q || 'Karachi';
        try {
            const r = await axios.get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, AX);
            const c = r.data?.current_condition?.[0];
            await sendText(sock, from, `🌤️ *Weather — ${city}*\nTemp: ${c?.temp_C}°C\nFeels: ${c?.FeelsLikeC}°C\nHumidity: ${c?.humidity}%\nDesc: ${c?.weatherDesc?.[0]?.value}`, msg);
        } catch { await sendText(sock, from, '❌ Weather fetch failed', msg); }
        return true;
    }
    if (command === 'news') {
        try {
            const r = await axios.get('https://www.reddit.com/r/worldnews/top.json?limit=5', { headers: { 'User-Agent': 'AwaisMD/1.0' } });
            const posts = r.data?.data?.children || [];
            let t = '📰 *Top News*\n\n';
            posts.forEach((p, i) => { t += `${i + 1}. ${p.data.title}\n`; });
            await sendText(sock, from, t, msg);
        } catch { await sendText(sock, from, '❌ News failed', msg); }
        return true;
    }
    if (command === 'crypto') {
        try {
            const r = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd', AX);
            const d = r.data;
            await sendText(sock, from, `₿ *Crypto*\nBTC: $${d.bitcoin?.usd}\nETH: $${d.ethereum?.usd}\nSOL: $${d.solana?.usd}`, msg);
        } catch { await sendText(sock, from, '❌ Crypto failed', msg); }
        return true;
    }
    if (command === 'currency') {
        if (!q) { await sendText(sock, from, '❌ Example: .currency 100 USD PKR', msg); return true; }
        try {
            const parts = q.trim().split(/\s+/);
            const amount = parseFloat(parts[0]) || 1;
            const fromC = (parts[1] || 'USD').toUpperCase();
            const toC = (parts[2] || 'PKR').toUpperCase();
            const r = await axios.get(`https://open.er-api.com/v6/latest/${fromC}`, AX);
            const rate = r.data?.rates?.[toC];
            if (!rate) throw new Error('Invalid currency');
            await sendText(sock, from, `💱 *${amount} ${fromC}* = *${(amount * rate).toFixed(2)} ${toC}*`, msg);
        } catch { await sendText(sock, from, '❌ Currency conversion failed', msg); }
        return true;
    }

    // ── AUTO SAFETY (group non-admin) ──
    if (isGroup && botAdmin && !isAdmin && !isFromMe) {
        if (settings.antigali !== false && hasGali(text)) {
            await sock.sendMessage(from, { text: `🚫 @${senderN} *ABUSIVE LANGUAGE!*\n❌ KICK!\n${CONFIG.POWERED_BY}`, mentions: [sender] });
            await new Promise(r => setTimeout(r, 800));
            try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
            return true;
        }
        if (settings.antiemoji !== false && isEmojiOnly(text)) {
            await sock.sendMessage(from, { text: `🚫 @${senderN} *Emoji-only messages not allowed!*\n❌ KICK!`, mentions: [sender] });
            await new Promise(r => setTimeout(r, 800));
            try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
            return true;
        }
        if (settings.antilink !== false && /(https?:\/\/|www\.|t\.me\/|chat\.whatsapp\.com\/)/i.test(text)) {
            await sock.sendMessage(from, { text: `🚫 @${senderN} *Links are not allowed!*\n❌ KICK!`, mentions: [sender] });
            await new Promise(r => setTimeout(r, 800));
            try { await sock.groupParticipantsUpdate(from, [sender], 'remove'); } catch {}
            return true;
        }
    }

    return false; // not handled
}

// Status handler (called from main)
async function handleStatus(sock, msg, sessionChatId) {
    const settings = getSessionSettings(sessionChatId);
    if (!settings.statusSeen && !settings.statusReact) return;

    try {
        if (settings.statusSeen) {
            await sock.readMessages([msg.key]);
        }
        if (settings.statusReact) {
            const emoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];
            await sock.sendMessage(msg.key.remoteJid, {
                react: { text: emoji, key: msg.key }
            });
        }
    } catch (e) {
        // silent
    }
}

module.exports = {
    handleCommands,
    handleStatus,
    getSessionSettings,
    setSessionSetting,
    getFullMenu,
    msgCache
};
