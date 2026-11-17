const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// تهيئة مشغل DisTube القوي والمتعامل مع يوتيوب
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    emitAddSongWhenCreatingPlaylist: false,
    plugins: [new YtDlpPlugin()]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}! Bot is online.`);
});

// أمر !go لإظهار لوحة التحكم
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
            .setDescription('أهلاً بك في لوحة تحكم الموسيقى!\nاضغط على الزر أدناه لإدخال رابط الأغنية وتشغيلها فوراً.')
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

// التعامل مع الأزرار
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
        const queue = distube.getQueue(interaction.guildId);
        if (queue) {
            queue.stop();
            distube.voices.leave(interaction.guildId);
            await interaction.reply({ content: '⏹️ تم إيقاف الموسيقى ومغادرة الروم.', ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ البوت ليس في أي روم صوتي حالياً!', ephemeral: true });
        }
    }
});

// استقبال الرابط من الـ Modal وتشغيله عبر DisTube
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
            await distube.play(voiceChannel, url, {
                textChannel: interaction.channel,
                member: interaction.member
            });

            await interaction.editReply(`✅ جاري تشغيل المقطع بنجاح!`);
        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ حدث خطأ أثناء تشغيل الرابط، تأكد أنه صحيح.');
        }
    }
});

client.login(process.env.TOKEN);
