// leaderboard.js
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config"); // add GUILD_ID, PREFIX

const lbFile = path.join(__dirname, "lbData.json");
let lbData = { chat: {}, voice: {} };

// Load persistent data if exists
if (fs.existsSync(lbFile)) {
  lbData = JSON.parse(fs.readFileSync(lbFile));
}

// Channels for LB
const channelFile = path.join(__dirname, "lbChannels.json");
let lbChannels = { chat: null, voice: null };
if (fs.existsSync(channelFile)) {
  lbChannels = JSON.parse(fs.readFileSync(channelFile));
}

const saveData = () => fs.writeFileSync(lbFile, JSON.stringify(lbData, null, 2));
const saveChannels = () =>
  fs.writeFileSync(channelFile, JSON.stringify(lbChannels, null, 2));

module.exports = (client) => {

  // ---------------------------
  // Pre-populate members on ready
  // ---------------------------
  client.on("ready", async () => {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;

    await guild.members.fetch(); // fetch all members

    guild.members.cache.forEach(member => {
      if (member.user.bot) return; // skip bots
      if (!lbData.chat[member.id]) lbData.chat[member.id] = { points: 0 };
      if (!lbData.voice[member.id]) lbData.voice[member.id] = { points: 0 };
    });
    saveData();

    // Start auto-update every 10 minutes
    setInterval(() => updateLeaderboards(client), 10 * 60 * 1000);
  });

  // ---------------------------
  // Track chat messages
  // ---------------------------
  client.on("messageCreate", (message) => {
    if (!message.guild || message.author.bot) return;

    // Increment chat points
    if (!lbData.chat[message.author.id]) lbData.chat[message.author.id] = { points: 0 };
    lbData.chat[message.author.id].points += 1;
    saveData();
  });

  // ---------------------------
  // Track VC time
  // ---------------------------
  const vcJoinTimes = {}; // { userId: joinTimestamp }
  client.on("voiceStateUpdate", (oldState, newState) => {
    // Ignore bots
    if (newState.member.user.bot) return;

    // Joined VC
    if (!oldState.channelId && newState.channelId) {
      vcJoinTimes[newState.id] = Date.now();
    }

    // Left VC
    if (oldState.channelId && !newState.channelId) {
      const joinTime = vcJoinTimes[newState.id];
      if (!joinTime) return;

      const duration = Math.floor((Date.now() - joinTime) / 60000); // minutes
      if (!lbData.voice[newState.id]) lbData.voice[newState.id] = { points: 0 };
      lbData.voice[newState.id].points += duration;

      delete vcJoinTimes[newState.id];
      saveData();
    }
  });

  // ---------------------------
  // Commands: .set chatlb / .set vclb / .upload lb
  // ---------------------------
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Admin-only check
    if (!message.member.permissions.has("Administrator")) return;

    // ----------------- Set Channels -----------------
    if (cmd === "set") {
      const sub = args[0]?.toLowerCase();
      const targetChannel = message.mentions.channels.first();
      if (!targetChannel) return message.channel.send("Please mention a channel.");

      if (sub === "chatlb") {
        lbChannels.chat = targetChannel.id;
        saveChannels();
        return message.channel.send(`Chat leaderboard channel set to ${targetChannel}.`);
      }
      if (sub === "vclb") {
        lbChannels.voice = targetChannel.id;
        saveChannels();
        return message.channel.send(`VC leaderboard channel set to ${targetChannel}.`);
      }
    }

    // ----------------- Upload Leaderboards -----------------
    if (cmd === "upload" && args[0]?.toLowerCase() === "lb") {
      updateLeaderboards(client, message.channel);
    }
  });

  // ---------------------------
  // Helper: Update Leaderboards
  // ---------------------------
  async function updateLeaderboards(client, fallbackChannel = null) {
    const guild = client.guilds.cache.get(config.GUILD_ID);
    if (!guild) return;

    await guild.members.fetch(); // refresh members
    const serverIcon = guild.iconURL({ dynamic: true, size: 512 });

    // ---------- Chat LB ----------
    let chatArray = Object.entries(lbData.chat)
      .map(([id, data]) => ({ id, points: data.points }))
      .filter(d => guild.members.cache.has(d.id) && !guild.members.cache.get(d.id).user.bot))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    let chatText = chatArray.map((d, i) => {
      const member = guild.members.cache.get(d.id);
      return `${i + 1}. ${member ? `<@${d.id}>` : "Unknown"} — ${d.points} messages`;
    }).join("\n");

    const chatEmbed = new EmbedBuilder()
      .setTitle("Chat Leaderboard")
      .setDescription(chatText)
      .setThumbnail(serverIcon)
      .setFooter({ text: "Updates every 10 minutes" });

    const chatChannel = lbChannels.chat ? guild.channels.cache.get(lbChannels.chat) : fallbackChannel;
    if (chatChannel) chatChannel.send({ embeds: [chatEmbed] });

    // ---------- VC LB ----------
    let vcArray = Object.entries(lbData.voice)
      .map(([id, data]) => ({ id, points: data.points }))
      .filter(d => guild.members.cache.has(d.id) && !guild.members.cache.get(d.id).user.bot))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    let vcText = vcArray.map((d, i) => {
      const member = guild.members.cache.get(d.id);
      const hoursDecimal = (d.points / 60).toFixed(1);
      return `${i + 1}. ${member ? `<@${d.id}>` : "Unknown"} — ${hoursDecimal}h`;
    }).join("\n");

    const vcEmbed = new EmbedBuilder()
      .setTitle("VC Leaderboard")
      .setDescription(vcText)
      .setThumbnail(serverIcon)
      .setFooter({ text: "Updates every 10 minutes" });

    const vcChannel = lbChannels.voice ? guild.channels.cache.get(lbChannels.voice) : fallbackChannel;
    if (vcChannel) vcChannel.send({ embeds: [vcEmbed] });
  }
};
