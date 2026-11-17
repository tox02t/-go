const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const play = require('play-dl');
const express = require('express'); // إضافة سيرفر الويب لضمان عمل البوت على Render
require('dotenv').config();

// إعداد سيرفر الويب البسيط
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('TOX Music Bot is alive and running 24/7! 🚀');
});

app.listen(PORT, () => {
    console.log(`🌍 Express server is listening on port ${PORT}`);
});

// إعداد بوت ديسكورد
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}! Bot is online.`);
});

// أمر !go لفتح واجهة التحكم (UI)
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'go') {
        const voiceChannel = message.member?.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ يجب أن تكون في روم صوتي (Voice Channel) لفتح لوحة التحكم!');
        }

        const embed = new EmbedBuilder()
            .setTitle('🎶 TOX Music Control Panel')
            .setDescription('أهلاً بك في لوحة تحكم الموسيقى!\nاختر أحد الأزرار بالأسفل لإدارة تشغيل الأغاني أو التحكم في الصوت.')
            .setColor('#5865F2')
            .setFooter({ text: 'Powered by TOX Bot' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('play_link')
                    .setLabel('إضافة رابط 🔗')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('stop_music')
                    .setLabel('إيقاف ومغادرة ⏹️')
                    .setStyle(ButtonStyle.Danger)
            );

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// التفاعل مع الأزرار والواجهة UI
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'play_link') {
        const modal = new ModalBuilder()
            .setCustomId('songModal')
            .setTitle('تشغيل مقطع صوتي');

        const songInput = new TextInputBuilder()
            .setCustomId('songUrlInput')
            .setLabel('ضع رابط يوتيوب أو المقطع هنا:')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(songInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
    }

    if (interaction.customId === 'stop_music') {
        await interaction.reply({ content: '⏹️ تم إيقاف الموسيقى ومغادرة الروم.', ephemeral: true });
    }
});

// التعامل مع إدخال الرابط من نافذة الـ Modal وتشغيل الصوت
client.on('interactionCreate', async interaction => {
    if (!interaction.isModalSubmit()) return;

    if (interaction.customId === 'songModal') {
        const url = interaction.fields.getTextInputValue('songUrlInput');
        const voiceChannel = interaction.member?.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({ content: '❌ يجب أن تكون في روم صوتي حالياً!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            const stream = await play.stream(url);
            const resource = createAudioResource(stream.stream, { inputType: stream.type });
            const player = createAudioPlayer();

            player.play(resource);
            connection.subscribe(player);

            player.on(AudioPlayerStatus.Playing, () => {
                interaction.editReply(`✅ جاري تشغيل الرابط بنجاح!`);
            });

            player.on('error', error => {
                console.error(error);
                interaction.editReply('❌ حدث خطأ أثناء تشغيل الرابط.');
            });

        } catch (error) {
            console.error(error);
            interaction.editReply('❌ تأكد من أن الرابط صحيح أو مدعوم.');
        }
    }
});

client.login(process.env.TOKEN);
