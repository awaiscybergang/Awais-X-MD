/**
 * Small console helpers (colors + error messages).
 * Uses ONLY Node built-ins and old-style syntax, because it can run before
 * dependencies are installed and even on an old Node.js version.
 */
'use strict';

function colorOn(stream) {
    stream = stream || process.stdout;
    return !!stream.isTTY && !process.env.NO_COLOR && process.env.TERM !== 'dumb';
}

// Wrap text in an ANSI code (256-color "38;5;N" or style code) when colors are allowed
function paint(code, text, stream) {
    return colorOn(stream) ? '\x1b[' + code + 'm' + text + '\x1b[0m' : text;
}

const c = {
    cyan: function (t, s) { return paint('38;5;51', t, s); },
    purple: function (t, s) { return paint('38;5;135', t, s); },
    white: function (t, s) { return paint('1;97', t, s); },
    green: function (t, s) { return paint('38;5;84', t, s); },
    yellow: function (t, s) { return paint('38;5;220', t, s); },
    red: function (t, s) { return paint('38;5;203', t, s); },
    dim: function (t, s) { return paint('2', t, s); },
    bold: function (t, s) { return paint('1', t, s); }
};

function ok(msg) { console.log(c.green('✔') + ' ' + msg); }
function info(msg) { console.log(c.cyan('ℹ') + ' ' + msg); }
function warn(msg) { console.log(c.yellow('⚠') + ' ' + msg); }

/**
 * Print an error in one fixed shape:  what failed -> likely cause -> how to fix.
 * `fix` may be a string or an array of lines.
 */
function fail(what, cause, fix) {
    const e = process.stderr;
    const lines = Array.isArray(fix) ? fix : (fix ? [fix] : []);
    console.error('');
    console.error(c.red('✖ ' + what, e));
    if (cause) console.error('  ' + c.yellow('Likely cause:', e) + ' ' + cause);
    if (lines.length) {
        console.error('  ' + c.green('How to fix:', e) + '   ' + lines[0]);
        for (let i = 1; i < lines.length; i++) console.error('                ' + lines[i]);
    }
    console.error('');
}

// Print an error message (full text always, stack only when DEBUG=1)
function errText(e) {
    if (e && e.message) return process.env.DEBUG === '1' && e.stack ? e.stack : e.message;
    return String(e);
}

module.exports = { colorOn, paint, c, ok, info, warn, fail, errText };
