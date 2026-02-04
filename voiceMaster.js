const { ChannelType, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config"); // Assuming you store your IDs in a config file

const voiceMaster = (client) => {
  const dataPath = path.join(__dirname, "vcData.json");
  let vcData = { vcOwners: {}, tempVCs: {} };

  if (fs.existsSync(dataPath)) {
    vcData = JSON.parse(fs.readFileSync(dataPath));
  }

  const saveData = () =>
    fs.writeFileSync(dataPath, JSON.stringify(vcData, null, 2));

  const embedMsg = (desc) =>
    new EmbedBuilder().setColor(0x2f3136).setDescription(desc);

  // ======================
  // VOICE STATE HANDLER
  // ======================
  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (!oldState.guild || !newState.guild) return;
    const userId = newState.id;

    // ===== JOIN TO CREATE VC =====
    if (!oldState.channelId && newState.channelId) {
      if (newState.channelId === config.joinToCreateVC) {
        if (vcData.tempVCs[userId]) return; // Prevent duplication

        const vc = await newState.guild.channels.create({
          name: `${newState.member.user.username}'s VC`,
          type: ChannelType.GuildVoice,
          parent: config.categoryID,
          userLimit: 10,
        });

        vcData.tempVCs[userId] = vc.id;
        vcData.vcOwners[vc.id] = userId;

        await newState.member.voice.setChannel(vc).catch(() => {});
        saveData();
      }
    }

    // ===== CLEANUP EMPTY TEMP VC =====
    if (oldState.channel) {
      const channel = oldState.channel;

      if (vcData.vcOwners[channel.id] && channel.members.size === 0) {
        await channel.delete().catch(() => {});
        delete vcData.vcOwners[channel.id];

        for (const uid in vcData.tempVCs) {
          if (vcData.tempVCs[uid] === channel.id) delete vcData.tempVCs[uid];
        }

        saveData();
      }
    }
  });

  // ======================
  // VC COMMANDS
  // ======================
  client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (!message.content.startsWith(".")) return;
    if (message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const channel = message.member.voice.channel;
    const target = message.mentions.members.first();
    const successEmbed = (d) => ({ embeds: [embedMsg(d)] });

    if (cmd !== "vc") return;

    if (!channel)
      return message.channel.send(successEmbed("You must be in a VC."));

    if (vcData.vcOwners[channel.id] !== message.member.id)
      return message.channel.send(successEmbed("You are not the VC owner."));

    if (!channel.manageable)
      return message.channel.send(successEmbed("I can't manage this VC."));

    const sub = args[0]?.toLowerCase();

    switch (sub) {
      case "lock":
        await channel.permissionOverwrites.edit(
          channel.guild.roles.everyone,
          { Connect: false }
        );
        return message.channel.send(successEmbed("VC locked."));

      case "unlock":
        await channel.permissionOverwrites.edit(
          channel.guild.roles.everyone,
          { Connect: true }
        );
        return message.channel.send(successEmbed("VC unlocked."));

      case "hide":
        await channel.permissionOverwrites.edit(
          channel.guild.roles.everyone,
          { ViewChannel: false }
        );
        return message.channel.send(successEmbed("VC hidden."));

      case "unhide":
        await channel.permissionOverwrites.edit(
          channel.guild.roles.everyone,
          { ViewChannel: true }
        );
        return message.channel.send(successEmbed("VC unhidden."));

      case "kick":
        if (!target)
          return message.channel.send(successEmbed("Mention a user."));
        await target.voice.disconnect();
        return message.channel.send(
          successEmbed(`${target.user.tag} kicked.`)
        );

      case "ban":
        if (!target)
          return message.channel.send(successEmbed("Mention a user."));
        await channel.permissionOverwrites.edit(target, { Connect: false });
        await target.voice.disconnect();
        return message.channel.send(
          successEmbed(`${target.user.tag} banned from VC.`)
        );

      case "permit":
        if (!target)
          return message.channel.send(successEmbed("Mention a user."));
        await channel.permissionOverwrites.edit(target, { Connect: true });
        return message.channel.send(
          successEmbed(`${target.user.tag} permitted.`)
        );

      case "rename":
        const newName = args.slice(1).join(" ");
        if (!newName)
          return message.channel.send(successEmbed("Provide a name."));
        await channel.setName(newName);
        return message.channel.send(
          successEmbed(`Renamed to ${newName}`)
        );

      case "transfer":
        if (!target)
          return message.channel.send(successEmbed("Mention a user."));
        vcData.vcOwners[channel.id] = target.id;
        saveData();
        return message.channel.send(
          successEmbed(`${target.user.tag} is now owner.`)
        );

      case "list":
        return message.channel.send(
          successEmbed(
            "**VC Commands**\n" +
              ".vc lock\n" +
              ".vc unlock\n" +
              ".vc hide\n" +
              ".vc unhide\n" +
              ".vc kick @user\n" +
              ".vc ban @user\n" +
              ".vc permit @user\n" +
              ".vc rename <name>\n" +
              ".vc transfer @user\n" +
              ".vc info"
          )
        );

      case "info":
        return message.channel.send(
          successEmbed(
            `Name: ${channel.name}\nMembers: ${channel.members.size}\nLimit: ${
              channel.userLimit || "None"
            }`
          )
        );
    }
  });
};

module.exports = voiceMaster;
