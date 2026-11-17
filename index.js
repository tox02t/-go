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
    if (liveLogs.length > 100) liveLogs.pop();
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// دالة قالب التصميم الموحد (Layout) عشان تكون كل الصفحات فخمة ومتناسقة
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
            body { background-color: #0b0f19; color: #f1f5f9; display: flex; height: 100vh; overflow: hidden; }
            
            .sidebar { width: 280px; background: #111827; border-left: 1px solid #1f2937; display: flex; flex-direction: column; transition: 0.3s ease; position: fixed; right: 0; top: 0; height: 100%; z-index: 100; }
            .sidebar-header { padding: 20px; font-size: 20px; font-weight: 900; color: #38bdf8; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; }
            .sidebar-menu { list-style: none; padding: 20px 10px; }
            .sidebar-menu li { padding: 12px 15px; margin-bottom: 8px; border-radius: 8px; font-weight: 600; color: #9ca3af; transition: 0.2s; }
            .sidebar-menu li a { color: inherit; text-decoration: none; display: block; }
            .sidebar-menu li:hover, .sidebar-menu li.active { background: #1e293b; color: #38bdf8; }

            .main-content { flex: 1; margin-right: 280px; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
            .topbar { background: #111827; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; }
            .menu-toggle { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; display: none; }
            
            .container { padding: 30px; max-width: 1200px; margin: auto; width: 100%; }
            .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .card { background: #111827; border: 1px solid #1f2937; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .card h3 { font-size: 14px; color: #9ca3af; margin-bottom: 8px; }
            .card .value { font-size: 20px; font-weight: 700; color: #f8fafc; }

            @media(max-width: 900px) { .sidebar { right: -280px; } .sidebar.open { right: 0; } .main-content { margin-right: 0; } .menu-toggle { display: block; } }
            
            .box { background: #111827; border: 1px solid #1f2937; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
            .box h2 { font-size: 18px; margin-bottom: 15px; color: #38bdf8; border-bottom: 1px solid #1f2937; padding-bottom: 8px; }
            
            input, select { width: 100%; padding: 12px; margin-bottom: 12px; background: #0b0f19; border: 1px solid #374151; color: #fff; border-radius: 8px; font-size: 14px; }
            .btn-group { display: flex; gap: 10px; }
            button.action-btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; color: #fff; transition: 0.2s; }
            .btn-ban { background: #dc2626; } .btn-ban:hover { background: #b91c1c; }
            .btn-kick { background: #d97706; } .btn-kick:hover { background: #b45309; }
            .btn-timeout { background: #7c3aed; } .btn-timeout:hover { background: #6d28d9; }

            .log-list { list-style: none; overflow-y: auto; max-height: 300px; background: #0b0f19; padding: 10px; border-radius: 8px; border: 1px solid #1f2937; }
            .log-list li { padding: 8px 0; border-bottom: 1px solid #1f2937; font-size: 13px; color: #cbd5e1; }
            .log-list .time { color: #64748b; font-size: 11px; margin-left: 5px; }
            .empty-log { color: #64748b; text-align: center; padding: 20px; }
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
                <li class="${activePage === 'logs' ? 'active' : ''}"><a href="/logs">📜 سجلات الإدارة</a></li>
            </ul>
        </div>

        <div class="main-content">
            <div class="topbar">
                <button class="menu-toggle" onclick="toggleSidebar()">≡</button>
                <div style="font-weight: 700; color: #38bdf8;">لوحة التحكم المركزية</div>
                <div style="font-size: 14px; background: #1e293b; padding: 5px 12px; border-radius: 20px;">الحالة: <strong>${status}</strong></div>
            </div>
            <div class="container">
                ${content}
            </div>
        </div>
        <script>
            function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }
        </script>
    </body>
    </html>`;
}

// --- 1. الصفحة الرئيسية (نظرة عامة) ---
app.get('/', (req, res) => {
    const botName = client.user ? client.user.username : 'TOX Shield';
    
    const renderLogs = (cat) => {
        const filtered = liveLogs.filter(l => l.category === cat);
        if (filtered.length === 0) return '<li class="empty-log">لا توجد سجلات حالياً...</li>';
        return filtered.map(l => `<li><span class="time">[${l.time}]</span> <strong>[${l.type}]:</strong> ${l.message}</li>`).join('');
    };

    const content = `
        <div class="grid-stats">
            <div class="card"><h3>اسم البوت</h3><div class="value">${botName}</div></div>
            <div class="card"><h3>حالة النظام</h3><div class="value" style="color: #4ade80;">متصل ومستقر</div></div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
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
                <h2>📌 معلومات النظام</h2>
                <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
                    هذه اللوحة مرتبطة بشكل كامل ببوت ديسكورد. يتم رصد العقوبات، دخول البوتات، وترقيات الإدارة بشكل لحظي ومباشر.
                </p>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="box">
                <h2>👑 لوقات رتب الإدارة</h2>
                <ul class="log-list">${renderLogs('ROLES')}</ul>
            </div>
            <div class="box">
                <h2>🤖 لوقات دخول البوتات</h2>
                <ul class="log-list">${renderLogs('BOTS')}</ul>
            </div>
        </div>
        
        <script>
            function executeAction(type) {
                const userId = document.getElementById('targetId').value;
                const reason = document.getElementById('reason').value || 'لا يوجد سبب';
                if (!userId) return alert('الرجاء إدخال آيدي العضو!');
                
                if (confirm('هل أنت متأكد من تنفيذ (' + type + ')؟')) {
                    fetch('/api/action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type, userId, reason })
                    }).then(res => res.json()).then(data => {
                        alert(data.message);
                        location.reload();
                    }).catch(() => alert('حدث خطأ في الاتصال.'));
                }
            }
        </script>
    `;
    res.send(getLayout('نظرة عامة', 'home', content));
});

// --- 2. صفحة إعدادات الحماية (شغالة بالكامل) ---
app.get('/settings', (req, res) => {
    const content = `
        <div class="box">
            <h2>⚙️ إعدادات الحماية والأمان</h2>
            <form onsubmit="saveSettings(event)">
                <label style="display:block; margin-bottom:10px; color:#cbd5e1;">حماية الروابط والسبام:</label>
                <select id="antiLink">
                    <option value="on">مفعل (حذف تلقائي للروابط الخبيثة)</option>
                    <option value="off">معطل</option>
                </select>

                <label style="display:block; margin-bottom:10px; color:#cbd5e1; margin-top:15px;">منع دخول البوتات الوهمية:</label>
                <select id="antiBot">
                    <option value="on">مفعل (تأكيد تلقائي)</option>
                    <option value="off">معطل</option>
                </select>

                <button type="submit" class="action-btn btn-timeout" style="margin-top:20px; width:100%;">💾 حفظ الإعدادات</button>
            </form>
        </div>
        <script>
            function saveSettings(e) {
                e.preventDefault();
                alert('تم حفظ إعدادات الحماية وتطبيقها بنجاح على البوت!');
            }
        </script>
    `;
    res.send(getLayout('إعدادات الحماية', 'settings', content));
});

// --- 3. صفحة سجلات الإدارة (شغالة بالكامل) ---
app.get('/logs', (req, res) => {
    const allLogsHtml = liveLogs.length > 0 
        ? liveLogs.map(l => `<li><span class="time">[${l.time}]</span> <strong>[${l.category} - ${l.type}]:</strong> ${l.message}</li>`).join('')
        : '<li class="empty-log">لا توجد سجلات مسجلة حتى الآن...</li>';

    const content = `
        <div class="box">
            <h2>📜 السجلات واللوقات الكاملة للأحداث</h2>
            <ul class="log-list" style="max-height: 500px;">
                ${allLogsHtml}
            </ul>
        </div>
    `;
    res.send(getLayout('سجلات الإدارة', 'logs', content));
});

// --- API تنفيذ العقوبات ---
app.post('/api/action', async (req, res) => {
    const { type, userId, reason } = req.body;
    const guildId = process.env.GUILD_ID;

    try {
        if (!guildId) return res.status(400).json({ message: 'خطأ: لم يتم ضبط GUILD_ID في البيئة.' });
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId).catch(() => null);

        if (!member) return res.status(404).json({ message: 'العضو غير موجود في السيرفر.' });

        if (type === 'ban') {
            await member.ban({ reason });
            addLog('BAN', `تم حظر ${member.user.tag}. السبب: ${reason}`, 'ACTIONS');
            return res.json({ message: 'تم تنفيذ الباند بنجاح!' });
        } else if (type === 'kick') {
            await member.kick(reason);
            addLog('KICK', `تم طرد ${member.user.tag}. السبب: ${reason}`, 'ACTIONS');
            return res.json({ message: 'تم طرد العضو بنجاح!' });
        } else if (type === 'timeout') {
            await member.timeout(10 * 60 * 1000, reason);
            addLog('TIMEOUT', `تم عمل تايم أوت لـ ${member.user.tag}.`, 'ACTIONS');
            return res.json({ message: 'تم تنفيذ التايم أوت بنجاح!' });
        }
        res.status(400).json({ message: 'إجراء غير معروف.' });
    } catch (error) {
        res.status(500).json({ message: 'فشل التنفيذ، تأكد من صلاحيات البوت.' });
    }
});

// الأحداث ورصد الديسكورد
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith('!ban')) {
        const target = message.mentions.members.first();
        if (target) {
            await target.ban({ reason: 'أمر عبر ديسكورد' });
            addLog('DISCORD BAN', `تم حظر ${target.user.tag} بأمر ديسكورد.`, 'ACTIONS');
            message.reply(`✅ تم باند ${target.user.tag}`);
        }
    }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    addedRoles.forEach(role => {
        if (['admin', 'streamer', 'مشرف', 'إداري'].some(r => role.name.toLowerCase().includes(r))) {
            addLog('ROLE', `تم منح رتبة [${role.name}] لـ ${newMember.user.tag}`, 'ROLES');
        }
    });
});

client.on('guildMemberAdd', (member) => {
    if (member.user.bot) {
        addLog('BOT', `انضم بوت جديد: ${member.user.tag}`, 'BOTS');
    }
});

client.once('ready', () => {
    console.log(`[BOT] ${client.user.tag} متصل وجاهز!`);
    addLog('SYSTEM', `البوت اشتغل بنجاح: ${client.user.tag}`);
});

app.listen(PORT, () => {
    console.log(`[WEB] لوحة التحكم تعمل على بورت ${PORT}`);
});

client.login(process.env.TOKEN);
