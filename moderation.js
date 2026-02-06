const { EmbedBuilder } = require("discord.js");
const config = require("./config");

module.exports = (client) => {
  let snipedMessage = null;

  // ======================
  // STAFF ROLES
  // ======================
  const STAFF_ROLES = [
    "1449945270782525502",
    "1466497373776908353",
    "1450022204657111155",
    "1465960511375151288",
    "1468316755847024730",
    "1468316715455614977",
    "1450022713346490440",
    "1468314426489704602",
    "1468314367828295917"
  ];

  const isStaff = (member) =>
    member.roles.cache.some((r) => STAFF_ROLES.includes(r.id));

  const makeEmbed = (msg) =>
    new EmbedBuilder().setColor("#000001").setDescription(msg);

  // ======================
  // SNIPE LISTENER (PUBLIC)
  // ======================
  client.on("messageDelete", (message) => {
    if (!message.guild || message.author?.bot) return;

    snipedMessage = {
      content: message.content || "No content",
      author: message.author,
      channel: message.channel,
      time: Date.now()
    };
  });

  // ======================
  // COMMAND HANDLER
  // ======================
  client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // ======================
    // SNIPE
    // ======================
    if (cmd === "snipe") {
      if (!snipedMessage)
        return message.channel.send({ embeds: [makeEmbed("Nothing to snipe.")] });

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("#000001")
            .setAuthor({
              name: snipedMessage.author.tag,
              iconURL: snipedMessage.author.displayAvatarURL()
            })
            .setDescription(snipedMessage.content)
            .setFooter({ text: `In #${snipedMessage.channel.name}` })
            .setTimestamp(snipedMessage.time)
        ]
      });
    }

    // ======================
    // STAFF CHECK
    // ======================
    if (!isStaff(message.member)) return; // command restricted to staff only

    const target = message.mentions.members.first();
    const split = message.content.split("|");
    const reason = split[1]?.trim() || "No reason provided.";

    // ======================
    // BAN
    // ======================
    if (cmd === "ban") {
      if (!target) return message.channel.send({ embeds: [makeEmbed("Mention a user to ban.")] });

      if (isStaff(target)) return; // silently ignore staff
      if (!target.bannable) return; // cannot ban bot or higher roles
      if (target.id === message.author.id) return; // ignore self

      try {
        await target.ban({ reason });
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} was banned.\nReason: ${reason}`)]
        });
      } catch {
        return message.channel.send({ embeds: [makeEmbed("Failed to ban the user.")] });
      }
    }

    // ======================
    // KICK
    // ======================
    if (cmd === "kick") {
      if (!target) return message.channel.send({ embeds: [makeEmbed("Mention a user to kick.")] });

      if (isStaff(target)) return; // silently ignore staff
      if (!target.kickable) return; // cannot kick bot or higher roles

      try {
        await target.kick(reason);
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} was kicked.\nReason: ${reason}`)]
        });
      } catch {
        return message.channel.send({ embeds: [makeEmbed("Failed to kick the user.")] });
      }
    }

    // ======================
    // MUTE (TIMEOUT)
    // ======================
    if (cmd === "mute") {
      if (!target) return message.channel.send({ embeds: [makeEmbed("Mention a user to mute.")] });
      if (isStaff(target)) return; // silently ignore staff

      const time = args[1];
      if (!time) return message.channel.send({ embeds: [makeEmbed("Provide time in minutes.")] });

      const ms = parseInt(time) * 60 * 1000;
      if (isNaN(ms)) return message.channel.send({ embeds: [makeEmbed("Invalid time format.")] });

      if (target.communicationDisabledUntilTimestamp) return; // already muted

      try {
        await target.timeout(ms, reason);
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} muted for ${time} minutes.\nReason: ${reason}`)]
        });
      } catch {
        return message.channel.send({ embeds: [makeEmbed("Failed to mute the user.")] });
      }
    }

    // ======================
    // UNMUTE
    // ======================
    if (cmd === "unmute") {
      if (!target) return message.channel.send({ embeds: [makeEmbed("Mention a user to unmute.")] });
      if (isStaff(target)) return; // silently ignore staff

      if (!target.communicationDisabledUntilTimestamp) return; // not muted

      try {
        await target.timeout(null);
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} has been unmuted.`)]
        });
      } catch {
        return message.channel.send({ embeds: [makeEmbed("Failed to unmute the user.")] });
      }
    }
  });
};
