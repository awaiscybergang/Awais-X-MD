/**
 * AWAIS X MD - single main entry point (npm start / node index.js / bash start.sh)
 *
 *   node index.js              -> banner + interactive menu (or saved settings without a TTY)
 *   node index.js --terminal   -> personal mode, no Telegram bot (skips the menu)
 *   node index.js --telegram   -> multi-user Telegram bot mode (skips the menu)
 *   node index.js --setup      -> open the menu directly (alias: --menu)
 *   node index.js --add        -> (with --terminal) pair one more number
 *
 * Order: Node check -> banner -> auto-install packages -> config/menu -> bot.
 * Nothing third-party is loaded before the install step is finished.
 * NOTE: this file uses old-style syntax on purpose, so the Node-version message works on old Node.js.
 */
'use strict';

// 1) Node.js >= 18 (before anything else)
if (parseInt(process.versions.node.split('.')[0], 10) < 18) {
    console.error('\n✖ Node.js ' + process.versions.node + ' is too old (AWAIS X MD needs Node.js 18 or newer)');
    console.error('  Likely cause: an old Node.js version is installed');
    console.error('  How to fix:   Termux:  pkg install nodejs-lts');
    console.error('                Windows: winget install OpenJS.NodeJS.LTS   (or https://nodejs.org)');
    console.error('                macOS:   brew install node');
    console.error('                Linux:   https://nodejs.org  (or NodeSource: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -)\n');
    process.exit(2);
}

const path = require('path');

// Never die because of a stray error - keep the bot running (stack only with DEBUG=1)
function errMsg(e) {
    if (e && e.message) return process.env.DEBUG === '1' && e.stack ? e.stack : e.message;
    return String(e);
}
process.on('uncaughtException', function (e) { console.error('⚠️ Unexpected error (uncaughtException): ' + errMsg(e) + (process.env.DEBUG === '1' ? '' : '   [set DEBUG=1 for the stack trace]')); });
process.on('unhandledRejection', function (e) { console.error('⚠️ Unexpected error (unhandledRejection): ' + errMsg(e) + (process.env.DEBUG === '1' ? '' : '   [set DEBUG=1 for the stack trace]')); });
process.on('SIGINT', function () { console.log('\n👋 Stopped (CTRL+C).'); process.exit(130); });
process.on('SIGTERM', function () { console.log('\n👋 Stopping the bot (SIGTERM)...'); process.exit(0); });

const ROOT = __dirname;
const ui = require('./lib/ui');
const bootstrap = require('./lib/bootstrap');

// 2) Working directory: .env and sessions are relative to the project folder
bootstrap.checkProjectFiles();
if (path.resolve(process.cwd()) !== path.resolve(ROOT)) {
    try { process.chdir(ROOT); ui.info('Working directory changed to the project folder: ' + ROOT); } catch (e) {
        ui.fail('Cannot enter the project folder', e.message, 'cd into the AWAIS X MD folder and run:  node index.js');
        process.exit(2);
    }
}

// An automatic restart (start.sh sets AWAIS_RESTART=1) must not open the menu again
if (process.env.AWAIS_RESTART === '1') {
    process.argv = process.argv.filter(function (a) { return ['--add', '--setup', '--menu'].indexOf(a) === -1; });
}

// 3) Banner (built-ins only)
const envm = require('./lib/env');
const argv = process.argv.slice(2);
const flagMode = argv.indexOf('--terminal') !== -1 ? 'terminal' : argv.indexOf('--telegram') !== -1 ? 'telegram' : argv.indexOf('--web') !== -1 ? 'web' : '';
require('./lib/banner').print(flagMode || envm.get('BOT_MODE').toLowerCase() || '');

// 4) Auto-install packages, then config/menu, then the bot
bootstrap.ensureDependencies()
    .then(function () { return require('./lib/firstrun').ensureConfig(); })
    .then(function () {
        require('./lib/keepawake').enable();
        return require('./awaismain.js');
    })
    .catch(function (e) {
        ui.fail('Startup error', errMsg(e), ['Run again with DEBUG=1 to see the full stack trace.', 'If it keeps happening, run:  npm install   and then   node index.js']);
        process.exit(1);
    });
