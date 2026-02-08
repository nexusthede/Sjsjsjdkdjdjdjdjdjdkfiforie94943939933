const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const dataPath = path.join(__dirname, "lbData.json");

// Initialize lbData if file doesn't exist
let lbData = {
  chat: {},
  voice: {},
  channels: { chat: null, voice: null },
  messages: { chat: null, voice: null }
};

// Load existing data
if (fs.existsSync(dataPath)) {
  lbData = JSON.parse(fs.readFileSync(dataPath));
}

const saveData = () => fs.writeFileSync(dataPath, JSON.stringify(lbData, null, 2));

const leaderboard = (client) => {

  // ----------------------------
  // PRE-FILL USERS ON STARTUP
  // ----------------------------
  client.once("ready", async () => {
    for (const [guildId, guild] of client.guilds.cache) {
      await guild.members.fetch(); // ensure all members are cached

      guild.members.cache.forEach(member => {
        if (member.user.bot) return; // skip bots

        // Pre-fill chat LB if not exist
        if (!lbData.chat[member.id]) lbData.chat[member.id] = { points: 0 };
        // Pre-fill VC LB if not exist
        if (!lbData.voice[member.id]) lbData.voice[member.id] = { points: 0 };
      });
    }
    saveData();
  });

  // ----------------------------
  // GENERATE EMBED
  // ----------------------------
  const generateEmbed = (guild, type) => {
    const data = lbData[type];

    const sorted = Object.entries(data)
      .filter(([id]) => guild.members.cache.has(id)) // only members in server
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10); // top 10

    let description = sorted.map(([id, info], i) => {
      const member = guild.members.cache.get(id);
      if (!member) return null;
      return `**${i + 1}.** ${member} - ${info.points.toFixed(1)}h`;
    }).filter(Boolean).join("\n");

    if (!description) description = "No data yet.";

    const title = type === "chat" ? "Chat Leaderboard" : "VC Leaderboard";

    return new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor("#202225")
      .setFooter({ text: "Updates every 10 minutes" });
  };

  // ----------------------------
  // SEND OR UPDATE EMBED
  // ----------------------------
  const updateLeaderboard = async (guild, type) => {
    const channelId = lbData.channels[type];
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return;

    const embed = generateEmbed(guild, type);

    try {
      if (lbData.messages[type]) {
        const msg = await channel.messages.fetch(lbData.messages[type]).catch(() => null);
        if (msg) return msg.edit({ embeds: [embed] });
      }
      const sent = await channel.send({ embeds: [embed] });
      lbData.messages[type] = sent.id;
      saveData();
    } catch (err) {
      console.error("Leaderboard update error:", err);
    }
  };

  // ----------------------------
  // MESSAGE COMMANDS
  // ----------------------------
  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift()?.toLowerCase();

    // Only admins can use leaderboard commands
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    // ----------------------------
    // .set chatlb #channel
    // ----------------------------
    if (cmd === "set") {
      const sub = args.shift()?.toLowerCase();
      const channel = message.mentions.channels.first();
      if (!channel) return message.reply("Please mention a channel.");

      if (sub === "chatlb") {
        lbData.channels.chat = channel.id;
        saveData();
        return message.reply("Chat leaderboard channel set.");
      } else if (sub === "vocelb") {
        lbData.channels.voice = channel.id;
        saveData();
        return message.reply("VC leaderboard channel set.");
      }
    }

    // ----------------------------
    // .upload lb
    // ----------------------------
    if (cmd === "upload" && args[0]?.toLowerCase() === "lb") {
      if (lbData.channels.chat) await updateLeaderboard(message.guild, "chat");
      if (lbData.channels.voice) await updateLeaderboard(message.guild, "voice");
      return message.reply("Leaderboard uploaded.");
    }
  });

  // ----------------------------
  // AUTO UPDATE EVERY 10 MINUTES
  // ----------------------------
  setInterval(() => {
    client.guilds.cache.forEach(guild => {
      if (lbData.channels.chat) updateLeaderboard(guild, "chat");
      if (lbData.channels.voice) updateLeaderboard(guild, "voice");
    });
  }, 10 * 60 * 1000); // 10 minutes
};

module.exports = leaderboard;
