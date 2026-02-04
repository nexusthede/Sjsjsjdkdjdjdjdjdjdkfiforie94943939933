const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require("discord.js");
const config = require("./config");

const welcome = (client) => {
  // -----------------------
  // Function to create the welcome embed + buttons
  // -----------------------
  const createWelcomeEmbed = (member) => {
    const memberCount = member.guild.memberCount;

    const embed = new EmbedBuilder()
      .setColor(config.EMBED_COLOR) // black embed
      .setTitle(
        `<:invis:1468420454749569176> <:invis:1468420454749569176> **Welcome to ${member.guild.name}** ${member} <:lunas_moon:1468428526683295745>`
      )
      .setDescription(
        `<:invis:1468420454749569176> <#1468429307004190811> <:white_sparkle:1468428534908457155> <#1468409940724158534> <:white_sparkle:1468428534908457155> <#1450023372246351952>\n` +
        `\`-# Members #${memberCount}\``
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp(); // no footer

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Chat Here")
        .setEmoji("<:purple_astro:1468428523755802627>")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.com/channels/1449708401050259457/1466485294927843338"),

      new ButtonBuilder()
        .setLabel("Create VC")
        .setEmoji("<:greenflower:1468428520584777840>")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/xZeCnZEvM6") // VC link
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

      // Send embed with user mention
      await channel.send({
        content: `${member}`, // pings the new member
        embeds: [embed],
        components: [row]
      });
    } catch (err) {
      console.error("Welcome embed error:", err);
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

      // Send embed with user mention
      await message.channel.send({
        content: `${member}`, // pings the user who ran the command
        embeds: [embed],
        components: [row]
      });
    }
  });
};

module.exports = welcome;
