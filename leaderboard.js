const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

module.exports = (client) => {
  const dataPath = path.join(__dirname, "lbData.json");

  let lbData = {
    chat: {},
    voice: {},
    channels: { chat: null, voice: null },
    messages: { chat: null, voice: null }
  };

  if (fs.existsSync(dataPath)) {
    lbData = JSON.parse(fs.readFileSync(dataPath));
  }

  const saveData = () =>
    fs.writeFileSync(dataPath, JSON.stringify(lbData, null, 2));

  const voiceSessions = new Map();

  // =====================
  // AUTO REGISTER USERS
  // =====================
  client.once("ready", async () => {
    for (const guild of client.guilds.cache.values()) {
      await guild.members.fetch();

      guild.members.cache.forEach(m => {
        if (m.user.bot) return;
        if (!lbData.chat[m.id]) lbData.chat[m.id] = { points: 0 };
        if (!lbData.voice[m.id]) lbData.voice[m.id] = { points: 0 };
      });
    }

    saveData();
    setInterval(updateBoards, 10 * 60 * 1000);
  });

  // =====================
  // CHAT TRACK
  // =====================
  client.on("messageCreate", message => {
    if (!message.guild || message.author.bot) return;

    if (!lbData.chat[message.author.id])
      lbData.chat[message.author.id] = { points: 0 };

    lbData.chat[message.author.id].points += 0.02;
    saveData();
  });

  // =====================
  // VOICE TRACK
  // =====================
  client.on("voiceStateUpdate", (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;

    if (!oldState.channelId && newState.channelId) {
      voiceSessions.set(member.id, Date.now());
    }

    if (oldState.channelId && !newState.channelId) {
      const start = voiceSessions.get(member.id);
      if (!start) return;

      const diff = (Date.now() - start) / 3600000;

      if (!lbData.voice[member.id])
        lbData.voice[member.id] = { points: 0 };

      lbData.voice[member.id].points += diff;
      voiceSessions.delete(member.id);
      saveData();
    }
  });

  // =====================
  // COMMANDS
  // =====================
  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift()?.toLowerCase();

    if (cmd === "set") {
      const type = args[0];
      const ch = message.mentions.channels.first();

      if (!ch) return;

      if (type === "chatlb") lbData.channels.chat = ch.id;
      if (type === "vocelb") lbData.channels.voice = ch.id;

      saveData();
      message.reply("Leaderboard channel set.");
    }

    if (cmd === "upload" && args[0] === "lb") {
      updateBoards();
      message.reply("Leaderboards uploaded.");
    }
  });

  // =====================
  // EMBED GENERATOR
  // =====================
  async function generate(type, guild) {
    await guild.members.fetch();

    guild.members.cache.forEach(m => {
      if (m.user.bot) return;
      if (!lbData.chat[m.id]) lbData.chat[m.id] = { points: 0 };
      if (!lbData.voice[m.id]) lbData.voice[m.id] = { points: 0 };
    });

    const source = type === "chat" ? lbData.chat : lbData.voice;

    const sorted = Object.entries(source)
      .filter(([id]) => guild.members.cache.has(id))
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10);

    let desc = "";

    sorted.forEach(([id, d], i) => {
      desc += `**${i + 1}.** <@${id}> - ${d.points.toFixed(1)}h\n`;
    });

    if (!desc) desc = "No data yet.";

    return new EmbedBuilder()
      .setColor("#202225")
      .setTitle(type === "chat" ? "Chat Leaderboard" : "VC Leaderboard")
      .setDescription(desc)
      .setFooter({ text: "Updates every 10 minutes" });
  }

  // =====================
  // UPDATE BOARDS
  // =====================
  async function updateBoards() {
    for (const guild of client.guilds.cache.values()) {
      if (lbData.channels.chat) {
        const ch = guild.channels.cache.get(lbData.channels.chat);
        if (ch) {
          const e = await generate("chat", guild);

          if (lbData.messages.chat) {
            const m = await ch.messages.fetch(lbData.messages.chat).catch(() => null);
            if (m) await m.edit({ embeds: [e] });
            else {
              const sent = await ch.send({ embeds: [e] });
              lbData.messages.chat = sent.id;
            }
          } else {
            const sent = await ch.send({ embeds: [e] });
            lbData.messages.chat = sent.id;
          }
        }
      }

      if (lbData.channels.voice) {
        const ch = guild.channels.cache.get(lbData.channels.voice);
        if (ch) {
          const e = await generate("voice", guild);

          if (lbData.messages.voice) {
            const m = await ch.messages.fetch(lbData.messages.voice).catch(() => null);
            if (m) await m.edit({ embeds: [e] });
            else {
              const sent = await ch.send({ embeds: [e] });
              lbData.messages.voice = sent.id;
            }
          } else {
            const sent = await ch.send({ embeds: [e] });
            lbData.messages.voice = sent.id;
          }
        }
      }
    }

    saveData();
  }
};
