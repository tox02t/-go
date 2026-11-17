const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates // ضروري جداً عشان البوت يشوف الرومات الصوتية
    ]
});

// ضع آيدي الروم الصوتي هنا و آيدي السيرفر (Guild)
const VOICE_CHANNEL_ID = 'آيدي_الروم_الصوتي_هنا';
const GUILD_ID = 'آيدي_السيرفر_هنا';

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

        if (!channel || !channel.isVoiceBased()) {
            return console.log("الروم الصوتي غير موجود أو أن الآيدي خطأ!");
        }

        // الاتصال بالروم الصوتي والبقاء فيه بشكل دائم
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true, // كتم البوت لنفسه عشان ما ياكل باندوث أو يزعج أحد
            selfMute: false
        });

        console.log(`تم بنجاح دخول البوت وتكييفه في روم: ${channel.name}`);

    } catch (error) {
        console.error("حدث خطأ أثناء محاولة دخول الروم:", error);
    }
});

// حماية البوت من الخروج المفاجئ وإعادة الاتصال لو حصل انقطاع
client.on('voiceStateUpdate', (oldState, newState) => {
    // لو البوت نفسه طلع بالغلط أو انقطع اتصاله، يرجع يدخل تلقائياً
    if (newState.member.id === client.user.id && !newState.channelId) {
        console.log("تم إخراج البوت، جاري إعادة الاتصال...");
        setTimeout(() => {
            joinVoiceChannel({
                channelId: VOICE_CHANNEL_ID,
                guildId: GUILD_ID,
                adapterCreator: newState.guild.voiceAdapterCreator,
                selfDeaf: true
            });
        }, 5000);
    }
});

// تسجيل الدخول بتوكن البوت الخاص بك
client.login('توكن_البوت_هنا');
