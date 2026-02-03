const { ChannelType, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = (client, config) => {

  // Data file
  const dataPath = path.join(__dirname, "..", "data", "vcData.json");
  let vcData = { vcTime: {}, vcOwners: {}, tempVCs: {}, vcJoinTimestamps: {} };

  if (fs.existsSync(dataPath)) {
    vcData = JSON.parse(fs.readFileSync(dataPath));
  }

  const saveData = () => fs.writeFileSync(dataPath, JSON.stringify(vcData, null, 2));

  // Embed helper
  const embedMsg = (desc) => new EmbedBuilder().setColor(config.EMBED_COLOR).setDescription(desc);

  // --------------------
  // Voice Tracking
  // --------------------
  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (newState.guild.id !== config.GUILD_ID) return;
    const userId = newState.id;

    // Join VC
    if (!oldState.channelId && newState.channelId) {
      vcData.vcJoinTimestamps[userId] = Date.now();

      // Join-to-create only
      if (newState.channelId === config.JOIN_TO_CREATE_ID) {
        const vc = await newState.guild.channels.create({
          name: `${newState.member.user.username}'s VC`,
          type: ChannelType.GuildVoice,
          parent: config.CATEGORY_ID
        });

        vcData.tempVCs[userId] = vc.id;
        vcData.vcOwners[vc.id] = userId;
        await newState.member.voice.setChannel(vc).catch(() => {});
        saveData();
      }
    }

    // Leave VC
    if (oldState.channelId && !newState.channelId) {
      const joinTime = vcData.vcJoinTimestamps[userId];
      if (joinTime) {
        const mins = Math.floor((Date.now() - joinTime) / 60000);
        vcData.vcTime[userId] = (vcData.vcTime[userId] || 0) + mins;
        delete vcData.vcJoinTimestamps[userId];
      }

      // Delete temp VC
      const tempVCId = vcData.tempVCs[userId];
      if (tempVCId) {
        const vc = newState.guild.channels.cache.get(tempVCId);
        if (vc && vc.members.size === 0) await vc.delete().catch(() => {});
        delete vcData.tempVCs[userId];
        delete vcData.vcOwners[tempVCId];
      }
      saveData();
    }
  });

  // --------------------
  // Commands
  // --------------------
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.guild.id !== config.GUILD_ID) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const channel = message.member.voice.channel;

    const successEmbed = (desc) => ({ embeds: [embedMsg(desc)] });

    if (cmd === "vmsetup") {
      try {
        const hub = await message.guild.channels.create({ name: "Voice Master", type: ChannelType.GuildCategory });
        config.CATEGORY_ID = hub.id;
        await message.guild.channels.create({ name: "Join to Create", type: ChannelType.GuildVoice, parent: hub.id });
        config.JOIN_TO_CREATE_ID = hub.children.cache.find(c => c.name === "Join to Create").id;
        return message.reply(successEmbed("Voice Master setup complete."));
      } catch (e) {
        return message.reply(successEmbed("Failed to setup Voice Master."));
      }
    }

    if (cmd === "vc") {
      if (!channel) return message.reply(successEmbed("You must be in a voice channel."));
      const sub = args[0]?.toLowerCase();
      const target = message.mentions.members.first();
      const numArg = parseInt(args[1]);

      switch (sub) {
        case "lock":
          {
            const everyoneRole = channel.guild.roles.everyone;
            const ownerId = vcData.vcOwners[channel.id] || message.member.id;
            await channel.permissionOverwrites.edit(everyoneRole, { Connect: false }).catch(() => {});
            await channel.permissionOverwrites.edit(ownerId, { Connect: true }).catch(() => {});
            return message.reply(successEmbed("VC locked."));
          }
        case "unlock":
          {
            const everyoneRole = channel.guild.roles.everyone;
            await channel.permissionOverwrites.edit(everyoneRole, { Connect: true }).catch(() => {});
            return message.reply(successEmbed("VC unlocked."));
          }
        case "hide":
          {
            const everyoneRole = channel.guild.roles.everyone;
            const ownerId = vcData.vcOwners[channel.id] || message.member.id;
            await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: false }).catch(() => {});
            await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true }).catch(() => {});
            return message.reply(successEmbed("VC hidden."));
          }
        case "unhide":
          {
            const everyoneRole = channel.guild.roles.everyone;
            await channel.permissionOverwrites.edit(everyoneRole, { ViewChannel: true }).catch(() => {});
            return message.reply(successEmbed("VC unhidden."));
          }
        case "info":
          return message.reply(successEmbed(`VC Name: ${channel.name}\nCategory: ${channel.parent?.name || "None"}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "None"}`));
        case "rename":
          if (!args[1]) return message.reply(successEmbed("Provide a new name"));
          await channel.setName(args.slice(1).join(" "));
          return message.reply(successEmbed(`VC renamed to ${args.slice(1).join(" ")}`));
      }
    }

    if (cmd === "vc list") {
      const vclist = Object.entries(vcData.vcOwners).map(([id, owner]) => `VC: ${message.guild.channels.cache.get(id)?.name || "Deleted"} | Owner: <@${owner}>`).join("\n") || "No active VCs";
      return message.reply(successEmbed(vclist));
    }
  });
};
