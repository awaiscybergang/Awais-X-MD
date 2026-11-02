/**
 * Tiny in-memory sliding-window rate limiter (built-ins only).
 * Used by the Web Pair website so one visitor (or one phone number) cannot request pairing codes again and again
 * (WhatsApp rate-limits numbers / server IPs that ask for too many codes, which would break pairing for everybody).
 */
'use strict';

function createLimiter(opts) {
    const max = Math.max(1, Number(opts && opts.max) || 5);
    const windowMs = Math.max(1000, Number(opts && opts.windowMs) || 60 * 60 * 1000);
    const hits = new Map(); // key -> [timestamps]

    function prune(now, arr) { while (arr.length && now - arr[0] >= windowMs) arr.shift(); }

    return {
        // Count one attempt. { ok:true } or { ok:false, retryAfterSec }
        hit(key, now) {
            now = now || Date.now();
            let arr = hits.get(key);
            if (!arr) { arr = []; hits.set(key, arr); }
            prune(now, arr);
            if (arr.length >= max) return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - arr[0])) / 1000)) };
            arr.push(now);
            return { ok: true, retryAfterSec: 0 };
        },
        // Forget old entries (called from a timer so the Map never grows forever)
        sweep(now) {
            now = now || Date.now();
            for (const [k, arr] of hits) { prune(now, arr); if (!arr.length) hits.delete(k); }
        },
        size() { return hits.size; }
    };
}

module.exports = { createLimiter };
