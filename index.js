const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
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

// --- واجهة الويب الفخمة جداً (Dashboard) ---
app.get('/', (req, res) => {
    const botName = client.user ? client.user.username : 'TOX Shield';
    const status = client.isReady() ? 'متصل وحماية نشطة 🟢' : 'غير متصل 🔴';

    // تصنيف اللوقات حسب الطلب (لوقات الرولات، دخول البوتات، العقوبات)
    const renderLogs = (cat) => {
        const filtered = liveLogs.filter(l => l.category === cat);
        if (filtered.length === 0) return '<li class="empty-log">لا توجد سجلات في هذا القسم حالياً...</li>';
        return filtered.map(l => `<li><span class="time">[${l.time}]</span> <strong>[${l.type}]:</strong> ${l.message}</li>`).join('');
    };

    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لوحة تحكم | ${botName}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Cairo', sans-serif; }
            body { background-color: #0b0f19; color: #f1f5f9; display: flex; height: 100vh; overflow: hidden; }
            
            /* القائمة الجانبية (Sidebar) */
            .sidebar { width: 280px; background: #111827; border-left: 1px solid #1f2937; display: flex; flex-direction: column; transition: 0.3s ease; position: fixed; right: 0; top: 0; height: 100%; z-index: 100; }
            .sidebar-header { padding: 20px; font-size: 20px; font-weight: 900; color: #38bdf8; border-bottom: 1px solid #1f2937; display: flex; justify-content: space-between; align-items: center; }
            .sidebar-menu { list-style: none; padding: 20px 10px; }
            .sidebar-menu li { padding: 12px 15px; margin-bottom: 8px; border-radius: 8px; cursor: pointer; font-weight: 600; color: #9ca3af; transition: 0.2s; }
            .sidebar-menu li:hover, .sidebar-menu li.active { background: #1e293b; color: #38bdf8; }

            /* الهيدر العلوي */
            .main-content { flex: 1; margin-right: 280px; display: flex; flex-direction: column; height: 100vh; overflow-y: auto; }
            .topbar { background: #111827; padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; }
            .menu-toggle { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; display: none; }
            
            .container { padding: 30px; max-width: 1200px; margin: auto; width: 100%; }
            .grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .card { background: #111827; border: 1px solid #1f2937; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .card h3 { font-size: 14px; color: #9ca3af; margin-bottom: 8px; }
            .card .value { font-size: 20px; font-weight: 700; color: #f8fafc; }

            /* أقسام التحكم والعقوبات */
            .control-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            @media(max-width: 900px) { .control-section { grid-template-columns: 1fr; } .sidebar { right: -280px; } .sidebar.open { right: 0; } .main-content { margin-right: 0; } .menu-toggle { display: block; } }
            
            .box { background: #111827; border: 1px solid #1f2937; padding: 20px; border-radius: 12px; }
            .box h2 { font-size: 18px; margin-bottom: 15px; color: #38bdf8; border-bottom: 1px solid #1f2937; padding-bottom: 8px; }
            
            input, select { width: 100%; padding: 12px; margin-bottom: 12px; background: #0b0f19; border: 1px solid #374151; color: #fff; border-radius: 8px; font-size: 14px; }
            .btn-group { display: flex; gap: 10px; }
            button.action-btn { flex: 1; padding: 12px; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; color: #fff; transition: 0.2s; }
            .btn-ban { background: #dc2626; } .btn-ban:hover { background: #b91c1c; }
            .btn-kick { background: #d97706; } .btn-kick:hover { background: #b45309; }
            .btn-timeout { background: #7c3aed; } .btn-timeout:hover { background: #6d28d9; }

            /* صندوق اللوقات الفخم */
            .logs-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .log-box { background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; height: 320px; display: flex; flex-direction: column; }
            .log-box h3 { font-size: 16px; margin-bottom: 10px; color: #38bdf8; }
            .log-list { list-style: none; overflow-y: auto; flex: 1; background: #0b0f19; padding: 10px; border-radius: 8px; border: 1px solid #1f2937; }
            .log-list li { padding: 8px 0; border-bottom: 1px solid #1f2937; font-size: 13px; color: #cbd5e1; }
            .log-list .time { color: #64748b; font-size: 11px; margin-left: 5px; }
            .empty-log { color: #64748b; text-align: center; padding: 20px; }
        </style>
    </main>
    </head>
    <body>

        <!-- القائمة الجانبية مع الـ 3 شرطات -->
        <div class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <span>🛡️ TOX Panel</span>
                <button class="menu-toggle" onclick="toggleSidebar()">✕</button>
            </div>
            <ul class="sidebar-menu">
                <li class="active">📊 نظرة عامة</li>
                <li onclick="alert('قسم إعدادات الحماية قيد التفعيل')">⚙️ إعدادات الحماية</li>
                <li onclick="alert('قسم سجلات الإدارة قيد التفعيل')">📜 سجلات الإدارة</li>
                <li onclick="location.reload()">🔄 تحديث اللوقات</li>
            </ul>
        </div>

        <div class="main-content">
            <div class="topbar">
                <button class="menu-toggle" onclick="toggleSidebar()">≡</button>
                <div style="font-weight: 700; color: #38bdf8;">مرحباً بك، لوحة التحكم المركزية</div>
                <div style="font-size: 14px; background: #1e293b; padding: 5px 12px; border-radius: 20px;">حالة البوت: <strong>${status}</strong></div>
            </div>

            <div class="container">
                <div class="grid-stats">
                    <div class="card">
                        <h3>اسم البوت</h3>
                        <div class="value">${botName}</div>
                    </div>
                    <div class="card">
                        <h3>حالة النظام</h3>
                        <div class="value" style="color: #4ade80;">متصل ومستقر</div>
                    </div>
                </div>

                <!-- خانات التحكم بالعقوبات (باند، كيك، تايم أوت) -->
                <div class="control-section">
                    <div class="box">
                        <h2>⚡ إدارة العقوبات السريعة</h2>
                        <input type="text" id="targetId" placeholder="أدخل آيدي العضو (User ID)...">
                        <input type="text" id="reason" placeholder="سبب الإجراء (اختياري)...">
                        <div class="btn-group">
                            <button class="action-btn btn-ban" onclick="executeAction('ban')">باند 🚨</button>
                            <button class="action-btn btn-kick" onclick="executeAction('kick')">طرد 👢</button>
                            <button class="action-btn btn-timeout" onclick="executeAction('timeout')">تأيم أوت ⏱️</button>
                        </div>
                    </div>

                    <div class="box">
                        <h2>📌 معلومات سريعة</h2>
                        <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
                            هذه اللوحة مرتبطة مباشرة ببوت الديسكورد الخاص بك. أي عملية حظر، كيك، أو إعطاء رتبة إدارية (مثل Admin أو Streamer) أو دخول بوت جديد يتم تسجيلها ورصدها هنا فوراً بالثانية.
                        </p>
                    </div>
                </div>

                <!-- رومات اللوقات -->
                <div class="logs-container">
                    <div class="log-box">
                        <h3>👑 لوقات رتب الإدارة (Admin / Streamer)</h3>
                        <ul class="log-list">
                            ${renderLogs('ROLES')}
                        </ul>
                    </div>

                    <div class="log-box">
                        <h3>🤖 لوقات دخول البوتات للسيرفر</h3>
                        <ul class="log-list">
                            ${renderLogs('BOTS')}
                        </ul>
                    </div>
                </div>

                <div class="logs-container" style="margin-top: 20px;">
                    <div class="log-box" style="width: 100%; height: 250px;">
                        <h3>🚨 لوقات العقوبات والباند العام</h3>
                        <ul class="log-list">
                            ${renderLogs('ACTIONS')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function toggleSidebar() {
                document.getElementById('sidebar').classList.toggle('open');
            }

            function executeAction(type) {
                const userId = document.getElementById('targetId').value;
                const reason = document.getElementById('reason').value || 'لا يوجد سبب';
                if (!userId) {
                    alert('الرجاء إدخال آيدي العضو أولاً!');
                    return;
                }
                
                if (confirm('هل أنت متأكد من تنفيذ الإجراء (' + type + ') على العضو؟')) {
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
    </body>
    </html>
    `;
    res.send(html);
});

// --- API استقبال أوامر التحكم من الموقع (باند، كيك، تايم أوت) ---
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
            addLog('BAN', `تم حظر العضو ${member.user.tag} من لوحة الويب. السبب: ${reason}`, 'ACTIONS');
            return res.json({ message: 'تم تنفيذ الباند بنجاح!' });
        } else if (type === 'kick') {
            await member.kick(reason);
            addLog('KICK', `تم طرد العضو ${member.user.tag} من لوحة الويب. السبب: ${reason}`, 'ACTIONS');
            return res.json({ message: 'تم طرد العضو بنجاح!' });
        } else if (type === 'timeout') {
            // إعطاء تايم أوت لمدة 10 دقائق كمثال افتراضي
            await member.timeout(10 * 60 * 1000, reason);
            addLog('TIMEOUT', `تم عمل تايم أوت للعضو ${member.user.tag} لمدة 10 دقائق. السبب: ${reason}`, 'ACTIONS');
            return res.json({ message: 'تم إعطاء تايم أوت بنجاح!' });
        }

        res.status(400).json({ message: 'إجراء غير معروف.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'فشل تنفيذ الإجراء، تأكد من صلاحيات البوت.' });
    }
});

// --- رصد أحداث الديسكورد التلقائية (أوامر الـ ديسكورد + اللوقات) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const guildId = process.env.GUILD_ID;

    if (message.guild.id !== guildId) return;

    // أمر الباند من الديسكورد: !ban @user السبب
    if (command === 'ban') {
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(' ') || 'بدون سبب';
        if (!target) return message.reply('❌ العضو غير متوفر أو لم تقم بالإشارة إليه.');

        try {
            await target.ban({ reason });
            addLog('DISCORD BAN', `تم حظر ${target.user.tag} بواسطة الأمر في ديسكورد.`, 'ACTIONS');
            message.reply(`✅ تم حظر العضو **${target.user.tag}** بنجاح.`);
        } catch (e) {
            message.reply('❌ فشل الحظر، تأكد من صلاحيات البوت.');
        }
    }

    // أمر الكيك من الديسكورد: !kick @user السبب
    if (command === 'kick') {
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        const reason = args.slice(1).join(' ') || 'بدون سبب';
        if (!target) return message.reply('❌ العضو غير متوفر.');

        try {
            await target.kick(reason);
            addLog('DISCORD KICK', `تم طرد ${target.user.tag} عبر أمر ديسكورد.`, 'ACTIONS');
            message.reply(`✅ تم طرد العضو **${target.user.tag}** بنجاح.`);
        } catch (e) {
            message.reply('❌ فشل الطرد.');
        }
    }

    // أمر التايم أوت من الديسكورد: !timeout @user
    if (command === 'timeout') {
        const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
        if (!target) return message.reply('❌ العضو غير متوفر.');

        try {
            await target.timeout(10 * 60 * 1000, 'عقوبة عبر أمر ديسكورد');
            addLog('DISCORD TIMEOUT', `تم إعطاء تايم أوت لـ ${target.user.tag} عبر ديسكورد.`, 'ACTIONS');
            message.reply(`✅ تم إسكات العضو **${target.user.tag}** لمدة 10 دقائق.`);
        } catch (e) {
            message.reply('❌ فشل تنفيذ التايم أوت.');
        }
    }
});

// رصد إعطاء رتب إدارية (مثل Admin أو Streamer)
client.on('guildMemberUpdate', (oldMember, newMember) => {
    const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
    addedRoles.forEach(role => {
        // افحص أسماء الرتب الحساسة مثل Admin أو Streamer
        if (role.name.toLowerCase().includes('admin') || role.name.toLowerCase().includes('streamer') || role.name.toLowerCase().includes('مشرف')) {
            addLog('ROLE ADDED', `تم إعطاء رتبة [${role.name}] للإداري/الستريمر: ${newMember.user.tag}`, 'ROLES');
        }
    });
});

// رصد دخول بوت جديد للسيرفر
client.on('guildMemberAdd', (member) => {
    if (member.user.bot) {
        addLog('NEW BOT', `تم رصد ودخول بوت جديد إلى السيرفر: ${member.user.tag}`, 'BOTS');
    }
});

// تشغيل البوت والسرفر
client.once('ready', () => {
    console.log(`[BOT] تم تسجيل الدخول بنجاح باسم ${client.user.tag}`);
    addLog('SYSTEM', `البوت اشتغل بنجاح باسم ${client.user.tag}`);
});

app.listen(PORT, () => {
    console.log(`[WEB] لوحة التحكم الفخمة تعمل عبر البورت ${PORT}`);
});

client.login(process.env.TOKEN);
