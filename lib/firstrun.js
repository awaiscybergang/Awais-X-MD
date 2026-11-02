/**
 * Startup configuration: decides the mode (menu / flags / saved settings) and makes sure
 * everything the chosen mode needs is present before the bot starts.
 *
 *   flags:  --terminal  --telegram  --web  --setup (or --menu)  --add
 *   env:    AWAIS_RESTART=1  (set by start.sh after a crash: no menu, saved settings only)
 *   no TTY (PM2/cron/Docker): never prompts; uses saved BOT_MODE/token or exits with code 2
 */
const env = require('./env');
const ui = require('./ui');

const { tokenOk, chatIdOk, saveEnv, parseEnv } = env;

// Remember the mode chosen by a flag (non-fatal if .env cannot be written)
function rememberMode(mode) {
    try { env.set({ BOT_MODE: mode }); } catch (e) {
        const h = env.writeErrorHelp(e);
        ui.fail('Could not save the mode to .env', h[0], h[1]);
        ui.warn('Continuing with "' + mode + '" for this run only.');
    }
}

function configError(what, cause, fix) {
    ui.fail(what, cause, fix);
    process.exit(2);
}

async function ensureConfig() {
    const args = process.argv.slice(2);
    const restart = process.env.AWAIS_RESTART === '1';
    const interactive = !!process.stdin.isTTY;
    env.sanitizePlaceholders();

    let flagMode = '';
    if (args.includes('--terminal')) flagMode = 'terminal';
    else if (args.includes('--telegram')) flagMode = 'telegram';
    else if (args.includes('--web')) flagMode = 'web';

    const wantMenu = !restart && (args.includes('--setup') || args.includes('--menu'));
    const savedRaw = env.get('BOT_MODE').toLowerCase();
    const saved = ['telegram', 'terminal', 'web'].includes(savedRaw) ? savedRaw : '';
    // Flags and automatic restarts skip the menu; "--add" skips it only when Terminal mode is saved
    const direct = !!flagMode || (args.includes('--add') && saved === 'terminal');
    let mode = flagMode || saved;

    if (flagMode && interactive && saved !== flagMode) rememberMode(flagMode);

    if (wantMenu) {
        if (!interactive) configError('--setup / --menu needs an interactive terminal', 'there is no TTY here (PM2, cron, Docker or a pipe)',
            'Run it in a normal terminal, or edit the .env file by hand (see .env.example).');
        await require('./menu').run();
        mode = env.get('BOT_MODE').toLowerCase();
    } else if (interactive && !restart && !direct) {
        await require('./menu').run();               // loops until the user starts the bot (or exits)
        mode = env.get('BOT_MODE').toLowerCase();
    }

    // No menu available (no TTY / restart): fall back to the old rules
    if (mode !== 'telegram' && mode !== 'terminal' && mode !== 'web') {
        if (tokenOk(env.get('TELEGRAM_BOT_TOKEN'))) mode = 'telegram';
        else configError('Mode is not configured', 'BOT_MODE is missing in .env and this run cannot ask questions',
            ['Run in an interactive terminal:  npm start',
                'Or edit .env by hand:  cp .env.example .env  &&  nano .env',
                'Or use personal mode:  npm run terminal',
                'Or use web pair mode:  npm run web']);
    }
    process.env.BOT_MODE = mode;

    // Telegram mode needs a valid bot token + owner chat ID
    if (mode === 'telegram') {
        const needToken = !tokenOk(env.get('TELEGRAM_BOT_TOKEN'));
        const needChat = !chatIdOk(env.get('TELEGRAM_OWNER_CHAT_ID'));
        if (needToken || needChat) {
            if (interactive && !restart) {
                const done = await require('./menu').telegramSetup(null, { askStart: false });
                if (!done) configError('Telegram setup incomplete', 'token or owner Chat ID step was cancelled', 'Run again, or use personal mode:  npm run terminal');
            } else {
                const missing = [];
                if (needToken) missing.push('TELEGRAM_BOT_TOKEN');
                if (needChat) missing.push('TELEGRAM_OWNER_CHAT_ID');
                configError(missing.join(' + ') + ' missing in .env', 'Telegram mode is selected but required values are not saved',
                    ['Get a token from @BotFather and your Chat ID from @userinfobot, then run:  cp .env.example .env  &&  nano .env',
                        'Or run in an interactive terminal:  npm start',
                        'Or use personal mode without Telegram:  npm run terminal']);
            }
        }
    }

    // Non-fatal warnings
    if (!env.get('GEMINI_API_KEY')) {
        ui.warn('Gemini API key is not set: AI commands (.ai .gpt .gemini .ask) will not work. Add it with: npm run setup -> Settings');
    }
    if (!require('./menu').findFfmpeg()) {
        ui.warn('ffmpeg was not found: sticker/audio/video commands may fail. Install it (Termux: pkg install ffmpeg | Ubuntu: sudo apt-get install ffmpeg | Windows: winget install Gyan.FFmpeg | macOS: brew install ffmpeg)');
    }
    console.log('Starting the bot (mode: ' + mode + ')...\n');
}

module.exports = { ensureConfig, tokenOk, saveEnv, parseEnv };
