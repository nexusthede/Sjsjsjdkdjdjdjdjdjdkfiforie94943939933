const { EmbedBuilder } = require("discord.js");
const config = require("./config");

module.exports = (client) => {
  let snipedMessage = null;

  // ======================
  // STAFF ROLES (PROTECTED)
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
  // SNIPE
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
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const target = message.mentions.members.first();
    const split = message.content.split("|");
    const reason = split[1]?.trim() || "No reason provided.";

    // ======================
    // SNIPE COMMAND
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
    // MOD COMMANDS: STAFF ONLY
    // ======================
    if (!isStaff(message.member)) return; // Only staff can run these

    // ======================
    // BAN
    // ======================
    if (cmd === "ban") {
      if (!target) return;
      if (target.user.bot) return;       // Cannot ban bots
      if (isStaff(target)) return;       // Cannot ban staff
      if (!target.bannable) return;
      if (target.id === message.author.id) return;

      try {
        await target.ban({ reason });
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} was banned.\nReason: ${reason}`)]
        });
      } catch {
        return;
      }
    }

    // ======================
    // KICK
    // ======================
    if (cmd === "kick") {
      if (!target) return;
      if (target.user.bot) return;       // Cannot kick bots
      if (isStaff(target)) return;       // Cannot kick staff
      if (!target.kickable) return;

      try {
        await target.kick(reason);
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} was kicked.\nReason: ${reason}`)]
        });
      } catch {
        return;
      }
    }

    // ======================
    // MUTE (TIMEOUT)
    // ======================
    if (cmd === "mute") {
      if (!target) return;
      if (target.user.bot) return;       // Cannot mute bots
      if (isStaff(target)) return;       // Cannot mute staff
      if (target.communicationDisabledUntilTimestamp) return;

      const time = args[1];
      if (!time) return;

      const ms = parseInt(time) * 60 * 1000;
      if (isNaN(ms)) return;

      try {
        await target.timeout(ms, reason);
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} muted for ${time} minutes.\nReason: ${reason}`)]
        });
      } catch {
        return;
      }
    }

    // ======================
    // UNMUTE
    // ======================
    if (cmd === "unmute") {
      if (!target) return;
      if (target.user.bot) return;       // Cannot unmute bots
      if (isStaff(target)) return;       // Cannot unmute staff
      if (!target.communicationDisabledUntilTimestamp) return;

      try {
        await target.timeout(null);
        return message.channel.send({
          embeds: [makeEmbed(`${target.user.tag} has been unmuted.`)]
        });
      } catch {
        return;
      }
    }
  });
};
