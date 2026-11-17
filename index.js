const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات البوت مع الصلاحيات والـ Intents الكاملة
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

// مصفوفة لحفظ السجلات (Logs) وعرضها في الموقع مباشرة
const liveLogs = [];

function addLog(type, message) {
    const time = new Date().toLocaleTimeString('ar-SA');
    liveLogs.unshift({ type, message, time });
    if (liveLogs.length > 50) liveLogs.pop(); // الاحتفاظ بأخر 50 سجل فقط
}

// إعدادات الـ Express
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// الصفحة الرئيسية (لوحة التحكم مباشرة بدون ملفات خارجية)
app.get('/', (req, res) => {
    const botName = client.user ? client.user.username : 'TOX Shield';
    const status = client.isReady() ? 'متصل وجاهز (Online)' : 'غير متصل';

    let logsHtml = liveLogs.length > 0 
        ? liveLogs.map(l => `<li>[${l.time}] <strong>[${l.type}]:</strong> ${l.message}</li>`).join('')
        : '<li>لا توجد سجلات حالياً...</li>';

    const html = `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>لوحة تحكم بوت TOX</title>
        <style>
            body { font-family: Tahoma, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: auto; background: #1e293b; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
            h1 { color: #38bdf8; text-align: center; }
            .status { padding: 10px; background: #0284c7; border-radius: 5px; text-align: center; font-weight: bold; margin-bottom: 20px; }
            .control-box, .logs-box { background: #334155; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            input, button { padding: 10px; margin: 5px 0; border-radius: 5px; border: none; font-size: 16px; }
            input { width: calc(100% - 22px); background: #0f172a; color: #fff; }
            button { background: #ef4444; color: white; cursor: pointer; font-weight: bold; width: 100%; }
            button:hover { background: #dc2626; }
            ul { list-style: none; padding: 0; }
            li { padding: 8px; border-bottom: 1px solid #475569; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🛡️ لوحة تحكم حماية ${botName}</h1>
            <div class="status">حالة البوت: ${status}</div>

            <div class="control-box">
                <h3>⚡ التحكم السريع (باند عضو بالـ ID)</h3>
                <form onsubmit="submitBan(event)">
                    <input type="text" id="userId" placeholder="ضع آيدي العضو هنا (User ID)..." required>
                    <button type="submit">🚨 تنفيذ باند للعضو</button>
                </form>
            </div>

            <div class="logs-box">
                <h3>📋 سجلات الحماية والنشاطات الحية</h3>
                <ul>${logsHtml}</ul>
            </div>
        </div>

        <script>
            function submitBan(event) {
                event.preventDefault();
                const userId = document.getElementById('userId').value;
                if (confirm('هل أنت متأكد من رغبتك في إعطاء باند لهذا العضو؟')) {
                    fetch('/dashboard/ban/' + userId, { method: 'POST' })
                    .then(res => {
                        if (res.ok) {
                            alert('تم تنفيذ الباند بنجاح!');
                            location.reload();
                        } else {
                            alert('فشل تنفيذ الطلب، تأكد من الآيدي وصلاحيات البوت.');
                        }
                    }).catch(() => alert('حدث خطأ في الاتصال.'));
                }
            }
        </script>
    </body>
    </html>
    `;
    res.send(html);
});

// مسار تنفيذ الباند لأي عضو من الموقع
app.post('/dashboard/ban/:userId', async (req, res) => {
    const userId = req.params.userId;
    const guildId = process.env.GUILD_ID;
    
    try {
        if (!guildId) return res.status(400).send("خطأ: لم يتم تحديد آيدي السيرفر GUILD_ID.");
        const guild = await client.guilds.fetch(guildId);
        if (!guild) return res.status(404).send("السيرفر غير موجود.");
        
        await guild.members.ban(userId, { reason: "تم إعطاؤه باند عبر لوحة التحكم Web Dashboard" });
        addLog('BAN', `تم حظر المستخدم ذو الأيدي (${userId}) بنجاح من لوحة التحكم.`);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send("فشل تنفيذ الباند.");
    }
});

// أحداث البوت
client.once('ready', () => {
    console.log(`[BOT] تم تسجيل الدخول بنجاح باسم ${client.user.tag}`);
    addLog('SYSTEM', `البوت اشتغل بنجاح باسم ${client.user.tag}`);
});

client.on('guildMemberAdd', (member) => {
    addLog('JOIN', `عضو جديد انضم: ${member.user.tag}`);
});

client.on('guildBanAdd', (ban) => {
    addLog('BAN', `تم حظر العضو: ${ban.user.tag}`);
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`[WEB] لوحة التحكم تعمل على المنصة عبر البورت ${PORT}`);
});

client.login(process.env.TOKEN);
