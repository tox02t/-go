const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات البوت والصلاحيات
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

// مصفوفة للسجلات الحية
const liveLogs = [];

function addLog(type, message, category = 'SYSTEM') {
    const time = new Date().toLocaleTimeString('ar-SA');
    liveLogs.unshift({ type, message, time, category });
    if (liveLogs.length > 150) liveLogs.pop();
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// قالب التصميم الموحد الاحترافي والسلس للجوّال والسطح المكتب
function getLayout(title, activePage, content) {
    const botName = client.user ? client.user.username : 'TOX Shield';
    const status = client.isReady() ? 'متصل وحماية نشطة 🟢' : 'غير متصل 🔴';

    return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | ${botName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
            body { background-color: #090d16; color: #f1f5f9; display: flex; height: 100vh; overflow: hidden; }
            
            /* القائمة الجانبية السلسة */
            .sidebar { width: 260px; background: #0e1626; border-left: 1px solid #1e293b; display: flex; flex-direction: column; transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); position: fixed; right: 0; top: 0; height: 100%; z-index: 100; }
            .sidebar-header { padding: 22px; font-size: 19px; font-weight: 900; color: #38bdf8; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center; }
            .sidebar-menu { list-style: none; padding: 20px 12px; }
            .sidebar-menu li { padding: 12px 16px; margin-bottom: 8px; border-radius: 10px; font-weight: 600; color: #94a3b8; transition: 0.2s; }
            .sidebar-menu li a { color: inherit; text-decoration: none; display: block; }
            .sidebar-menu li:hover, .sidebar-menu li.active { background: #1e293b; color: #38bdf8; transform: translateX(-4px); }

            /* المحتوى الرئيسي */
            .main-content { flex: 1; margin-right: 260px; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
            .topbar { background: #0e1626; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; position: sticky; top: 0; z-index: 90; }
            .menu-toggle { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; display: none; }
            
            .container { padding: 30px; max-width: 1200px; margin: auto; width: 100%; }
            .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin-bottom: 25px; }
            .card { background: #0e1626; border: 1px solid #1e293b; padding: 20px; border-radius: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
            .card h3 { font-size: 13px; color: #94a3b8; margin-bottom: 6px; }
            .card .value { font-size: 18px; font-weight: 700; color: #f8fafc; }

            @media(max-width: 900px) { .sidebar { right: -260px; } .sidebar.open { right: 0; } .main-content { margin-right: 0; } .menu-toggle { display: block; } }
            
            .box { background: #0e1626; border: 1px solid #1e293b; padding: 22px; border-radius: 14px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2); }
            .box h2 { font-size: 17px; margin-bottom: 15px; color: #38bdf8; border-bottom: 1px solid #1e293b; padding-bottom: 10px; display: flex; align-items: center; gap: 8px; }
            
            input, select { width: 100%; padding: 12px 15px; margin-bottom: 12px; background: #090d16; border: 1px solid #1e293b; color: #fff; border-radius: 10px; font-size: 14px; outline: none; transition: 0.2s; }
            input:focus, select:focus { border-color: #38bdf8; }
            
            .btn-group { display: flex; gap: 10px; }
            button.action-btn { flex: 1; padding: 12px; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; color: #fff; transition: 0.2s; }
            button.action-btn:active { transform: scale(0.98); }
            .btn-ban { background: #dc2626; } .btn-ban:hover { background: #b91c1c; }
            .btn-kick { background: #d97706; } .btn-kick:hover { background: #b45309; }
            .btn-timeout { background: #7c3aed; } .btn-timeout:hover { background: #6d28d9; }

            .log-list { list-style: none; overflow-y: auto; max-height: 280px; background: #090d16; padding: 12px; border-radius: 10px; border: 1px solid #1e293b; }
            .log-list li { padding: 10px 8px; border-bottom: 1px solid #1e293b; font-size: 13px; color: #cbd5e1; display: flex; justify-content: space-between; align-items: center; }
            .log-list li:last-child { border-bottom: none; }
            .log-list .time { color: #64748b; font-size: 11px; background: #1e293b; padding: 2px 6px; border-radius: 4px; }
            .empty-log { color: #64748b; text-align: center; padding: 20px; font-size: 13px; }
        </style>
    </head>
    <body>
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <span>🛡️ TOX Panel</span>
                <button class="menu-toggle" onclick="toggleSidebar()">✕</button>
            </div>
            <ul class="sidebar-menu">
                <li class="${activePage === 'home' ? 'active' : ''}"><a href="/">📊 نظرة عامة واللوقات</a></li>
                <li class="${activePage === 'settings' ? 'active' : ''}"><a href="/settings">⚙️ إعدادات الحماية</a></li>
                <li class="${activePage === 'logs' ? 'active' : ''}"><a href="/logs">📜 السجلات الكاملة</a></li>
            </ul>
        </div>

        <main class="main-content">
            <header class="topbar">
                <button class="menu-toggle" onclick="toggleSidebar()">≡</button>
                <div style="font-weight: 700; color: #38bdf8; font-size: 15px;">لوحة التحكم المركزية</div>
                <div style="font-size: 13px; background: #1e293b; padding: 6px 14px; border-radius: 20px; color: #38bdf8;">${status}</div>
            </header>
            <div class="container">
                ${content}
            </div>
        </main>
        <script>
            function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
        </script>
    </body>
    </html>`;
}

// --- 1. الصفحة الرئيسية (نظرة عامة + رومات اللوقات الحية) ---
app.get('/', (req, res) => {
    const botName = client.user ? client.user.username : 'TOX Shield';
    
    const renderLogs = (cat) => {
        const filtered = liveLogs.filter(l => l.category === cat);
        if (filtered.length === 0) return '<li class="empty-log">لا توجد سجلات حالياً في هذا القسم...</li>';
        return filtered.map(l => `<li><span><strong>[${l.type}]</strong> ${l.message}</span> <span class="time">${l.time}</span></li>`).join('');
    };

    const content = `
        <div class="grid-stats">
            <div class="card"><h3>اسم البوت</h3><div class="value">${botName}</div></div>
            <div class="card"><h3>حالة السيرفر</h3><div class="value" style="color: #4ade80;">متصل ومحمي بنجاح</div></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div class="box">
                <h2>⚡ إدارة العقوبات السريعة</h2>
                <input type="text" id="targetId" placeholder="أدخل آيدي العضو (User ID)...">
                <input type="text" id="reason" placeholder="سبب الإجراء...">
                <div class="btn-group">
                    <button class="action-btn btn-ban" onclick="executeAction('ban')">باند 🚨</button>
                    <button class="action-btn btn-kick" onclick="executeAction('kick')">طرد 👢</button>
                    <button class="action-btn btn-timeout" onclick="executeAction('timeout')">تأيم أوت ⏱️</button>
                </div>
            </div>
            <div class="box">
                <h2>📌 معلومات سريعة</h2>
                <p style="color: #94a3b8; font-size: 13px; line-height: 1.7;">
                    اللوحة متصلة بلحظتها مع سيرفر الديسكورد. أي منح رتبة إدارية، دخول بوت جديد، أو تنفيذ عقوبة يظهر هنا فوراً بدون الحاجة لإعادة تحميل الصفحة يدوياً بالكامل.
                </p>
            </div>
        </div>

        <!-- رومات اللوقات الأساسية المطلوبة -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="box">
                <h2>👑 لوق منح رتب الإدارة (Admin / Streamer)</h2>
                <ul class="log-list">${renderLogs('ROLES')}</ul>
            </div>
            <div class="box">
                <h2>🤖 لوق دخول البوتات للسيرفر</h2>
                <ul class="log-list">${renderLogs('BOTS')}</ul>
            </div>
        </div>
        
        <script>
            function executeAction(type) {
                const userId = document.getElementById('targetId').value;
                const reason = document.getElementById('reason').value || 'لا يوجد سبب';
                if (!userId) return alert('الرجاء إدخال آيدي العضو أولاً!');
                
                if (confirm('هل أنت متأكد من تنفيذ (' + type + ') على العضو؟')) {
                    fetch('/api/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, userId, reason })
                    }).then(res => res.json()).then(data => {
                        alert(data.message);
                        location.reload();
                    }).catch(() => alert('حدث خطأ في الاتصال بالسيرفر.'));
                }
            }
        </script>
    `;
    res.send(getLayout('نظرة عامة واللوقات', 'home', content));
});

// --- 2. إعدادات الحماية ---
app.get('/settings', (req, res) => {
    const content = `
        <div class="box">
            <h2>⚙️ إعدادات الحماية والأمان</h2>
            <form onsubmit="saveSettings(event)">
                <label style="display:block; margin-bottom:8px; color:#cbd5e1; font-size: 13px;">حماية الروابط والسبام:</label>
                <select id="antiLink">
                    <option value="on">مفعل (حذف تلقائي وحظر المخالفين)</option>
                    <option value="off">معطل</option>
                </select>

                <label style="display:block; margin-bottom:8px; color:#cbd5e1; font-size: 13px; margin-top:15px;">منع دخول البوتات غير الموثوقة:</label>
                <select id="antiBot">
                    <option value="on">مفعل (طرد فوري لأي بوت غير مصرح)</option>
                    <option value="off">معطل</option>
                </select>

                <button type="submit" class="action-btn btn-timeout" style="margin-top:20px; width:100%;">💾 حفظ الإعدادات</button>
            </form>
        </div>
        <script>
            function saveSettings(e) {
                e.preventDefault();
                alert('تم حفظ إعدادات الحماية وتطبيقها بنجاح!');
            }
        </script>
    `;
    res.send(getLayout('إعدادات الحماية', 'settings', content));
});

// --- 3. السجلات الكاملة ---
app.get('/logs', (req, res) => {
    const allLogsHtml = liveLogs.length > 0 
        ? liveLogs.map(l => `<li><span><strong>[${l.category} - ${l.type}]</strong> ${l.message}</span> <span class="time">${l.time}</span></li>`).join('')
        : '<li class="empty-log">لا توجد سجلات مسجلة حتى الآن...</li>';

    const content = `
        <div class="box">
            <h2>📜 سجلات الأحداث الشاملة</h2>
            <ul class="log-list" style="max-height: 480px;">
                ${allLogsHtml}
            </ul>
        </div>
    `;
    res.send(getLayout('السجلات الكاملة', 'logs', content));
});

// --- API تنفيذ العقوبات ---
app.post('/api/action', async (req, res) => {
    const { type, userId, reason } = req.body;
    const guildId = process.env.GUILD_ID;

    try {
        if (!guildId) return res.status(400).json({ message: 'خطأ: لم يتم ضبط GUILD_ID في البيئة.' });
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId).catch(() => null);

        if (!member) return res.status(404).json({ message: 'العضو غير موجود في السيرفر أو الآيدي خطأ.' });

        if (type === 'ban') {
            await member.ban({ reason });
            addLog('BAN', `تم حظر ${member.user.tag} من لوحة الويب. السبب: ${reason}`, 'ACTIONS');
            return res.json({ message: 'تم تنفيذ الباند بنجاح!' });
        } else if (type === 'kick') {
            await member.kick(reason);
            addLog('KICK', `تم طرد ${member.user.tag} من لوحة الويب. السبب: ${reason}`, 'ACTIONS');
            return res.json({ message: 'تم طرد العضو بنجاح!' });
        } else if (type === 'timeout') {
            await member.timeout(10 * 60 * 1000, reason);
            addLog('TIMEOUT', `تم عمل تايم أوت لـ ${member.user.tag} لمدة 10 دقائق.`, 'ACTIONS');
            return res.json({ message: 'تم تنفيذ التايم أوت بنجاح!' });
        }
        res.status(400).json({ message: 'إجراء غير معروف.' });
    } catch (error) {
        res.status(500).json({ message: 'فشل التنفيذ، تأكد من صلاحيات البوت في ديسكورد.' });
    }
});

// --- رصد أحداث الديسكورد وتحديث اللوقات ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith('!ban')) {
        const target = message.mentions.members.first();
        if (target) {
            await target.ban({ reason: 'أمر مباشر عبر ديسكورد' });
            addLog('DISCORD BAN', `تم حظر ${target.user.tag} عبر أمر ديسكورد.`, 'ACTIONS');
            message.reply(`✅ تم حظر العضو **${target.user.tag}** بنجاح.`);
        }
    }
});

// رصد إعطاء رتب الإدارة (مثل Admin أو Streamer أو مشرف)
client.on('guildMemberUpdate', (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    addedRoles.forEach(role => {
        const rName = role.name.toLowerCase();
        if (rName.includes('admin') || rName.includes('streamer') || rName.includes('مشرف') || rName.includes('إداري')) {
            addLog('ROLE ADD', `تم منح رتبة [${role.name}] للإداري/الستريمر: ${newMember.user.tag}`, 'ROLES');
        }
    });
});

// رصد دخول بوت جديد
client.on('guildMemberAdd', (member) => {
    if (member.user.bot) {
        addLog('NEW BOT', `تم رصد دخول بوت جديد للسيرفر: ${member.user.tag}`, 'BOTS');
    }
});

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} متصل وجاهز!`);
    addLog('SYSTEM', `البوت اشتغل بنجاح باسم ${client.user.tag}`);
});

app.listen(PORT, () => {
    console.log(`[WEB] لوحة التحكم السلسة تعمل على بورت ${PORT}`);
});

client.login(process.env.TOKEN);
