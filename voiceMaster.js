const { ChannelType, EmbedBuilder } = require("discord.js");
const config = require("../config");
const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "../data/vcData.json");

function loadData() {
  if (!fs.existsSync(dataPath)) return { vcTime: {}, vcOwners: {}, tempVCs: {}, vcJoinTimestamps: {} };
  return JSON.parse(fs.readFileSync(dataPath, "utf-8"));
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = (client) => {
  const data = loadData();
  const { vcTime, vcOwners, tempVCs, vcJoinTimestamps } = data;

  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (!newState.guild || newState.guild.id !== config.GUILD_ID) return;
    const userId = newState.id;

    // JOIN VC
    if (!oldState.channelId && newState.channelId) {
      vcJoinTimestamps[userId] = Date.now();
      const newChannel = newState.channel;

      if (newChannel.id === config.JOIN_TO_CREATE_ID) {
        const vc = await newState.guild.channels.create({
          name: `${newState.member.user.username}'s VC`,
          type: ChannelType.GuildVoice,
          parent: config.CATEGORY_ID
        });
        tempVCs[userId] = vc.id;
        vcOwners[vc.id] = userId;
        await newState.member.voice.setChannel(vc);
        saveData(data);
      }
    }

    // LEAVE VC
    if (oldState.channelId && !newState.channelId) {
      if (vcJoinTimestamps[userId]) {
        const mins = Math.floor((Date.now() - vcJoinTimestamps[userId]) / 60000);
        vcTime[userId] = (vcTime[userId] || 0) + mins;
        delete vcJoinTimestamps[userId];
        saveData(data);
      }

      if (tempVCs[userId]) {
        const vcId = tempVCs[userId];
        const vc = newState.guild.channels.cache.get(vcId);
        if (vc && vc.members.size === 0) {
          await vc.delete().catch(() => null);
          delete tempVCs[userId];
          delete vcOwners[vcId];
          saveData(data);
        }
      }
    }
  });

  // VC Commands
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.guild.id !== config.GUILD_ID) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const channel = message.member.voice.channel;
    const embedMsg = desc => ({ embeds: [new EmbedBuilder().setColor(config.EMBED_COLOR).setDescription(desc)] });

    if (cmd !== "vc") return;

    const sub = args[0]?.toLowerCase();
    const target = message.mentions.members.first();
    const numArg = parseInt(args[1]);

    if (sub === "list") {
      const vcCommands = [
        "`lock` — Lock your VC",
        "`unlock` — Unlock your VC",
        "`hide` — Hide your VC",
        "`unhide` — Unhide your VC",
        "`kick @user` — Kick a user",
        "`ban @user` — Ban a user",
        "`permit @user` — Permit a user",
        "`limit <number>` — Set user limit",
        "`info` — Show VC info",
        "`rename <name>` — Rename VC",
        "`transfer @user` — Transfer ownership",
        "`unmute` — Unmute yourself"
      ];
      return message.reply({
        embeds: [new EmbedBuilder()
          .setColor(config.EMBED_COLOR)
          .setTitle("Voice Master Commands")
          .setDescription(vcCommands.join("\n"))]
      });
    }

    switch (sub) {
      case "lock":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
        await channel.permissionOverwrites.edit(vcOwners[channel.id] || message.member.id, { Connect: true });
        return message.reply(embedMsg("Your VC has been locked"));
      case "unlock":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true });
        return message.reply(embedMsg("Your VC has been unlocked"));
      case "hide":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
        await channel.permissionOverwrites.edit(vcOwners[channel.id] || message.member.id, { ViewChannel: true });
        return message.reply(embedMsg("Your VC has been hidden"));
      case "unhide":
        await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true });
        return message.reply(embedMsg("Your VC has been unhidden"));
      case "kick":
        if (!target || !channel.members.has(target.id)) return message.reply(embedMsg("User not in your VC"));
        await target.voice.disconnect().catch(() => null);
        return message.reply(embedMsg(`Kicked ${target.user.tag}`));
      case "ban":
        if (!target) return message.reply(embedMsg("Mention a user to ban"));
        await channel.permissionOverwrites.edit(target.id, { Connect: false });
        if (channel.members.has(target.id)) await target.voice.disconnect().catch(() => null);
        return message.reply(embedMsg(`Banned ${target.user.tag}`));
      case "permit":
        if (!target) return message.reply(embedMsg("Mention a user to permit"));
        await channel.permissionOverwrites.edit(target.id, { Connect: true });
        return message.reply(embedMsg(`Permitted ${target.user.tag}`));
      case "limit":
        if (isNaN(numArg)) return message.reply(embedMsg("Specify a valid number"));
        await channel.setUserLimit(numArg);
        return message.reply(embedMsg(`User limit set to ${numArg}`));
      case "info":
        return message.reply(embedMsg(`VC Name: ${channel.name}\nCategory: ${channel.parent?.name || "None"}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "None"}`));
      case "rename":
        if (!args[1]) return message.reply(embedMsg("Provide a new name"));
        await channel.setName(args.slice(1).join(" "));
        return message.reply(embedMsg(`VC renamed to ${args.slice(1).join(" ")}`));
      case "transfer":
        if (!target) return message.reply(embedMsg("Mention a user to transfer ownership"));
        vcOwners[channel.id] = target.id;
        saveData(data);
        return message.reply(embedMsg(`Transferred VC ownership to ${target.user.tag}`));
      case "unmute":
        await message.member.voice.setMute(false).catch(() => null);
        return message.reply(embedMsg("You have been unmuted"));
    }
  });
};
