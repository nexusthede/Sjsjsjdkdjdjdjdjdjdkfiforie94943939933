const { EmbedBuilder } = require("discord.js");
const config = require("./config");

module.exports = (client) => {
  let snipedMessage = null;

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

  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const target = message.mentions.members.first();

    // Optional reason
    const reasonIndex = message.content.indexOf("|");
    const reason = reasonIndex > -1 ? message.content.slice(reasonIndex + 1).trim() : null;

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
    // MOD COMMANDS
    // ======================
    if (!isStaff(message.member)) return;

    const commandsRequiringTarget = ["ban", "kick", "mute", "unmute"];

    if (commandsRequiringTarget.includes(cmd)) {
      if (!target && cmd !== "unmute")
        return message.channel.send({ embeds: [makeEmbed("Please mention a user.")] });

      if (["ban", "kick", "mute"].includes(cmd) && isStaff(target)) {
        return message.channel.send({ embeds: [makeEmbed("Cannot moderate this user.")] });
      }
    }

    const buildMessage = (action, user, reasonText) =>
      reasonText ? `${user} ${action}\nReason: ${reasonText}` : `${user} ${action}`;

    const modAction = async (actionFunc, actionName) => {
      try {
        await actionFunc();
        if (actionName.includes("was") || actionName.includes("has"))
          message.channel.send({
            embeds: [makeEmbed(buildMessage(actionName, target.user.tag, reason))]
          });
      } catch {
        message.channel.send({
          embeds: [makeEmbed(`Failed to ${actionName} ${target?.user?.tag || ""}.`)]
        });
      }
    };

    // ======================
    // BAN
    // ======================
    if (cmd === "ban") {
      if (!target.bannable)
        return message.channel.send({ embeds: [makeEmbed(`Failed to ban ${target.user.tag}.`)] });

      modAction(() => target.ban({ reason: reason || undefined }), "was banned");
    }

    // ======================
    // KICK
    // ======================
    if (cmd === "kick") {
      if (!target.kickable)
        return message.channel.send({ embeds: [makeEmbed(`Failed to kick ${target.user.tag}.`)] });

      modAction(() => target.kick(reason || undefined), "was kicked");
    }

    // ======================
    // MUTE
    // ======================
    if (cmd === "mute") {
      if (target.communicationDisabledUntilTimestamp)
        return message.channel.send({ embeds: [makeEmbed(`${target.user.tag} is already muted.`)] });

      const time = parseInt(args[1]);
      if (!time || isNaN(time))
        return message.channel.send({ embeds: [makeEmbed("Please provide a valid time in minutes.")] });

      modAction(
        () => target.timeout(time * 60 * 1000, reason || undefined),
        `was muted for ${time} minutes`
      );
    }

    // ======================
    // UNMUTE
    // ======================
    if (cmd === "unmute") {
      if (!target.communicationDisabledUntilTimestamp)
        return message.channel.send({ embeds: [makeEmbed(`${target.user.tag} is not muted.`)] });

      modAction(() => target.timeout(null), "has been unmuted");
    }
  });
};
