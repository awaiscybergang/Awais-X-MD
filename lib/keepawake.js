/**
 * Keep the bot alive on Termux/Android: acquire a wake-lock so the phone does not
 * suspend Termux (needs the "termux-api" package). Safe no-op on VPS/PC.
 */
const { spawn, spawnSync } = require('child_process');

function isTermux() {
    return /com\.termux/.test(process.env.PREFIX || '') || !!process.env.TERMUX_VERSION;
}

function enable() {
    if (!isTermux()) return false;
    try {
        const r = spawnSync('sh', ['-c', 'command -v termux-wake-lock'], { encoding: 'utf8' });
        if (!r.stdout.trim()) {
            console.log('⚠️ termux-wake-lock not found. Run: pkg install termux-api  (and install the Termux:API app)');
            return false;
        }
        spawn('termux-wake-lock', [], { stdio: 'ignore', detached: true }).unref();
        console.log('🔒 Termux wake-lock ON - the bot keeps running while the phone sleeps.');
        const release = () => { try { spawnSync('termux-wake-unlock'); } catch {} };
        process.on('exit', release);
        return true;
    } catch { return false; }
}

module.exports = { enable, isTermux };
