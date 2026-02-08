const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const leaderboard = (client) => {
  const lbFile = path.join(__dirname, "lbData.json");
  let lbData = { chat: {}, voice: {} };

  if (fs.existsSync(lbFile)) {
    lbData = JSON.parse(fs.readFileSync(lbFile));
  }

  const saveData = () => fs.writeFileSync(lbFile, JSON.stringify(lbData, null, 2));

  const lbChannelsFile = path.join(__dirname, "lbChannels.json");
  let lbChannels = { chat: null, voice: null };
  let lbMessages = { chat: null, voice: null }; // store sent message IDs

  if (fs.existsSync(lbChannelsFile)) {
    lbChannels = JSON.parse(fs.readFileSync(lbChannelsFile));
  }

  const saveChannels = () => fs.writeFileSync(lbChannelsFile, JSON.stringify(lbChannels, null, 2));

  // --------------------
  // PRE-FILL SERVER MEMBERS
  // --------------------
  client.guilds.cache.forEach(guild => {
    guild.members.cache.forEach(member => {
      if (!member.user.bot) {
        if (!lbData.chat[member.id]) lbData.chat[member.id] = { points: 0 };
        if (!lbData.voice[member.id]) lbData.voice[member.id] = { points: 0 };
      }
    });
  });

  saveData();

  // --------------------
  // CREATE LEADERBOARD EMBED
  // --------------------
  const createLBEmbed = (type, data, guild) => {
    const sorted = Object.entries(data)
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10)
      .filter(d => guild.members.cache.has(d[0]) && !guild.members.cache.get(d[0]).user.bot);

    const description = sorted.map((entry, i) => {
      const member = guild.members.cache.get(entry[0]);
      const hours = Math.floor(entry[1].points / 60);
      const minutes = Math.floor(entry[1].points % 60);
      const timeStr = `${hours}.${minutes}h`;
      return `**${i + 1}.** ${member} — ${timeStr}`;
    }).join("\n");

    return new EmbedBuilder()
      .setTitle(type === "chat" ? "Chat Leaderboard" : "VC Leaderboard")
      .setDescription(description || "No data yet.")
      .setColor("#202225")
      .setFooter({ text: "Updates every 10 minutes" });
  };

  // --------------------
  // COMMAND HANDLER
  // --------------------
  client.on("messageCreate", async (message) => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // --------------------
    // ADMIN ONLY
    // --------------------
    if (!message.member.permissions.has("Administrator")) return;

    // --------------------
    // .set chatlb / .set vclb
    // --------------------
    if (cmd === "set") {
      const sub = args[0]?.toLowerCase();
      const channel = message.mentions.channels.first();
      if (!channel) return message.channel.send("Please mention a channel.");

      if (sub === "chatlb") {
        lbChannels.chat = channel.id;
        saveChannels();
        return message.channel.send(`Chat leaderboard set to ${channel}`);
      } else if (sub === "vclb") {
        lbChannels.voice = channel.id;
        saveChannels();
        return message.channel.send(`VC leaderboard set to ${channel}`);
      } else {
        return message.channel.send("Invalid subcommand. Use chatlb or vclb.");
      }
    }

    // --------------------
    // .upload lb
    // --------------------
    if (cmd === "upload") {
      const sub = args[0]?.toLowerCase();
      const guild = message.guild;

      if (sub === "chat" && lbChannels.chat) {
        const ch = guild.channels.cache.get(lbChannels.chat);
        if (!ch) return message.channel.send("Channel not found.");

        const embed = createLBEmbed("chat", lbData.chat, guild);

        if (lbMessages.chat) {
          const msg = await ch.messages.fetch(lbMessages.chat).catch(() => null);
          if (msg) return msg.edit({ embeds: [embed] }).catch(() => {});
        }

        const sent = await ch.send({ embeds: [embed] }).catch(() => {});
        if (sent) lbMessages.chat = sent.id;
        return;
      }

      if (sub === "voice" && lbChannels.voice) {
        const ch = guild.channels.cache.get(lbChannels.voice);
        if (!ch) return message.channel.send("Channel not found.");

        const embed = createLBEmbed("voice", lbData.voice, guild);

        if (lbMessages.voice) {
          const msg = await ch.messages.fetch(lbMessages.voice).catch(() => null);
          if (msg) return msg.edit({ embeds: [embed] }).catch(() => {});
        }

        const sent = await ch.send({ embeds: [embed] }).catch(() => {});
        if (sent) lbMessages.voice = sent.id;
        return;
      }

      return message.channel.send("Invalid subcommand or channel not set.");
    }
  });

  // --------------------
  // AUTO UPDATE EVERY 10 MINUTES
  // --------------------
  setInterval(async () => {
    client.guilds.cache.forEach(async guild => {
      // Chat LB
      if (lbChannels.chat) {
        const ch = guild.channels.cache.get(lbChannels.chat);
        if (ch) {
          const embed = createLBEmbed("chat", lbData.chat, guild);
          if (lbMessages.chat) {
            const msg = await ch.messages.fetch(lbMessages.chat).catch(() => null);
            if (msg) return msg.edit({ embeds: [embed] }).catch(() => {});
          }
          const sent = await ch.send({ embeds: [embed] }).catch(() => {});
          if (sent) lbMessages.chat = sent.id;
        }
      }

      // VC LB
      if (lbChannels.voice) {
        const ch = guild.channels.cache.get(lbChannels.voice);
        if (ch) {
          const embed = createLBEmbed("voice", lbData.voice, guild);
          if (lbMessages.voice) {
            const msg = await ch.messages.fetch(lbMessages.voice).catch(() => null);
            if (msg) return msg.edit({ embeds: [embed] }).catch(() => {});
          }
          const sent = await ch.send({ embeds: [embed] }).catch(() => {});
          if (sent) lbMessages.voice = sent.id;
        }
      }
    });
  }, 10 * 60 * 1000); // 10 minutes
};

module.exports = leaderboard;
