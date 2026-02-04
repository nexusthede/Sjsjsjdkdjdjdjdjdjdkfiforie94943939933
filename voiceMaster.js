const { ChannelType, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const voiceMaster = (client) => {
  // Data path and storage for tracking VC data
  const dataPath = path.join(__dirname, "vcData.json");
  let vcData = { vcOwners: {}, tempVCs: {} };

  // Load existing data if available
  if (fs.existsSync(dataPath)) {
    vcData = JSON.parse(fs.readFileSync(dataPath));
  }

  // Save data to file
  const saveData = () => fs.writeFileSync(dataPath, JSON.stringify(vcData, null, 2));

  // Helper function to generate embeds
  const embedMsg = (desc) => new EmbedBuilder().setColor("#000000").setDescription(desc);  // Black embed color

  // --------------------
  // Voice State Update: Handle Join and Leave events
  // --------------------
  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (newState.guild.id !== oldState.guild.id) return; // Ensure we are handling events for the correct guild
    const userId = newState.id;

    // When the user joins a voice channel (and specifically the "Join to Create" VC)
    if (!oldState.channelId && newState.channelId) {
      if (newState.channelId === "YOUR_JOIN_TO_CREATE_CHANNEL_ID") {
        // Prevent duplication if the user already has a temporary VC
        if (vcData.tempVCs[userId]) return;

        // Create a new temporary VC for the user
        const vc = await newState.guild.channels.create({
          name: `${newState.member.user.username}'s VC`,
          type: ChannelType.GuildVoice,
          parent: "YOUR_CATEGORY_ID",  // Set your category ID here
          userLimit: 10,  // Optional: Set a user limit if needed
        });

        // Store the new VC data
        vcData.tempVCs[userId] = vc.id;
        vcData.vcOwners[vc.id] = userId;
        await newState.member.voice.setChannel(vc).catch(() => {});
        saveData();
      }
    }

    // When the user leaves a voice channel
    if (oldState.channelId && !newState.channelId) {
      // Delete the temporary VC if the user leaves and it's empty
      const tempVCId = vcData.tempVCs[userId];
      if (tempVCId) {
        const vc = oldState.guild.channels.cache.get(tempVCId);
        if (vc && vc.members.size === 0) {
          await vc.delete().catch(() => {});
        }
        delete vcData.tempVCs[userId];
        delete vcData.vcOwners[tempVCId];
      }
      saveData();
    }
  });

  // --------------------
  // Command Handling for VC-related Commands
  // --------------------
  client.on("messageCreate", async (message) => {
    if (!message.guild) return; // Ensure we are in a guild
    if (!message.content.startsWith(".")) return; // Hardcoded prefix (.)

    const args = message.content.slice(1).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const channel = message.member.voice.channel;
    const successEmbed = (desc) => ({ embeds: [embedMsg(desc)] });
    const target = message.mentions.members.first();

    // Handle .vc commands
    if (cmd === "vc") {
      if (!channel) return message.reply(successEmbed("You must be in a voice channel."));
      const sub = args[0]?.toLowerCase();

      switch (sub) {
        case "lock":
          const ownerId = vcData.vcOwners[channel.id] || message.member.id;
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: false });
          await channel.permissionOverwrites.edit(ownerId, { Connect: true });
          return message.reply(successEmbed("VC locked."));

        case "unlock":
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { Connect: true });
          return message.reply(successEmbed("VC unlocked."));

        case "hide":
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: false });
          await channel.permissionOverwrites.edit(message.member.id, { ViewChannel: true });
          return message.reply(successEmbed("VC hidden."));

        case "unhide":
          await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { ViewChannel: true });
          return message.reply(successEmbed("VC unhidden."));

        case "kick":
          if (!target) return message.reply(successEmbed("Mention a user to kick from VC."));
          await target.voice.kick();
          return message.reply(successEmbed(`${target.user.tag} has been kicked from the VC.`));

        case "ban":
          if (!target) return message.reply(successEmbed("Mention a user to ban from VC."));
          await target.voice.setChannel(null);
          return message.reply(successEmbed(`${target.user.tag} has been banned from the VC.`));

        case "permit":
          if (!target) return message.reply(successEmbed("Mention a user to permit to join VC."));
          await channel.permissionOverwrites.edit(target, { Connect: true });
          return message.reply(successEmbed(`${target.user.tag} can now join the VC.`));

        case "rename":
          const newName = args.slice(1).join(" ");
          if (!newName) return message.reply(successEmbed("Provide a new name"));
          await channel.setName(newName);
          return message.reply(successEmbed(`VC renamed to ${newName}`));

        case "transfer":
          if (!target) return message.reply(successEmbed("Mention a user to transfer VC ownership."));
          vcData.vcOwners[channel.id] = target.id;
          await channel.permissionOverwrites.edit(target, { ManageChannels: true });
          return message.reply(successEmbed(`${target.user.tag} is now the owner of this VC.`));

        case "info":
          return message.reply(successEmbed(`VC Name: ${channel.name}\nCategory: ${channel.parent?.name || "None"}\nMembers: ${channel.members.size}\nLimit: ${channel.userLimit || "None"}`));
      }
    }

    // Command to list all available VC commands
    if (cmd === "vc list") {
      const commandListEmbed = new EmbedBuilder()
        .setColor("#000000")  // Black embed color
        .setTitle("Available VC Commands")
        .setDescription(`
          \`.vc lock\` - Lock the VC
          \`.vc unlock\` - Unlock the VC
          \`.vc hide\` - Hide the VC
          \`.vc unhide\` - Unhide the VC
          \`.vc kick @user\` - Kick a user from the VC
          \`.vc ban @user\` - Ban a user from the VC
          \`.vc permit @user\` - Permit a user to join the VC
          \`.vc rename <name>\` - Rename the VC
          \`.vc transfer @user\` - Transfer ownership of the VC
          \`.vc info\` - Show information about the VC
        `);

      return message.reply({ embeds: [commandListEmbed] });
    }
  });
};

module.exports = voiceMaster;
