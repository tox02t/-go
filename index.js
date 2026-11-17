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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

const liveLogs = [];
function addLog(type, message, category = 'SYSTEM') {
    const time = new Date().toLocaleTimeString('ar-SA');
    liveLogs.unshift({ type, message, time, category });
    if (liveLogs.length > 200) liveLogs.pop();
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
const REQUIRED_ROLE_NAME = 'Management';

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

        const hasRoleById = member.roles.cache.has(REQUIRED_ROLE_ID);
        const hasRoleByName = member.roles.cache.some(r => r.name.toLowerCase() === REQUIRED_ROLE_NAME.toLowerCase());

        if (!hasRoleById && !hasRoleByName) {
            return res.send(`
                <html lang="ar" dir="rtl">
                <head><meta charset="UTF-8"><title>مرفوض</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@700&display=swap" rel="stylesheet"></head>
                <body style="background:#090d16;color:#fff;font-family:'Cairo';text-align:center;padding-top:100px;">
                    <h1 style="color:#ef4444;">⛔ غير مصرح لك بالدخول</h1>
                    <p style="color:#94a3b8;margin-top:10px;">عذراً، حسابك لا يحمل رول الإدارة المطلوبة (${REQUIRED_ROLE_NAME}) في السيرفر.</p>
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
            <p>لوحة التحكم محمية بنظام آمن. يرجى تسجيل الدخول بحسابك في ديسكورد للتحقق من صلاحيات (${REQUIRED_ROLE_NAME}).</p>
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
    const status = client.isReady() ? 'متصل 🟢' : 'غير متصل 🔴';
    const userName = user ? user.username : 'مشرف';

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
            .sidebar { width: 260px; background: #0e1626; border-left: 1px solid #1e293b; display: flex; flex-direction: column; position: fixed; right: 0; top: 0; height: 100%; z-index: 1000; transition: 0.3s ease; }
            .sidebar-header { padding: 20px; font-size: 18px; font-weight: 900; color: #38bdf8; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .close-menu { background: none; border: none; color: #ef4444; font-size: 22px; cursor: pointer; display: none; }
            .sidebar-menu { list-style: none; padding: 20px 12px; flex: 1; }
            .sidebar-menu li { padding: 12px 16px; margin-bottom: 8px; border-radius: 10px; font-weight: 600; color: #94a3b8; transition: 0.2s; }
            .sidebar-menu li a { color: inherit; text-decoration: none; display: block; }
            .sidebar-menu li:hover, .sidebar-menu li.active { background: #1e293b; color: #38bdf8; }
            
            .sidebar-info { padding: 15px; border-top: 1px solid #1e293b; background: #090d16; font-size: 12px; color: #94a3b8; }
            .sidebar-info p { margin-bottom: 6px; }
            .sidebar-info span { color: #38bdf8; font-weight: 700; }

            .main-content { flex: 1; margin-right: 260px; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; width: calc(100% - 260px); }
            .topbar { background: #0e1626; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; position: sticky; top: 0; z-index: 900; }
            .menu-toggle { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; display: none; }
            .container { padding: 25px; max-width: 1200px; margin: auto; width: 100%; }
            
            .box { background: #0e1626; border: 1px solid #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
            .box h2 { font-size: 16px; margin-bottom: 12px; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 8px; }
            input, select, textarea { width: 100%; padding: 10px 14px; margin-bottom: 10px; background: #090d16; border: 1px solid #1e293b; color: #fff; border-radius: 8px; font-size: 13px; outline: none; }
            textarea { resize: vertical; height: 80px; }
            .btn-group { display: flex; gap: 8px; }
            button.action-btn { flex: 1; padding: 10px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; color: #fff; font-size: 13px; transition: 0.2s; }
            .btn-ban { background: #dc2626; } .btn-kick { background: #d97706; } .btn-timeout { background: #7c3aed; }
            .btn-green { background: #10b981; }
            .log-list { list-style: none; overflow-y: auto; max-height: 250px; background: #090d16; padding: 10px; border-radius: 8px; border: 1px solid #1e293b; }
            .log-list li { padding: 8px 6px; border-bottom: 1px solid #1e293b; font-size: 12px; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center; }
            .log-list .time { color: #64748b; font-size: 10px; background: #1e293b; padding: 2px 5px; border-radius: 4px; }
            
            @media(max-width: 900px) {
                .sidebar { right: -260px; }
                .sidebar.open { right: 0; }
                .main-content { margin-right: 0; width: 100%; }
                .menu-toggle { display: block; }
                .close-menu { display: block; }
            }
        </style>
    </head>
    <body>
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <span>🛡️ TOX Panel</span>
                <button class="close-menu" onclick="toggleSidebar()">✕</button>
            </div>
            <ul class="sidebar-menu">
                <li class="${activePage === 'home' ? 'active' : ''}"><a href="/">📊 لوحة التحكم</a></li>
                <li class="${activePage === 'logs' ? 'active' : ''}"><a href="/logs">📜 السجلات المباشرة</a></li>
                <li style="margin-top: 30px; background: #1e293b; text-align: center;"><a href="/logout" style="color: #ef4444;">🚪 تسجيل الخروج</a></li>
            </ul>
            <div class="sidebar-info">
                <p>🤖 البوت: <span>${botName}</span></p>
                <p>👤 المشرف: <span>${userName}</span></p>
                <p>👑 الصلاحية: <span>Management</span></p>
            </div>
        </div>
        <main class="main-content">
            <header class="topbar">
                <button class="menu-toggle" onclick="toggleSidebar()">☰</button>
                <div style="font-weight: 700; color: #38bdf8; font-size: 14px;">إدارة سيرفر ديسكورد</div>
                <div style="font-size: 12px; background: #1e293b; padding: 5px 12px; border-radius: 15px; color: #38bdf8;">${status}</div>
            </header>
            <div class="container">${content}</div>
        </main>
        <script>
            function toggleSidebar() {
                document.getElementById('sidebar').classList.toggle('open');
            }
        </script>
    </body>
    </html>`;
}

app.get('/', checkAuth, (req, res) => {
    const renderLogs = (cat) => {
        const filtered = liveLogs.filter(l => l.category === cat);
        if (filtered.length === 0) return '<li style="color:#64748b;text-align:center;padding:12px;">لا توجد سجلات حالياً...</li>';
        return filtered.map(l => `<li><span><strong>[${l.type}]</strong> ${l.message}</span> <span class="time">${l.time}</span></li>`).join('');
    };

    const content = `
        <div class="box" style="text-align: center; padding: 30px; background: linear-gradient(135deg, #0e1626 0%, #111e38 100%); border: 1px solid #38bdf833;">
            <h2 style="color: #38bdf8; font-size: 20px; border: none; margin-bottom: 8px;">مرحباً بك في لوحة تحكم الإدارة</h2>
            <p style="color: #94a3b8; font-size: 14px; margin-bottom: 15px;">تم تطوير الموقع من قبل المطور <strong>محمد الشمري</strong></p>
            <a href="https://discord.gg/BfwgJXUsQR" target="_blank" style="display: inline-block; background: #5865F2; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px;">💬 ديسكورد للاستفسارات والتبليغ</a>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div class="box">
                <h2>⚡ العقوبات السريعة</h2>
                <input type="text" id="targetId" placeholder="آيدي العضو...">
                <input type="text" id="reason" placeholder="السبب...">
                <div class="btn-group">
                    <button class="action-btn btn-ban" onclick="executeAction('ban')">باند 🚨</button>
                    <button class="action-btn btn-kick" onclick="executeAction('kick')">طرد 👢</button>
                    <button class="action-btn btn-timeout" onclick="executeAction('timeout')">ميوت ⏱️</button>
                </div>
            </div>

            <div class="box">
                <h2>👑 إعطاء / إزالة رتبة</h2>
                <input type="text" id="roleUserId" placeholder="آيدي العضو...">
                <input type="text" id="roleId" placeholder="آيدي الرتبة...">
                <div class="btn-group">
                    <button class="action-btn btn-green" onclick="manageRole('add')">إعطاء ✅</button>
                    <button class="action-btn btn-ban" onclick="manageRole('remove')">إزالة ❌</button>
                </div>
            </div>
        </div>

        <div class="box" style="margin-bottom: 20px;">
            <h2>📢 إرسال رسالة لجميع الأعضاء (DM)</h2>
            <textarea id="broadcastMsg" placeholder="اكتب رسالتك هنا..."></textarea>
            <button class="action-btn btn-green" onclick="sendBroadcast()" style="width: 100%;">إرسال للجميع الآن 🚀</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div class="box"><h2>👑 لوق الرتب</h2><ul class="log-list">${renderLogs('ROLES')}</ul></div>
            <div class="box"><h2>⚙️ لوق الإجراءات</h2><ul class="log-list">${renderLogs('ACTIONS')}</ul></div>
        </div>

        <script>
            function executeAction(type) {
                const userId = document.getElementById('targetId').value;
                const reason = document.getElementById('reason').value || 'بدون سبب';
                if (!userId) return alert('الرجاء إدخال آيدي العضو!');
                if (confirm('تأكيد التنفيذ؟')) {
                    fetch('/api/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, userId, reason })
                    }).then(res => res.json()).then(d => { alert(d.message); location.reload(); });
                }
            }

            function manageRole(action) {
                const userId = document.getElementById('roleUserId').value;
                const roleId = document.getElementById('roleId').value;
                if (!userId || !roleId) return alert('أدخل آيدي العضو والرتبة!');
                fetch('/api/role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action, userId, roleId })
                }).then(res => res.json()).then(d => { alert(d.message); location.reload(); });
            }

            function sendBroadcast() {
                const message = document.getElementById('broadcastMsg').value;
                if (!message) return alert('اكتب الرسالة أولاً!');
                if (confirm('تأكيد الإرسال للجميع؟')) {
                    fetch('/api/broadcast', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message })
                    }).then(res => res.json()).then(d => { alert(d.message); document.getElementById('broadcastMsg').value = ''; });
                }
            }
        </script>
    `;
    res.send(getLayout('لوحة التحكم', 'home', content, req.session.user));
});

app.get('/logs', checkAuth, (req, res) => {
    const all = liveLogs.map(l => `<li><span><strong>[${l.category}]</strong> ${l.message}</span> <span class="time">${l.time}</span></li>`).join('');
    res.send(getLayout('السجلات', 'logs', `<div class="box"><h2>📜 السجلات الكاملة</h2><ul class="log-list" style="max-height:450px;">${all}</ul></div>`, req.session.user));
});

app.post('/api/action', checkAuth, async (req, res) => {
    const { type, userId, reason } = req.body;
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.status(404).json({ message: 'العضو غير موجود.' });

        if (type === 'ban') { await member.ban({ reason }); addLog('BAN', `حظر ${member.user.tag}`, 'ACTIONS'); }
        else if (type === 'kick') { await member.kick(reason); addLog('KICK', `طرد ${member.user.tag}`, 'ACTIONS'); }
        else if (type === 'timeout') { await member.timeout(10*60*1000, reason); addLog('TIMEOUT', `ميوت لـ ${member.user.tag}`, 'ACTIONS'); }
        res.json({ message: 'تم التنفيذ بنجاح!' });
    } catch (e) {
        res.status(500).json({ message: 'فشل التنفيذ، تأكد من صلاحيات البوت.' });
    }
});

app.post('/api/role', checkAuth, async (req, res) => {
    const { action, userId, roleId } = req.body;
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const member = await guild.members.fetch(userId).catch(() => null);
        const role = await guild.roles.fetch(roleId).catch(() => null);

        if (!member || !role) return res.status(404).json({ message: 'العضو أو الرتبة غير موجودة.' });

        if (action === 'add') {
            await member.roles.add(role);
            addLog('ROLE', `إعطاء رتبة [${role.name}] لـ ${member.user.tag}`, 'ROLES');
            res.json({ message: `تم إعطاء رتبة ${role.name} بنجاح!` });
        } else {
            await member.roles.remove(role);
            addLog('ROLE', `إزالة رتبة [${role.name}] من ${member.user.tag}`, 'ROLES');
            res.json({ message: `تم إزالة رتبة ${role.name} بنجاح!` });
        }
    } catch (e) {
        res.status(500).json({ message: 'فشل تعديل الرتبة، تأكد أن رتبة البوت أعلى.' });
    }
});

app.post('/api/broadcast', checkAuth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: 'الرسالة فارغة.' });

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const members = await guild.members.fetch();
        let successCount = 0;

        for (const [id, member] of members) {
            if (!member.user.bot) {
                try {
                    await member.send(`📢 **رسالة إدارية:**\n\n${message}`);
                    successCount++;
                } catch (err) {}
            }
        }
        addLog('BROADCAST', `إرسال رسالة لـ ${successCount} عضو`, 'ACTIONS');
        res.json({ message: `تم الإرسال بنجاح إلى ${successCount} عضو!` });
    } catch (e) {
        res.status(500).json({ message: 'حدث خطأ أثناء الإرسال الجماعي.' });
    }
});

client.on('guildMemberUpdate', (oldM, newM) => {
    newM.roles.cache.filter(r => !oldM.roles.cache.has(r.id)).forEach(r => {
        if (['admin', 'streamer', 'مشرف', 'management'].some(n => r.name.toLowerCase().includes(n))) {
            addLog('ROLE', `تحديث رتبة [${r.name}] لـ ${newM.user.tag}`, 'ROLES');
        }
    });
});

client.on('guildMemberAdd', m => {
    if (m.user.bot) addLog('BOT', `انضم بوت: ${m.user.tag}`, 'BOTS');
});

client.once('ready', () => console.log(`[BOT] ${client.user.tag} متصل وجاهز!`));
app.listen(PORT, () => console.log(`[WEB] شغال على بورت ${PORT}`));
client.login(process.env.TOKEN);
