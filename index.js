const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { token, spotifyClientId, spotifyClientSecret, clientId, guildId } = require('./config.json');
const { DisTube } = require('distube');
const { SpotifyPlugin } = require('@distube/spotify');
const { REST, Routes } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const distube = new DisTube(client, {
    plugins: [new SpotifyPlugin({
        api: {
            clientId: spotifyClientId,
            clientSecret: spotifyClientSecret
        }
    })]
});

client.once('ready', () => {
    console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'play') {
        const query = interaction.options.getString('query');
        if (!query) return interaction.reply('Please provide a song name or URL.');

        distube.play(interaction.member.voice.channel, query, {
            textChannel: interaction.channel,
            member: interaction.member
        });

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Now Playing')
            .setDescription(`Playing: ${query}`)
            .addFields(
                { name: 'Control', value: 'Use the buttons below to control playback' }
            );

        const playButton = new ButtonBuilder()
            .setCustomId('play')
            .setLabel('Play')
            .setStyle(ButtonStyle.Primary);

        const stopButton = new ButtonBuilder()
            .setCustomId('stop')
            .setLabel('Stop')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder()
            .addComponents(playButton, stopButton);

        await interaction.reply({ embeds: [embed], components: [row] });
    } else if (commandName === 'stop') {
        distube.stop(interaction.guild);
        await interaction.reply('Music stopped.');
    } else if (commandName === 'skip') {
        distube.skip(interaction.guild);
        await interaction.reply('Skipped the current song.');
    } else if (commandName === 'pause') {
        distube.pause(interaction.guild);
        await interaction.reply('Paused the music.');
    } else if (commandName === 'resume') {
        distube.resume(interaction.guild);
        await interaction.reply('Resumed the music.');
    } else if (commandName === 'queue') {
        const queue = distube.getQueue(interaction.guild);
        if (!queue) return interaction.reply('There is no queue.');

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('Current Queue')
            .setDescription(queue.songs.map((song, id) => `${id + 1}. ${song.name}`).join('\n'));

        await interaction.reply({ embeds: [embed] });
    } else if (commandName === 'loop') {
        const mode = interaction.options.getInteger('mode');
        distube.setRepeatMode(interaction.guild, mode);
        await interaction.reply(`Set loop mode to ${mode ? (mode === 2 ? 'Queue' : 'Song') : 'Off'}.`);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'play') {
        await interaction.reply('Music is now playing!');
    } else if (interaction.customId === 'stop') {
        distube.stop(interaction.guild);
        await interaction.reply('Music has been stopped.');
    }
});

client.login(token);

// Deploy slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song')
        .addStringOption(option => option.setName('query').setDescription('The song name or URL').setRequired(true)),
    new SlashCommandBuilder().setName('stop').setDescription('Stop the music'),
    new SlashCommandBuilder().setName('skip').setDescription('Skip the current song'),
    new SlashCommandBuilder().setName('pause').setDescription('Pause the music'),
    new SlashCommandBuilder().setName('resume').setDescription('Resume the music'),
    new SlashCommandBuilder().setName('queue').setDescription('Show the current queue'),
    new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set the loop mode')
        .addIntegerOption(option =>
            option.setName('mode')
                .setDescription('0 = Off, 1 = Song, 2 = Queue')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 0 },
                    { name: 'Song', value: 1 },
                    { name: 'Queue', value: 2 }
                )
        ),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
