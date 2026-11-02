/**
 * Bootstrap: runs BEFORE any third-party package is loaded.
 * Uses ONLY Node built-ins. (The Node.js >= 18 check itself lives at the top of
 * index.js in plain old syntax, so it still works on a very old Node.js.)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const ui = require('./ui');

const ROOT = path.join(__dirname, '..');
const REQUIRED = [
    '@whiskeysockets/baileys', 'node-telegram-bot-api', 'express', 'pino', 'dotenv', 'axios',
    'yt-search', 'fluent-ffmpeg', '@distube/ytdl-core', 'play-dl'
];
const OPTIONAL = ['ffmpeg-static']; // not available on Android, never blocks startup

function isTermux() {
    return process.platform === 'android' || /com\.termux/.test(process.env.PREFIX || '') || !!process.env.TERMUX_VERSION;
}

// Project files must be next to index.js (wrong working directory / incomplete copy)
function checkProjectFiles() {
    const need = ['package.json', 'awaismain.js', 'awaisconfig.js', 'awaiscode.js'];
    const miss = need.filter(function (f) { return !fs.existsSync(path.join(ROOT, f)); });
    if (!miss.length) return true;
    ui.fail('Project files are missing: ' + miss.join(', '),
        'index.js is not inside the full AWAIS X MD folder (wrong folder or incomplete copy)',
        ['cd into the project folder (the one that contains package.json) and run:  node index.js',
            'Or download/extract the full project again.']);
    process.exit(2);
}

function isInstalled(name) {
    return fs.existsSync(path.join(ROOT, 'node_modules', name, 'package.json'));
}

// Older 6.x builds of Baileys (the WhatsApp library) have a known security flaw and WhatsApp rejects them for some accounts
// ("Logging in..." on the phone, but the bot never links). 6.7.22+ is required; a newer 7.x chosen by the owner is left alone.
const MIN_BAILEYS = [6, 7, 22];
function installedVersion(name) {
    try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', name, 'package.json'), 'utf8')).version || ''; }
    catch (e) { return ''; }
}
function outdatedPackages() {
    const m = /^(\d+)\.(\d+)\.(\d+)/.exec(installedVersion('@whiskeysockets/baileys'));
    if (!m) return [];
    const cur = [+m[1], +m[2], +m[3]];
    if (cur[0] !== 6) return [];
    for (let i = 0; i < 3; i++) {
        if (cur[i] > MIN_BAILEYS[i]) return [];
        if (cur[i] < MIN_BAILEYS[i]) return ['@whiskeysockets/baileys'];
    }
    return [];
}

function missingPackages() {
    return REQUIRED.filter(function (n) { return !isInstalled(n); });
}

// npm 12 (and 11.10+ when enabled) refuses git dependencies by default ("EALLOWGIT"); Baileys needs one.
// Allow them for this project's install when the npm is new enough to know the setting (older npm would only print a warning).
let _npmEnv = null;
function npmEnv() {
    if (_npmEnv) return _npmEnv;
    _npmEnv = {};
    try {
        const r = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['-v'], { encoding: 'utf8', shell: process.platform === 'win32', timeout: 20000 });
        const major = parseInt(String((r && r.stdout) || '').trim().split('.')[0], 10);
        if (major >= 11) _npmEnv = { NPM_CONFIG_ALLOW_GIT: 'all' };
    } catch (e) { /* npm missing: the install error below explains it */ }
    return _npmEnv;
}

function runNpm(extraArgs) {
    return new Promise(function (resolve) {
        const args = ['install', '--no-audit', '--no-fund'].concat(extraArgs);
        const win = process.platform === 'win32';
        let out = '';
        let child;
        try {
            child = spawn(win ? 'npm.cmd' : 'npm', args, { cwd: ROOT, shell: win, stdio: ['ignore', 'pipe', 'pipe'], env: Object.assign({}, process.env, npmEnv()) });
        } catch (e) {
            return resolve({ code: -1, out: String(e.message || e), spawnError: true });
        }
        const started = Date.now();
        const beat = setInterval(function () {
            console.log('  ... still installing (' + Math.round((Date.now() - started) / 1000) + 's)');
        }, 8000);
        child.stdout.on('data', function (d) { out += d; process.stdout.write(d); });
        child.stderr.on('data', function (d) { out += d; process.stderr.write(d); });
        child.on('error', function (e) { clearInterval(beat); resolve({ code: -1, out: out + String(e.message || e), spawnError: true }); });
        child.on('close', function (code) { clearInterval(beat); resolve({ code: code, out: out }); });
    });
}

// Turn raw npm output into a "likely cause" + "how to fix" pair
function explainNpmFailure(res) {
    const t = res.out || '';
    const logm = t.match(/complete log of this run can be found in:\s*(\S+)/i);
    const fix = [];
    let cause = 'npm could not install the packages';
    if (/EALLOWGIT/.test(t)) {
        cause = 'your npm (version 12+) blocks git dependencies by default, and Baileys (the WhatsApp library) needs one';
        fix.unshift('or:   export NPM_CONFIG_ALLOW_GIT=all   and then   node index.js');
        fix.unshift('Run this once, then start again:   npm install --allow-git=all');
    } else if (res.spawnError && /ENOENT/.test(t)) {
        cause = 'npm was not found (Node.js is installed without npm)';
        fix.push('Reinstall Node.js (it includes npm), then run again.');
    } else if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|network|fetch failed|getaddrinfo/i.test(t)) {
        cause = 'no internet connection or the npm registry is unreachable';
        fix.push('Check your internet connection (try: npm ping), then run again.');
    } else if (/ENOSPC/.test(t)) {
        cause = 'the disk is full';
        fix.push('Free some disk space, then run again.');
    } else if (/EACCES|EPERM/.test(t)) {
        cause = 'no permission to write in this folder or in the npm cache';
        fix.push('Do not use sudo for npm install; fix the folder owner (chown) and run again.');
    } else if (/node-gyp|gyp ERR|python|make: |clang|gcc/i.test(t)) {
        cause = 'build tools are missing (a native module needs to be compiled)';
        fix.push(isTermux() ? 'Termux: pkg install nodejs-lts python make clang' : 'Install build tools: python3, make and a C/C++ compiler.');
    }
    fix.push('Clean the npm cache:  npm cache clean --force');
    fix.push('Make sure there is free disk space and a stable internet connection.');
    fix.push('Termux (Android):  pkg install nodejs-lts python make clang');
    fix.push('Then run again:  node index.js   (or run  npm install  yourself to see the full error)');
    if (logm) fix.push('npm log file: ' + logm[1]);
    return { cause: cause, fix: fix };
}

// b) + c) + d) make sure every package exists; install automatically if not
async function ensureDependencies() {
    let missing = missingPackages();
    const outdated = missing.length ? [] : outdatedPackages();
    if (!missing.length && !outdated.length) return true;

    if (outdated.length) ui.warn('The WhatsApp library is old (' + installedVersion('@whiskeysockets/baileys') + ') -> updating it to the newest 6.7.x (WhatsApp rejects old versions for some accounts)...');
    else ui.warn('Missing packages: ' + missing.join(', '));
    console.log('Running automatic install:  npm install --no-audit --no-fund');
    console.log('(first run can take a few minutes, please wait)\n');

    let res = await runNpm([]);
    if (res.code !== 0 && isTermux()) {
        ui.warn('Normal install failed on Android/Termux. Retrying with --ignore-scripts (skips the ffmpeg-static download)...');
        res = await runNpm(['--ignore-scripts']);
        if (res.code === 0) ui.info('Installed without ffmpeg-static. Make sure ffmpeg is installed:  pkg install ffmpeg');
    }
    if (outdated.length) {   // an update must never stop a bot that already works
        if (res.code === 0 && !outdatedPackages().length) ui.ok('WhatsApp library updated to ' + installedVersion('@whiskeysockets/baileys') + '.\n');
        else ui.warn('Could not update the WhatsApp library now (internet?) -> continuing with the installed version. Later run:  npm install');
        return true;
    }
    missing = missingPackages();
    if (res.code === 0 && !missing.length) {
        ui.ok('Packages installed.\n');
        return true;
    }
    if (res.code === 0) {
        ui.fail('npm finished but some packages are still missing: ' + missing.join(', '), 'a broken npm cache or an interrupted install', ['Delete the node_modules folder and run again.']);
        process.exit(2);
    }
    const why = explainNpmFailure(res);
    ui.fail('npm install failed (exit code ' + res.code + ')', why.cause, why.fix);
    process.exit(2);
}

function warnOptional() {
    OPTIONAL.forEach(function (n) {
        if (!isInstalled(n)) console.log('Note: optional package ' + n + ' is not installed (system ffmpeg will be used).');
    });
}

module.exports = { ROOT, REQUIRED, OPTIONAL, isTermux, checkProjectFiles, isInstalled, missingPackages, outdatedPackages, ensureDependencies, warnOptional };
