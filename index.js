const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 10000;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

const liveLogs = [];
function addLog(type, message, category = 'SYSTEM') {
    const time = new Date().toLocaleTimeString('ar-SA');
    liveLogs.unshift({ type, message, time, category });
    if (liveLogs.length > 150) liveLogs.pop();
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'tox-secure-oauth-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const REQUIRED_ROLE_ID = '1488188549529342182';

function getRedirectUri(req) {
    if (process.env.RENDER_EXTERNAL_URL) {
        return `${process.env.RENDER_EXTERNAL_URL}/auth/discord/callback`;
    }
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host;
    return `${protocol}://${host}/auth/discord/callback`;
}

async function checkAuth(req, res, next) {
    if (!req.session.user) {
        return res.send(getLoginPage());
    }

    try {
        if (!GUILD_ID) {
            return res.status(500).send("خطأ: متغير GUILD_ID غير مضبوط في Render.");
        }
        
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(req.session.user.id).catch(() => null);

        if (!member) {
            return res.status(403).send(`
                <html lang="ar" dir="rtl">
                <head><meta charset="UTF-8"><title>غير موجود</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap" rel="stylesheet"></head>
                <body style="background:#090d16;color:#fff;font-family:'Cairo';text-align:center;padding-top:100px;">
                    <h1 style="color:#ef4444;">⛔ أنت لست موجوداً في السيرفر!</h1>
                    <p style="color:#94a3b8;margin-top:10px;">عذراً، البوت لا يراك داخل السيرفر الرئيسي أو أنك غير منضم إليه.</p>
                    <a href="/logout" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#38bdf8;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;">تسجيل بحساب آخر</a>
                </body>
                </html>
            `);
        }

        if (!member.roles.cache.has(REQUIRED_ROLE_ID)) {
            return res.send(`
                <html lang="ar" dir="rtl">
                <head><meta charset="UTF-8"><title>مرفوض</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap" rel="stylesheet"></head>
                <body style="background:#090d16;color:#fff;font-family:'Cairo';text-align:center;padding-top:100px;">
                    <h1 style="color:#ef4444;">⛔ غير مصرح لك بالدخول</h1>
                    <p style="color:#94a3b8;margin-top:10px;">عذراً، حسابك لا يحمل رول الإدارة المطلوب في السيرفر.</p>
                    <a href="/logout" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#38bdf8;color:#000;text-decoration:none;border-radius:8px;font-weight:bold;">تسجيل بحساب آخر</a>
                </body>
                </html>
            `);
        }
        next();
    } catch (e) {
        return res.status(500).send("خطأ في السيرفر: " + e.message);
    }
}

function getLoginPage() {
    return `
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8"><title>تسجيل الدخول | TOX Panel</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
            body { background: #090d16; color: #fff; font-family: 'Cairo', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-card { background: #0e1626; border: 1px solid #1e293b; padding: 40px; border-radius: 16px; text-align: center; width: 380px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #38bdf8; font-size: 24px; margin-bottom: 10px; }
            p { color: #94a3b8; font-size: 13px; margin-bottom: 25px; }
            .btn-discord { background: #5865F2; color: white; padding: 12px 20px; border-radius: 10px; text-decoration: none; font-weight: 700; display: block; transition: 0.2s; }
            .btn-discord:hover { background: #4752C4; }
        </style>
    </head>
    <body>
        <div class="login-card">
            <h1>🛡️ TOX Panel</h1>
            <p>لوحة التحكم محمية بنظام آمن. يرجى تسجيل الدخول بحسابك في ديسكورد للتحقق من هويتك.</p>
            <a href="/auth/discord" class="btn-discord">تسجيل الدخول بواسطة Discord 🎮</a>
        </div>
    </body>
    </html>`;
}

app.get('/auth/discord', (req, res) => {
    const redirectUri = getRedirectUri(req);
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds.members.read`;
    res.redirect(authUrl);
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');

    try {
        const redirectUri = getRedirectUri(req);
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: redirectUri,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const oauthData = await tokenResponse.json();
        if (!oauthData.access_token) {
            console.error("OAuth Token Error:", oauthData);
            return res.redirect('/');
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `Bearer ${oauthData.access_token}` },
        });

        const userData = await userResponse.json();
        req.session.user = userData;
        res.redirect('/');
    } catch (error) {
        console.error("Auth Callback Exception:", error);
        res.redirect('/');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

function getLayout(title, activePage, content, user) {
    const botName = client.user ? client.user.username : 'TOX Shield';
    const status = client.isReady() ? 'متصل وحماية نشطة 🟢' : 'غير متصل 🔴';

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | ${botName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
            body { background-color: #090d16; color: #f1f5f9; display: flex; height: 100vh; overflow: hidden; }
            .sidebar { width: 260px; background: #0e1626; border-left: 1px solid #1e293b; display: flex; flex-direction: column; transition: 0.3s; position: fixed; right: 0; top: 0; height: 100%; z-index: 100; }
            .sidebar-header { padding: 22px; font-size: 19px; font-weight: 900; color: #38bdf8; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .sidebar-menu { list-style: none; padding: 20px 12px; }
            .sidebar-menu li { padding: 12px 16px; margin-bottom: 8px; border-radius: 10px; font-weight: 600; color: #94a3b8; transition: 0.2s; }
            .sidebar-menu li a { color: inherit; text-decoration: none; display: block; }
            .sidebar-menu li:hover, .sidebar-menu li.active { background: #1e293b; color: #38bdf8; }
            .main-content { flex: 1; margin-right: 260px; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
            .topbar { background: #0e1626; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; position: sticky; top: 0; z-index: 90; }
            .menu-toggle { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; display: none; }
            .container { padding: 30px; max-width: 1200px; margin: auto; width: 100%; }
            .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 25px; }
            .card { background: #0e1626; border: 1px solid #1e293b; padding: 20px; border-radius: 14px; }
            .card h3 { font-size: 13px; color: #94a3b8; margin-bottom: 6px; }
            .card .value { font-size: 18px; font-weight: 700; color: #f8fafc; }
            @media(max-width: 900px) { .sidebar { right: -260px; } .sidebar.open { right: 0; } .main-content { margin-right: 0; } .menu-toggle { display: block; } }
            .box { background: #0e1626; border: 1px solid #1e293b; padding: 22px; border-radius: 14px; margin-bottom: 20px; }
            .box h2 { font-size: 17px; margin-bottom: 15px; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
            input, select { width: 100%; padding: 12px 15px; margin-bottom: 12px; background: #090d16; border: 1px solid #1e293b; color: #fff; border-radius: 10px; font-size: 14px; outline: none; }
            .btn-group { display: flex; gap: 10px; }
            button.action-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; color: #fff; }
            .btn-ban { background: #dc2626; } .btn-kick { background: #d97706; } .btn-timeout { background: #7c3aed; }
            .log-list { list-style: none; overflow-y: auto; max-height: 280px; background: #090d16; padding: 12px; border-radius: 10px; border: 1px solid #1e293b; }
            .log-list li { padding: 10px 8px; border-bottom: 1px solid #1e293b; font-size: 13px; color: #cbd5e1; display: flex; justify-content: space-between; }
            .log-list .time { color: #64748b; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <span>🛡️ TOX Panel</span>
                <button class="menu-toggle" onclick="toggleSidebar()">✕</button>
            </div>
            <ul class="sidebar-menu">
                <li class="${activePage === 'home' ? 'active' : ''}"><a href="/">📊 نظرة عامة</a></li>
                <li class="${activePage === 'settings' ? 'active' : ''}"><a href="/settings">⚙️ إعدادات الحماية</a></li>
                <li class="${activePage === 'logs' ? 'active' : ''}"><a href="/logs">📜 السجلات الكاملة</a></li>
                <li style="margin-top: 30px; background: #1e293b; text-align: center;"><a href="/logout" style="color: #ef4444;">🚪 تسجيل الخروج</a></li>
            </ul>
        </div>
        <main class="main-content">
            <header class="topbar">
                <button class="menu-toggle" onclick="toggleSidebar()">≡</button>
                <div style="font-weight: 700; color: #38bdf8;">لوحة التحكم المحمية</div>
                <div style="font-size: 13px; background: #1e293b; padding: 6px 14px; border-radius: 20px; color: #38bdf8;">${status}</div>
            </header>
            <div class="container">${content}</div>
        </main>
        <script>function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }</script>
    </body>
    </html>`;
}

app.get('/', checkAuth, (req, res) => {
    const botName = client.user ? client.user.username : 'TOX Shield';
    const renderLogs = (cat) => {
        const filtered = liveLogs.filter(l => l.category === cat);
        if (filtered.length === 0) return '<li style="color:#64748b;text-align:center;padding:15px;">لا توجد سجلات حالياً...</li>';
        return filtered.map(l => `<li><span><strong>[${l.type}]</strong> ${l.message}</span> <span class="time">${l.time}</span></li>`).join('');
    };

    const content = `
        <div class="grid-stats">
            <div class="card"><h3>حالة البوت</h3><div class="value">${botName}</div></div>
            <div class="card"><h3>المستخدم المسجل</h3><div class="value" style="color:#38bdf8;">${req.session.user.username}</div></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div class="box">
                <h2>⚡ إدارة العقوبات السريعة</h2>
                <input type="text" id="targetId" placeholder="أدخل آيدي العضو...">
                <input type="text" id="reason" placeholder="السبب...">
                <div class="btn-group">
                    <button class="action-btn btn-ban" onclick="executeAction('ban')">باند 🚨</button>
                    <button class="action-btn btn-kick" onclick="executeAction('kick')">طرد 👢</button>
                    <button class="action-btn btn-timeout" onclick="executeAction('timeout')">تايم أوت ⏱️</button>
                </div>
            </div>
            <div class="box">
                <h2>📌 حماية OAuth2 مفعلة</h2>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.7;">تم التحقق من هويتك والصلاحيات بنجاح عبر حسابك الرسمي في ديسكورد.</p>
            </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="box"><h2>👑 لوق رتب الإدارة</h2><ul class="log-list">${renderLogs('ROLES')}</ul></div>
            <div class="box"><h2>🤖 لوق دخول البوتات</h2><ul class="log-list">${renderLogs('BOTS')}</ul></div>
        </div>
        <script>
            function executeAction(type) {
                const userId = document.getElementById('targetId').value;
                const reason = document.getElementById('reason').value || 'بدون سبب';
                if (!userId) return alert('الرجاء إدخال آيدي العضو!');
                if (confirm('تأكيد تنفيذ الإجراء؟')) {
                    fetch('/api/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, userId, reason })
                    }).then(res => res.json()).then(d => { alert(d.message); location.reload(); });
                }
            }
        </script>
    `;
    res.send(getLayout('نظرة عامة', 'home', content, req.session.user));
});

app.get('/settings', checkAuth, (req, res) => {
    res.send(getLayout('الإعدادات', 'settings', `<div class="box"><h2>⚙️ إعدادات الحماية</h2><p style="color:#94a3b8;">إعدادات الأمان متصلة وتعمل بكفاءة عالية.</p></div>`, req.session.user));
});

app.get('/logs', checkAuth, (req, res) => {
    const all = liveLogs.map(l => `<li><span><strong>[${l.category}]</strong> ${l.message}</span> <span class="time">${l.time}</span></li>`).join('');
    res.send(getLayout('السجلات', 'logs', `<div class="box"><h2>📜 السجلات</h2><ul class="log-list" style="max-height:450px;">${all}</ul></div>`, req.session.user));
});

app.post('/api/action', checkAuth, async (req, res) => {
    const { type, userId, reason } = req.body;
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(404).json({ message: 'العضو غير موجود.' });

        if (type === 'ban') { await member.ban({ reason }); addLog('BAN', `حظر ${member.user.tag}`, 'ACTIONS'); }
        else if (type === 'kick') { await member.kick(reason); addLog('KICK', `طرد ${member.user.tag}`, 'ACTIONS'); }
        else if (type === 'timeout') { await member.timeout(10*60*1000, reason); addLog('TIMEOUT', `تايم أوت لـ ${member.user.tag}`, 'ACTIONS'); }
        res.json({ message: 'تم تنفيذ الإجراء بنجاح!' });
    } catch (e) {
        res.status(500).json({ message: 'فشل التنفيذ، تأكد من صلاحيات البوت.' });
    }
});

client.on('guildMemberUpdate', (oldM, newM) => {
    newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id)).forEach(r => {
        if (['admin', 'streamer', 'مشرف'].some(n => r.name.toLowerCase().includes(n))) {
            addLog('ROLE', `منح رتبة [${r.name}] لـ ${newM.user.tag}`, 'ROLES');
        }
    });
});

client.on('guildMemberAdd', m => {
    if (m.user.bot) addLog('BOT', `انضم بوت: ${m.user.tag}`, 'BOTS');
});

client.once('ready', () => console.log(`[BOT] ${client.user.tag} متصل!`));
app.listen(PORT, () => console.log(`[WEB] شغال على بورت ${PORT}`));
client.login(process.env.TOKEN);
