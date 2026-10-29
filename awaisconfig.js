/**
 * 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT - Config File
 * Tokens, settings, constants, lists
 * Saari sensitive cheezein yahan
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const CONFIG = {
    // Telegram
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '923295533214',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',

    // Paths
    ROOT: __dirname,
    SESSIONS_DIR: path.join(__dirname, 'sessions'),
    TEMP_DIR: path.join(__dirname, 'temp'),
    TMP_DIR: path.join(__dirname, 'tmp'),
    ASSETS_DIR: path.join(__dirname, 'assets'),
    CONFIG_JSON: path.join(__dirname, 'config.json'),
    MENU_SONG: path.join(__dirname, 'awais', 'awais_audio.mp3'),

    // Bot branding
    BOT_NAME: '𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT',
    BOT_FOOTER: '\n\n⚡ 𝐀𝐰𝐚𝐢𝐬 𝐌𝐃 BOT',
    POWERED_BY: '👑 𝔸𝕨𝕒𝕚𝕤 𝕏 ℍ𝔸ℂ𝕂𝔼ℝ',
    YT_LINK: 'https://www.youtube.com/@coreacademi',

    // Default auto features (har session pe ON by default)
    DEFAULT_AUTOREACTS: true,
    DEFAULT_AUTOTYPING: true,
    DEFAULT_AUTORECORDING: false,
    DEFAULT_STATUS_SEEN: true,
    DEFAULT_STATUS_REACT: true,

    // Limits
    YT_MAX_ACTIVE: 3,
    MAX_WARN: 3,

    // Prefix
    PREFIX: '.',
};

// Config.json helpers
function loadConfig() {
    try {
        return JSON.parse(fs.readFileSync(CONFIG.CONFIG_JSON, 'utf8'));
    } catch {
        return { BOT_IMG: '', MENU_SONG: 'awais/awais_audio.mp3', autoreacts: true, autotyping: true, autorecording: false };
    }
}

function saveConfig(cfg) {
    fs.writeFileSync(CONFIG.CONFIG_JSON, JSON.stringify(cfg, null, 2));
}

function getBotImg() {
    return loadConfig().BOT_IMG || '';
}

function getMenuSong() {
    const cfg = loadConfig();
    const p = path.join(__dirname, cfg.MENU_SONG || 'awais/awais_audio.mp3');
    return fs.existsSync(p) ? p : null;
}

// Gali list for anti-abuse
const GALI = [
    'madarchod', 'maderchod', 'bhenchod', 'bsdk', 'chutiya', 'chutiye',
    'randi', 'harami', 'kamina', 'gandu', 'gaandu', 'bhosdike', 'bhosdi',
    'lauda', 'lund', 'fuck', 'fucker', 'fucking', 'bitch', 'bastard',
    'asshole', 'motherfucker', 'bc', 'mc', 'lode', 'maa ki', 'baap ki',
    'sala', 'saala', 'haramzada', 'kutte', 'kamine', 'ullu', 'gadha'
];

function hasGali(t) {
    if (!t) return false;
    const l = t.toLowerCase().replace(/[^a-z\u0900-\u097f ]/g, ' ');
    return GALI.some(w => l.includes(w));
}

function isEmojiOnly(t) {
    if (!t?.trim()) return false;
    const clean = t.replace(
        /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F9FF}]|[\u00a9\u00ae\u2122\u2139\u203c\u2049\u20e3\u2194-\u2199\u21a9\u21aa\u231a\u231b\u23e9-\u23f3\u24c2\u25aa\u25ab\u25b6\u25c0\u25fb-\u25fe\u2600-\u2604\u260e\u2611\u2614\u2615\u2638-\u263a\u2648-\u2653\u267f\u2702\u2705\u2708-\u270d\u2712\u2714\u2716\u2728\u2733\u2734\u2744\u2747\u274c\u274e\u2753-\u2757\u2763\u2764\u2795-\u2797\u27a1\u27b0\u27bf\u2934\u2935\u2b05-\u2b07\u2b1b\u2b1c\u2b50\u2b55\u3030\u303d\u3297\u3299]/gu,
        ''
    ).replace(/\s/g, '').trim();
    return clean.length === 0;
}

// Jokes & Quotes
const JOKES = [
    "Teacher: Future use karo sentence mein!\nStudent: Main future mein school nahi aaunga! 😂",
    "Doctor: Kya problem hai?\nAadmi: Main invisible hun!\nDoctor: Next patient! 😂",
    "Wife: Prove karo pyaar karte ho!\nHusband: Maine remote uthaya! 😂",
    "Beta: Papa first aaya main!\nPapa: Class mein?\nBeta: Ghar mein! 😂",
    "Teacher: Tumhara homework kahan hai?\nStudent: Homework ne mujhe complete kar diya! 😂"
];

const QUOTES = [
    "⚡ *Sapne wo nahi jo sote waqt aate hain, sapne wo hain jo sone nahi dete!*\n— A.P.J Abdul Kalam",
    "⚡ *Haar tabhi hoti hai jab tum khud haar maan lo!*",
    "⚡ *Jo girne ke baad uthna jaanta hai wahi aage jaata hai!*",
    "⚡ *Mushkilein manzil tak pahuncha deti hain!*",
    "⚡ *Success ka raaz: Roz thoda sa mehnat karo.*"
];

// Random emojis for autoreact / status react
const REACT_EMOJIS = ['❤️', '🔥', '💯', '✨', '👍', '😍', '🤩', '💪', '🚀', '👑', '🖤', '⚡', '🌹', '💎', '🫡'];

// Quran Surah list (114) - name + number for commands
const QURAN_SURAHS = [
    { num: 1, name: 'Al-Fatiha', ar: 'الفاتحة' },
    { num: 2, name: 'Al-Baqarah', ar: 'البقرة' },
    { num: 3, name: 'Aal-E-Imran', ar: 'آل عمران' },
    { num: 4, name: 'An-Nisa', ar: 'النساء' },
    { num: 5, name: 'Al-Maidah', ar: 'المائدة' },
    { num: 6, name: 'Al-Anam', ar: 'الأنعام' },
    { num: 7, name: 'Al-Araf', ar: 'الأعراف' },
    { num: 8, name: 'Al-Anfal', ar: 'الأنفال' },
    { num: 9, name: 'At-Tawbah', ar: 'التوبة' },
    { num: 10, name: 'Yunus', ar: 'يونس' },
    { num: 11, name: 'Hud', ar: 'هود' },
    { num: 12, name: 'Yusuf', ar: 'يوسف' },
    { num: 13, name: 'Ar-Rad', ar: 'الرعد' },
    { num: 14, name: 'Ibrahim', ar: 'إبراهيم' },
    { num: 15, name: 'Al-Hijr', ar: 'الحجر' },
    { num: 16, name: 'An-Nahl', ar: 'النحل' },
    { num: 17, name: 'Al-Isra', ar: 'الإسراء' },
    { num: 18, name: 'Al-Kahf', ar: 'الكهف' },
    { num: 19, name: 'Maryam', ar: 'مريم' },
    { num: 20, name: 'Ta-Ha', ar: 'طه' },
    { num: 21, name: 'Al-Anbiya', ar: 'الأنبياء' },
    { num: 22, name: 'Al-Hajj', ar: 'الحج' },
    { num: 23, name: 'Al-Muminun', ar: 'المؤمنون' },
    { num: 24, name: 'An-Nur', ar: 'النور' },
    { num: 25, name: 'Al-Furqan', ar: 'الفرقان' },
    { num: 26, name: 'Ash-Shuara', ar: 'الشعراء' },
    { num: 27, name: 'An-Naml', ar: 'النمل' },
    { num: 28, name: 'Al-Qasas', ar: 'القصص' },
    { num: 29, name: 'Al-Ankabut', ar: 'العنكبوت' },
    { num: 30, name: 'Ar-Rum', ar: 'الروم' },
    { num: 31, name: 'Luqman', ar: 'لقمان' },
    { num: 32, name: 'As-Sajdah', ar: 'السجدة' },
    { num: 33, name: 'Al-Ahzab', ar: 'الأحزاب' },
    { num: 34, name: 'Saba', ar: 'سبإ' },
    { num: 35, name: 'Fatir', ar: 'فاطر' },
    { num: 36, name: 'Ya-Sin', ar: 'يس' },
    { num: 37, name: 'As-Saffat', ar: 'الصافات' },
    { num: 38, name: 'Sad', ar: 'ص' },
    { num: 39, name: 'Az-Zumar', ar: 'الزمر' },
    { num: 40, name: 'Ghafir', ar: 'غافر' },
    { num: 41, name: 'Fussilat', ar: 'فصلت' },
    { num: 42, name: 'Ash-Shura', ar: 'الشورى' },
    { num: 43, name: 'Az-Zukhruf', ar: 'الزخرف' },
    { num: 44, name: 'Ad-Dukhan', ar: 'الدخان' },
    { num: 45, name: 'Al-Jathiyah', ar: 'الجاثية' },
    { num: 46, name: 'Al-Ahqaf', ar: 'الأحقاف' },
    { num: 47, name: 'Muhammad', ar: 'محمد' },
    { num: 48, name: 'Al-Fath', ar: 'الفتح' },
    { num: 49, name: 'Al-Hujurat', ar: 'الحجرات' },
    { num: 50, name: 'Qaf', ar: 'ق' },
    { num: 51, name: 'Adh-Dhariyat', ar: 'الذاريات' },
    { num: 52, name: 'At-Tur', ar: 'الطور' },
    { num: 53, name: 'An-Najm', ar: 'النجم' },
    { num: 54, name: 'Al-Qamar', ar: 'القمر' },
    { num: 55, name: 'Ar-Rahman', ar: 'الرحمن' },
    { num: 56, name: 'Al-Waqiah', ar: 'الواقعة' },
    { num: 57, name: 'Al-Hadid', ar: 'الحديد' },
    { num: 58, name: 'Al-Mujadila', ar: 'المجادلة' },
    { num: 59, name: 'Al-Hashr', ar: 'الحشر' },
    { num: 60, name: 'Al-Mumtahanah', ar: 'الممتحنة' },
    { num: 61, name: 'As-Saff', ar: 'الصف' },
    { num: 62, name: 'Al-Jumuah', ar: 'الجمعة' },
    { num: 63, name: 'Al-Munafiqun', ar: 'المنافقون' },
    { num: 64, name: 'At-Taghabun', ar: 'التغابن' },
    { num: 65, name: 'At-Talaq', ar: 'الطلاق' },
    { num: 66, name: 'At-Tahrim', ar: 'التحريم' },
    { num: 67, name: 'Al-Mulk', ar: 'الملك' },
    { num: 68, name: 'Al-Qalam', ar: 'القلم' },
    { num: 69, name: 'Al-Haqqah', ar: 'الحاقة' },
    { num: 70, name: 'Al-Maarij', ar: 'المعارج' },
    { num: 71, name: 'Nuh', ar: 'نوح' },
    { num: 72, name: 'Al-Jinn', ar: 'الجن' },
    { num: 73, name: 'Al-Muzzammil', ar: 'المزمل' },
    { num: 74, name: 'Al-Muddaththir', ar: 'المدثر' },
    { num: 75, name: 'Al-Qiyamah', ar: 'القيامة' },
    { num: 76, name: 'Al-Insan', ar: 'الإنسان' },
    { num: 77, name: 'Al-Mursalat', ar: 'المرسلات' },
    { num: 78, name: 'An-Naba', ar: 'النبأ' },
    { num: 79, name: 'An-Naziat', ar: 'النازعات' },
    { num: 80, name: 'Abasa', ar: 'عبس' },
    { num: 81, name: 'At-Takwir', ar: 'التكوير' },
    { num: 82, name: 'Al-Infitar', ar: 'الانفطار' },
    { num: 83, name: 'Al-Mutaffifin', ar: 'المطففين' },
    { num: 84, name: 'Al-Inshiqaq', ar: 'الانشقاق' },
    { num: 85, name: 'Al-Buruj', ar: 'البروج' },
    { num: 86, name: 'At-Tariq', ar: 'الطارق' },
    { num: 87, name: 'Al-Ala', ar: 'الأعلى' },
    { num: 88, name: 'Al-Ghashiyah', ar: 'الغاشية' },
    { num: 89, name: 'Al-Fajr', ar: 'الفجر' },
    { num: 90, name: 'Al-Balad', ar: 'البلد' },
    { num: 91, name: 'Ash-Shams', ar: 'الشمس' },
    { num: 92, name: 'Al-Layl', ar: 'الليل' },
    { num: 93, name: 'Ad-Duhaa', ar: 'الضحى' },
    { num: 94, name: 'Ash-Sharh', ar: 'الشرح' },
    { num: 95, name: 'At-Tin', ar: 'التين' },
    { num: 96, name: 'Al-Alaq', ar: 'العلق' },
    { num: 97, name: 'Al-Qadr', ar: 'القدر' },
    { num: 98, name: 'Al-Bayyinah', ar: 'البينة' },
    { num: 99, name: 'Az-Zalzalah', ar: 'الزلزلة' },
    { num: 100, name: 'Al-Adiyat', ar: 'العاديات' },
    { num: 101, name: 'Al-Qariah', ar: 'القارعة' },
    { num: 102, name: 'At-Takathur', ar: 'التكاثر' },
    { num: 103, name: 'Al-Asr', ar: 'العصر' },
    { num: 104, name: 'Al-Humazah', ar: 'الهمزة' },
    { num: 105, name: 'Al-Fil', ar: 'الفيل' },
    { num: 106, name: 'Quraysh', ar: 'قريش' },
    { num: 107, name: 'Al-Maun', ar: 'الماعون' },
    { num: 108, name: 'Al-Kawthar', ar: 'الكوثر' },
    { num: 109, name: 'Al-Kafirun', ar: 'الكافرون' },
    { num: 110, name: 'An-Nasr', ar: 'النصر' },
    { num: 111, name: 'Al-Masad', ar: 'المسد' },
    { num: 112, name: 'Al-Ikhlas', ar: 'الإخلاص' },
    { num: 113, name: 'Al-Falaq', ar: 'الفلق' },
    { num: 114, name: 'An-Nas', ar: 'الناس' }
];

// Axios default
const AX = {
    timeout: 60000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
    }
};

// Create required dirs
['sessions', 'temp', 'tmp', 'assets'].forEach(d => {
    const p = path.join(__dirname, d);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

module.exports = {
    CONFIG,
    loadConfig,
    saveConfig,
    getBotImg,
    getMenuSong,
    GALI,
    hasGali,
    isEmojiOnly,
    JOKES,
    QUOTES,
    REACT_EMOJIS,
    QURAN_SURAHS,
    AX
};
