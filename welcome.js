const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const config = require("./config"); // adjust path if needed

const welcome = (client) => {
  // -----------------------
  // Function to create the welcome embed + buttons
  // -----------------------
  const createWelcomeEmbed = (member) => {
    const memberCount = member.guild.memberCount;

    const embed = new EmbedBuilder()
      .setColor("#000001") // black embed
      .setTitle(
        `<:invis:1468420454749569176> <:invis:1468420454749569176> **Welcome to ${member.guild.name}** ${member} <:lunas_moon:1468428526683295745>`
      )
      .setDescription(
        `<:invis:1468420454749569176> <#1468429307004190811> <:white_sparkle:1468428534908457155> <#1468409940724158534> <:white_sparkle:1468428534908457155> <#1450023372246351952>\n` +
        `<:invis:1468420454749569176> <:invis:1468420454749569176> <:invis:1468420454749569176> ‎ -# Member #${memberCount}`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Chat Here")
        .setEmoji("<:purple_astro:1468428523755802627>")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.com/channels/1449708401050259457/1466485294927843338"),
      new ButtonBuilder()
        .setCustomId("create_vc")
        .setLabel("Create VC")
        .setEmoji("<:greenflower:1468428520584777840>")
        .setStyle(ButtonStyle.Primary)
    );

    return { embed, row };
  };

  // -----------------------
  // Real welcome for new members
  // -----------------------
  client.on("guildMemberAdd", async (member) => {
    try {
      const channel = member.guild.channels.cache.get(config.WELCOME_CHANNEL_ID);
      if (!channel) return;

      const { embed, row } = createWelcomeEmbed(member);
      await channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error("Welcome embed error:", err);
    }
  });

  // -----------------------
  // Button interaction for Create VC
  // -----------------------
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "create_vc") {
      const joinVC = interaction.guild.channels.cache.get(config.JOIN_TO_CREATE_ID);
      if (!joinVC) return interaction.reply({ content: "Join-to-create VC not found.", ephemeral: true });

      if (interaction.member.voice.channel) {
        return interaction.reply({ content: "You are already in a VC!", ephemeral: true });
      }

      await interaction.member.voice.setChannel(joinVC).catch(() => {});
      await interaction.reply({
        content: `🌸 ${interaction.member} you have been moved to **${joinVC.name}**!`,
        ephemeral: true
      });
    }
  });

  // -----------------------
  // Test greet command
  // -----------------------
  client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "test" && args[0]?.toLowerCase() === "greet") {
      const member = message.member;
      const { embed, row } = createWelcomeEmbed(member);

      await message.channel.send({ embeds: [embed], components: [row] });
    }
  });
};

module.exports = welcome;
