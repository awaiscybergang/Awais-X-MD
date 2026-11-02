/**
 * Startup banner. Built-ins only. Branding comes ONLY from lib/brand.js (locked).
 *   wide terminal (>= 72 cols)  -> big block-letter banner
 *   narrow terminal (>= 38)     -> compact 3-line banner (phones / Termux)
 *   tiny terminal (< 38)        -> plain text title
 *   no TTY (PM2, cron, Docker)  -> one plain header line (see headerLine)
 */
'use strict';
const os = require('os');
const brand = require('./brand');
const ui = require('./ui');

// Hard-coded banner art (no figlet dependency)
const BIG = [
    ' █████╗ ██╗    ██╗ █████╗ ██╗███████╗   ██╗  ██╗   ███╗   ███╗██████╗',
    '██╔══██╗██║    ██║██╔══██╗██║██╔════╝   ╚██╗██╔╝   ████╗ ████║██╔══██╗',
    '███████║██║ █╗ ██║███████║██║███████╗    ╚███╔╝    ██╔████╔██║██║  ██║',
    '██╔══██║██║███╗██║██╔══██║██║╚════██║    ██╔██╗    ██║╚██╔╝██║██║  ██║',
    '██║  ██║╚███╔███╔╝██║  ██║██║███████║   ██╔╝ ██╗   ██║ ╚═╝ ██║██████╔╝',
    '╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝╚══════╝   ╚═╝  ╚═╝   ╚═╝     ╚═╝╚═════╝'
];
const SMALL = [
    '╔═╗ ╦ ╦ ╔═╗ ╦ ╔═╗    ═╗ ╦    ╔╦╗ ╔╦╗',
    '╠═╣ ║║║ ╠═╣ ║ ╚═╗    ╔╩╦╝    ║║║  ║║',
    '╩ ╩ ╚╩╝ ╩ ╩ ╩ ╚═╝    ╩ ╚═    ╩ ╩ ═╩╝'
];
// Neon gradient (256-color codes): cyan -> blue -> purple
const GRADIENT = [51, 45, 39, 99, 135, 171];

function version() {
    try { return require('../package.json').version || '?'; } catch (e) { return '?'; }
}

function columns() { return process.stdout.columns || 80; }

function line(label, value) { return label.padEnd(14) + ': ' + value; }

// One-line header for logs without a TTY
function headerLine(mode) {
    return brand.BOT_NAME + ' v' + version() + ' | Owner: ' + brand.OWNER + ' | Telegram: ' + brand.TELEGRAM +
        ' | Team: ' + brand.TEAM + ' | Node ' + process.versions.node + ' | ' + process.platform + ' | mode: ' + (mode || 'not set');
}

function art(cols) {
    if (cols >= 72) return BIG.map((r, i) => ui.paint('1;38;5;' + GRADIENT[i], r));
    if (cols >= 38) return SMALL.map((r, i) => ui.paint('1;38;5;' + GRADIENT[i * 2], r));
    return [ui.paint('1;38;5;51', brand.BOT_NAME)];
}

/** Print the banner + branding block. `mode` = saved/current mode text (optional). */
function print(mode) {
    if (!process.stdout.isTTY) { console.log(headerLine(mode)); return; }
    const cols = columns();
    const w = Math.max(10, Math.min(cols - 1, 72)); // never use the last column (avoids wrapping)
    const rule = ui.paint('38;5;99', '═'.repeat(w));
    const out = [''];
    out.push(...art(cols).map(r => ' ' + r));
    out.push(rule);

    const L = (label, value) => ui.paint('38;5;51', label.padEnd(14)) + ui.paint('2', ': ') + ui.paint('1;97', value);
    out.push(L('Bot Name', brand.BOT_NAME));
    out.push(L('Owner', brand.OWNER));
    out.push(L('Telegram', brand.TELEGRAM));
    const team = 'Official Team : ' + brand.TEAM + '  ->  ' + brand.TEAM_URL;
    if (team.length <= cols - 1) {
        out.push(L('Official Team', brand.TEAM + '  ->  ' + brand.TEAM_URL));
    } else { // narrow screen: put the link on its own line so it wraps cleanly
        out.push(L('Official Team', brand.TEAM + '  ->'));
        out.push(ui.paint('38;5;135', brand.TEAM_URL));
    }
    out.push(rule);
    out.push(ui.c.dim(line('Version', version())));
    out.push(ui.c.dim(line('Node', 'v' + process.versions.node)));
    out.push(ui.c.dim(line('Platform', process.platform + ' (' + os.arch() + ')')));
    out.push(ui.c.dim(line('Mode', mode || 'not set')));
    out.push(rule);
    console.log(out.join('\n'));
}

module.exports = { print, headerLine, BIG, SMALL };
