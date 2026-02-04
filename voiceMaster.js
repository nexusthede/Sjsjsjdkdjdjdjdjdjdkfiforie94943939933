const { ChannelType, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const voiceMaster = (client) => {
  const dataPath = path.join(__dirname, "vcData.json");
  let vcData = { vcOwners: {}, tempVCs: {} };

  if (fs.existsSync(dataPath)) {
    vcData = JSON.parse(fs.readFileSync(dataPath));
  }

  const saveData = () => fs.writeFileSync(dataPath, JSON.stringify(vcData, null, 2));
  const embedMsg = (desc) => new EmbedBuilder().setColor("#000001").setDescription(desc);

  // --------------------
  // VOICE STATE HANDLER
  // --------------------
  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      const userId = newState.id;

      // ===== JOIN-TO-CREATE VC =====
      if (!oldState.channelId && newState.channelId) {
        if (newState.channelId === config.JOIN_TO_CREATE_ID) {
          if (vcData.tempVCs[userId]) return;

          // Check bot permissions
          if (!newState.guild.members.me.permissions.has([
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.MoveMembers
          ])) return;

          const vc = await newState.guild.channels.create({
            name: `${newState.member.displayName.toLowerCase()}'s channel`, // lowercase displayName
            type: ChannelType.GuildVoice,
            parent: config.CATEGORY_ID,
            userLimit: 10,
          });

          vcData.tempVCs[userId] = vc.id;
          vcData.vcOwners[vc.id] = userId;

          await newState.member.voice.setChannel(vc).catch(() => {});
          saveData();
        }
      }

      // ===== SAFE TEMP VC DELETE =====
      if (oldState.channelId && vcData.vcOwners[oldState.channelId]) {
        const tempVCId = oldState.channelId;
        const tempVC = oldState.guild.channels.cache.get(tempVCId);

        if (tempVC && tempVC.members.size === 0) {
          await tempVC.delete().catch(() => {});
          delete vcData.vcOwners[tempVCId];

          for (const uid in vcData.tempVCs) {
            if (vcData.tempVCs[uid] === tempVCId) delete vcData.tempVCs[uid];
          }

          saveData();
        }
      }

    } catch (err) {
      console.error("VoiceMaster error:", err);
    }
  });

  // --------------------
  // MESSAGE COMMAND HANDLER
  // --------------------
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const channel = message.member.voice.channel;
    const target = message.mentions.members.first();
    const successEmbed = (d) => ({ embeds: [embedMsg(d)] });

    // --------------------
    // .list command
    // --------------------
    if (cmd === "list") {
      const listEmbed = new EmbedBuilder()
        .setColor("#000001")
        .setTitle("Available VC Commands")
        .setDescription(`
.vc lock - Lock your VC
.vc unlock - Unlock your VC
.vc hide - Hide your VC
.vc unhide - Unhide your VC
.vc kick @user - Kick a user from your VC
.vc ban @user - Ban a user from your VC
.vc permit @user - Permit a user to join your VC
.vc rename <name> - Rename your VC
.vc transfer @user - Transfer VC ownership
.vc info - Show VC information
        `);

      return message.channel.send({ embeds: [listEmbed] });
    }

    // --------------------
    // VC management commands
    // --------------------
    if (cmd !== "vc") return;
    if (!channel) return message.channel.send(successEmbed("You must be in a VC."));
    if (vcData.vcOwners[channel.id] !== message.member.id) return message.channel.send(successEmbed("You are not the VC owner."));
    if (!channel.manageable) return message.channel.send(successEmbed("I can't manage this VC."));

    const sub = args[0]?.toLowerCase();

    switch (sub) {
      case "lock":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
        return message.channel.send(successEmbed("VC locked."));

      case "unlock":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true });
        return message.channel.send(successEmbed("VC unlocked."));

      case "hide":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
        return message.channel.send(successEmbed("VC hidden."));

      case "unhide":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true });
        return message.channel.send(successEmbed("VC unhidden."));

      case "kick":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        await target.voice.disconnect();
        return message.channel.send(successEmbed(`${target.user.tag} kicked.`));

      case "ban":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        await channel.permissionOverwrites.edit(target, { Connect: false });
        await target.voice.disconnect();
        return message.channel.send(successEmbed(`${target.user.tag} banned from VC.`));

      case "permit":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        await channel.permissionOverwrites.edit(target, { Connect: true });
        return message.channel.send(successEmbed(`${target.user.tag} permitted.`));

      case "rename":
        const newName = args.slice(1).join(" ");
        if (!newName) return message.channel.send(successEmbed("Provide a new name."));
        await channel.setName(newName);
        return message.channel.send(successEmbed(`Renamed to ${newName}`));

      case "transfer":
        if (!target) return message.channel.send(successEmbed("Mention a user."));
        vcData.vcOwners[channel.id] = target.id;
        saveData();
        return message.channel.send(successEmbed(`${target.user.tag} is now the VC owner.`));

      case "info":
        return message.channel.send(successEmbed(
          `Name: ${channel.name}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "None"}`
        ));

      default:
        return message.channel.send(successEmbed("Unknown subcommand. Use `.list` to see commands."));
    }
  });
};

module.exports = voiceMaster;
