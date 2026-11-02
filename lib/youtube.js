'use strict';

/**
 * ⚡ AWAIS HACKER MD- YouTube engine
 *
 *  search(query)            -> naam se YouTube pe video dhundta hai (yt-search, fallback play-dl)
 *  download('audio'|'video', url) -> kai tareeko se download try karta hai:
 *       1. eliteprotech API   (ytmp3 / ytmp4, sirf URL leti hai)
 *       2. ytdl-core          (direct)
 *       3. play-dl            (direct, sirf audio)
 *       4. baaki backup APIs  (siputzx, ryzendesu, vreden, ...)
 *       5. cobalt
 *
 *  API ka response format badal jaye tab bhi chalta hai - JSON ke andar se
 *  download link khud dhundh leta hai (pickDownloadUrl).
 *
 *  Naya API add karna ho to neeche PROVIDERS list me ek line add karo.
 */

let axios = null, yts = null, ytdl = null, playdl = null;
try { axios = require('axios'); } catch (e) {}
try { yts = require('yt-search'); } catch (e) {}
try { ytdl = require('@distube/ytdl-core'); } catch (e) {}
try { playdl = require('play-dl'); } catch (e) {}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const LIMITS = {
    audioMaxBytes: 50 * 1024 * 1024,
    videoMaxBytes: 64 * 1024 * 1024,
    videoInlineMaxBytes: 16 * 1024 * 1024, // isse bada ho to document bana ke bhejte hain
    audioMinBytes: 5 * 1024,
    videoMinBytes: 20 * 1024,
    maxAudioSeconds: 60 * 60,
    maxVideoSeconds: 30 * 60
};

// ── Backup/Primary APIs (sab sirf URL leti hain) ───────────────
// primary: true wali sabse pehle try hoti hai.
const PROVIDERS = [
    { name: 'eliteprotech', primary: true, retries: 2,
      audio: 'https://eliteprotech-apis.zone.id/download/ytmp3?url=',
      video: 'https://eliteprotech-apis.zone.id/download/ytmp4?url=' },
    { name: 'siputzx',
      audio: 'https://api.siputzx.my.id/api/d/ytmp3?url=',
      video: 'https://api.siputzx.my.id/api/d/ytmp4?url=' },
    { name: 'ryzendesu',
      audio: 'https://api.ryzendesu.vip/api/downloader/ytmp3?url=',
      video: 'https://api.ryzendesu.vip/api/downloader/ytmp4?url=' },
    { name: 'vreden',
      audio: 'https://api.vreden.my.id/api/ytmp3?url=',
      video: 'https://api.vreden.my.id/api/ytmp4?url=' },
    { name: 'paxsenix', audio: 'https://api.paxsenix.biz.id/yt-mp3?url=' },
    { name: 'agatz',    audio: 'https://agatz.xyz/api/ytmp3?url=' }
];

// ── Small helpers ──────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errMsg = e => String(e && e.message ? e.message : e).slice(0, 90);

function withTimeout(promise, ms, label) {
    let timer;
    const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(label || 'timeout')), ms); });
    return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

async function retry(fn, tries, delay) {
    let last;
    for (let i = 0; i < Math.max(1, tries); i++) {
        try { return await fn(); }
        catch (e) { last = e; if (i < tries - 1) await sleep(delay || 1200); }
    }
    throw last;
}

function collectStream(stream, ms, maxBytes) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0, done = false, timer = null;
        const finish = (err, val) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            if (err) { try { stream.destroy(); } catch (e) {} reject(err); }
            else resolve(val);
        };
        timer = setTimeout(() => finish(new Error('timeout')), ms);
        stream.on('data', c => {
            size += c.length;
            if (size > maxBytes) return finish(new Error('file bahut badi hai'));
            chunks.push(c);
        });
        stream.on('end', () => finish(null, Buffer.concat(chunks)));
        stream.on('error', e => finish(e));
    });
}

// ── URL helpers ────────────────────────────────────────────────
const YT_RE = /(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i;

function extractVideoId(text) {
    const m = String(text || '').match(YT_RE);
    return m ? m[1] : null;
}

// Text me se YouTube link nikaal ke clean "watch?v=" form me deta hai (nahi mila to null)
function normalizeUrl(text) {
    const id = extractVideoId(text);
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

function thumbnailFor(id) {
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

// ── Search (naam -> video) ─────────────────────────────────────
async function search(query) {
    if (yts) {
        for (let i = 0; i < 2; i++) {
            try {
                const res = await withTimeout(yts(query), 15000, 'search timeout');
                const list = (res && res.videos) || [];
                const v = list.find(x => x && x.url && x.seconds > 0) || list.find(x => x && x.url);
                if (v) return {
                    url: v.url, title: v.title, thumbnail: v.thumbnail,
                    duration: v.timestamp || '', seconds: v.seconds || 0,
                    author: (v.author && v.author.name) || ''
                };
                break; // search chali par kuch nahi mila
            } catch (e) {
                console.log('[YT-SEARCH] yt-search fail:', errMsg(e));
                await sleep(800);
            }
        }
    }
    if (playdl) {
        try {
            const r = await withTimeout(playdl.search(query, { limit: 3, source: { youtube: 'video' } }), 15000, 'search timeout');
            const v = (r || []).find(x => x && x.url);
            if (v) return {
                url: v.url, title: v.title,
                thumbnail: (v.thumbnails && v.thumbnails[0] && v.thumbnails[0].url) || thumbnailFor(extractVideoId(v.url)),
                duration: v.durationRaw || '', seconds: v.durationInSec || 0,
                author: (v.channel && v.channel.name) || ''
            };
        } catch (e) {
            console.log('[YT-SEARCH] play-dl fail:', errMsg(e));
        }
    }
    return null;
}

// ── API response parsing (kisi bhi JSON shape me link dhundta hai) ──
const SKIP_KEY = /thumb|image|img|cover|poster|avatar|channel|author|icon|logo|banner/i;
const GOOD_KEY = /download|dl|link|url|file|mp3|mp4|audio|video|stream/i;

function pickDownloadUrl(data, ytUrl) {
    const found = [];
    const walk = (node, key, depth) => {
        if (node == null || depth > 7) return;
        if (typeof node === 'string') {
            const s = node.trim();
            if (!/^https?:\/\//i.test(s)) return;
            if (SKIP_KEY.test(key)) return;
            if (/(?:youtube\.com|youtu\.be|ytimg\.com)\//i.test(s)) return;
            if (/\.(jpe?g|png|webp|gif|svg)(\?|#|$)/i.test(s)) return; // photo/thumbnail download link nahi hota
            if (ytUrl && s === ytUrl) return;
            let score = 0;
            if (GOOD_KEY.test(key)) score += 2;
            if (/\.(mp3|mp4|m4a|webm|opus|aac)(\?|#|$)/i.test(s)) score += 3;
            if (/download|dl|file|stream/i.test(s)) score += 1;
            found.push({ url: s, score });
            return;
        }
        if (Array.isArray(node)) { node.forEach(n => walk(n, key, depth + 1)); return; }
        if (typeof node === 'object') for (const k of Object.keys(node)) walk(node[k], k, depth + 1);
    };
    walk(data, '', 0);
    if (!found.length) return null;
    found.sort((a, b) => b.score - a.score);
    return found[0].url;
}

function pickTitle(d) {
    // BFS: kisi bhi gehrai pe "title" key dhundta hai
    const queue = [[d, 0]];
    while (queue.length) {
        const [node, depth] = queue.shift();
        if (!node || typeof node !== 'object' || depth > 5) continue;
        if (!Array.isArray(node) && typeof node.title === 'string' && node.title.trim()) return node.title.trim();
        for (const k of Object.keys(node)) queue.push([node[k], depth + 1]);
    }
    return '';
}

function parseApiResponse(data, ytUrl) {
    if (data == null) return null;
    if (typeof data === 'string') {
        const s = data.trim();
        return /^https?:\/\/\S+$/i.test(s) ? { dl: s, title: '' } : null;
    }
    if (data.status === false || data.success === false || data.ok === false) {
        throw new Error('API ne error bheja: ' + String(data.message || data.error || 'status false').slice(0, 60));
    }
    const dl = pickDownloadUrl(data, ytUrl);
    return dl ? { dl, title: pickTitle(data) } : null;
}

async function callProvider(p, kind, ytUrl) {
    const base = p[kind];
    if (!base) return null;
    const r = await axios.get(base + encodeURIComponent(ytUrl), {
        timeout: 30000,
        headers: { 'User-Agent': UA, 'Accept': 'application/json,*/*' }
    });
    return parseApiResponse(r.data, ytUrl);
}

async function callCobalt(kind, ytUrl) {
    const body = kind === 'audio'
        ? { url: ytUrl, downloadMode: 'audio', audioFormat: 'mp3', filenameStyle: 'basic' }
        : { url: ytUrl, downloadMode: 'auto', filenameStyle: 'basic', videoQuality: '480' };
    const r = await axios.post('https://api.cobalt.tools/', body, {
        timeout: 30000,
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': UA }
    });
    return r.data && r.data.url ? { dl: r.data.url, title: '' } : null;
}

// ── Buffer download + validation ───────────────────────────────
async function fetchBuffer(url, kind) {
    const max = kind === 'audio' ? LIMITS.audioMaxBytes : LIMITS.videoMaxBytes;
    const r = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: kind === 'audio' ? 90000 : 150000,
        maxContentLength: max, maxBodyLength: max, maxRedirects: 5,
        headers: { 'User-Agent': UA, 'Accept': '*/*' }
    });
    return Buffer.from(r.data);
}

// HTML / JSON error page ko media samajhne se bachata hai
function isMedia(buf, kind) {
    if (!buf || !buf.length) return false;
    const min = kind === 'audio' ? LIMITS.audioMinBytes : LIMITS.videoMinBytes;
    if (buf.length < min) return false;
    const first = buf[0];
    if (first === 0x3c || first === 0x7b) return false; // '<' ya '{'
    return true;
}

// ── Direct methods ─────────────────────────────────────────────
async function viaYtdl(kind, ytUrl) {
    if (!ytdl || !ytdl.validateURL(ytUrl)) return null;
    const info = await withTimeout(
        ytdl.getInfo(ytUrl, { requestOptions: { headers: { 'User-Agent': UA } } }), 25000, 'getInfo timeout');
    let format;
    if (kind === 'audio') {
        format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });
    } else {
        const formats = ytdl.filterFormats(info.formats, f => f.container === 'mp4' && f.hasVideo && f.hasAudio);
        format = formats.find(f => f.qualityLabel === '480p') || formats.find(f => f.qualityLabel === '360p') || formats[0];
    }
    if (!format) return null;
    const max = kind === 'audio' ? LIMITS.audioMaxBytes : LIMITS.videoMaxBytes;
    const buffer = await collectStream(ytdl.downloadFromInfo(info, { format }), kind === 'audio' ? 90000 : 150000, max);
    return { buffer, title: (info.videoDetails && info.videoDetails.title) || '' };
}

async function viaPlayDlAudio(ytUrl) {
    if (!playdl) return null;
    const s = await withTimeout(playdl.stream(ytUrl, { quality: 2 }), 25000, 'play-dl timeout');
    const buffer = await collectStream(s.stream, 90000, LIMITS.audioMaxBytes);
    return { buffer, title: '' };
}

// ── Main: download ─────────────────────────────────────────────
function buildMethods(kind, ytUrl) {
    const methods = [];
    const viaApi = p => async () => {
        const r = await retry(() => callProvider(p, kind, ytUrl), p.retries || 1, 1500);
        if (!r || !r.dl) return null;
        return { buffer: await fetchBuffer(r.dl, kind), title: r.title };
    };

    PROVIDERS.filter(p => p.primary && p[kind]).forEach(p => methods.push([p.name, viaApi(p)]));
    methods.push(['ytdl-core', () => viaYtdl(kind, ytUrl)]);
    if (kind === 'audio') methods.push(['play-dl', () => viaPlayDlAudio(ytUrl)]);
    PROVIDERS.filter(p => !p.primary && p[kind]).forEach(p => methods.push([p.name, viaApi(p)]));
    methods.push(['cobalt', async () => {
        const r = await callCobalt(kind, ytUrl);
        if (!r || !r.dl) return null;
        return { buffer: await fetchBuffer(r.dl, kind), title: r.title };
    }]);
    return methods;
}

/**
 * @param {'audio'|'video'} kind
 * @param {string} ytUrl  clean YouTube URL
 * @param {(msg:string)=>void} [log]
 * @returns {Promise<{ok:true,buffer:Buffer,title:string,source:string}|{ok:false,errors:string[]}>}
 */
async function download(kind, ytUrl, log) {
    log = log || (() => {});
    if (!axios) return { ok: false, errors: ['axios install nahi hai (npm install karo)'] };
    const errors = [];
    for (const [name, fn] of buildMethods(kind, ytUrl)) {
        try {
            log(`${name} try ho raha hai...`);
            const r = await fn();
            if (r && isMedia(r.buffer, kind)) {
                log(`${name} kaam kiya ✅ (${r.buffer.length} bytes)`);
                return { ok: true, buffer: r.buffer, title: r.title || '', source: name };
            }
            errors.push(`${name}: khaali/galat file`);
            log(`${name}: khaali/galat file`);
        } catch (e) {
            errors.push(`${name}: ${errMsg(e)}`);
            log(`${name} fail: ${errMsg(e)}`);
        }
    }
    return { ok: false, errors };
}

module.exports = {
    LIMITS, PROVIDERS,
    extractVideoId, normalizeUrl, thumbnailFor,
    search, download,
    pickDownloadUrl, pickTitle, parseApiResponse, isMedia // tests ke liye
};
