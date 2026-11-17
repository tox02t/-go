const { Client, GatewayIntentBits, Partials } = require('discord.js');
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// إعدادات البوت مع الصلاحيات والـ Intents الكاملة لقراءة الأعضاء والأحداث
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
app.set('view engine', 'ejs');
// تم تصحيح المسار هنا ليتوافق مع هيكلة الملفات المباشرة على الاستضافة
app.set('views', path.join(__dirname, 'views'));

// الصفحة الرئيسية (لوحة التحكم Dashboard)
app.get('/', (req, res) => {
    res.render('index', {
        botName: client.user ? client.user.username : 'TOX Shield',
        status: client.isReady() ? 'متصل وجاهز (Online)' : 'غير متصل',
        logs: liveLogs
    });
});

// مسار تنفيذ الباند لأي عضو من الموقع
app.post('/dashboard/ban/:userId', async (req, res) => {
    const userId = req.params.userId;
    const guildId = process.env.GUILD_ID; // آيدي السيرفر من متغيرات البيئة
    
    try {
        if (!guildId) {
            return res.status(400).send("خطأ: لم يتم تحديد آيدي السيرفر GUILD_ID في متغيرات البيئة.");
        }
        const guild = await client.guilds.fetch(guildId);
        if (!guild) return res.status(404).send("السيرفر غير موجود.");
        
        await guild.members.ban(userId, { reason: "تم إعطاؤه باند عبر لوحة التحكم Web Dashboard" });
        addLog('BAN', `تم حظر المستخدم ذو الأيدي (${userId}) بنجاح من لوحة التحكم.`);
        res.redirect('/?success=banned');
    } catch (error) {
        console.error(error);
        res.status(500).send("فشل تنفيذ الباند، تأكد من صلاحيات البوت وآيدي العضو.");
    }
});

// أحداث البوت وتوثيقها في اللوقات
client.once('ready', () => {
    console.log(`[BOT] تم تسجيل الدخول بنجاح باسم ${client.user.tag}`);
    addLog('SYSTEM', `البوت اشتغل بنجاح باسم ${client.user.tag}`);
});

// رصد انضمام الأعضاء الجدد
client.on('guildMemberAdd', (member) => {
    addLog('JOIN', `عضو جديد انضم: ${member.user.tag}`);
});

// رصد الحظر
client.on('guildBanAdd', (ban) => {
    addLog('BAN', `تم حظر العضو: ${ban.user.tag}`);
});

// تشغيل البوت والسيرفر معاً
app.listen(PORT, () => {
    console.log(`[WEB] لوحة التحكم تعمل على المنصة عبر البورت ${PORT}`);
});

// تسجيل دخول البوت باستخدام التوكن من متغيرات البيئة
client.login(process.env.TOKEN);
