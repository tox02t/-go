require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const session = require('express-session');
const path = require('path');

// --- 1. إعدادات بوت الديسكورد ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// مصفوفة لتخزين آخر الأحداث (Logs) لعرضها في الموقع مباشرة
const recentLogs = [];
function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    recentLogs.unshift({ type, message, timestamp });
    if (recentLogs.length > 50) recentLogs.pop(); // الاحتفاظ بآخر 50 سجل
}

client.once('ready', () => {
    console.log(`[TOX-SHIELD] Secured & Logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', (member) => {
    addLog('INFO', `انضم العضو ${member.user.tag} إلى السيرفر.`);
});

client.on('guildBanAdd', (ban) => {
    addLog('WARN', `تم حظر (Ban) العضو ${ban.user.tag} من السيرفر.`);
});

// --- 2. إعدادات موقع الـ Web Dashboard (Express) ---
const app = express();
app.set('view engine', 'ejs');
// تحديد مسار مجلد العرض للـ UI
app.set('views', path.join(__dirname, 'src', 'web', 'views'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'tox_super_secret_key_2026',
    resave: false,
    saveUninitialized: false
}));

// صفحة لوحة التحكم الرئيسية (Dashboard UI)
app.get('/', (req, res) => {
    res.render('dashboard', {
        botName: client.user ? client.user.username : 'TOX Shield',
        guildsCount: client.guilds.cache.size,
        logs: recentLogs
    });
});

// API للحصول على اللوقات
app.get('/api/logs', (req, res) => {
    res.json(recentLogs);
});

// تشغيل السيرفر والموقع معاً
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`[WEB-UI] Dashboard running on port ${PORT}`);
});

// تسجيل دخول البوت
client.login(process.env.TOKEN);
