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

  // --------------------
  // PREFILL USERS
  // --------------------
  client.once("ready", async () => {
    for (const guild of client.guilds.cache.values()) {
      await guild.members.fetch();

      guild.members.cache.forEach(m => {
        if (m.user.bot) return;

        if (!lbData.chat[m.id]) lbData.chat[m.id] = { points: 0 };
        if (!lbData.voice[m.id]) lbData.voice[m.id] = { points: 0, joined: null };
      });
    }

    saveData();
    setInterval(updateBoards, 10 * 60 * 1000);
  });

  // --------------------
  // CHAT TRACK
  // --------------------
  client.on("messageCreate", message => {
    if (!message.guild || message.author.bot) return;

    if (!lbData.chat[message.author.id])
      lbData.chat[message.author.id] = { points: 0 };

    lbData.chat[message.author.id].points += 0.1;
    saveData();
  });

  // --------------------
  // VC TRACK
  // --------------------
  client.on("voiceStateUpdate", (oldState, newState) => {
    const id = newState.id;

    if (!lbData.voice[id])
      lbData.voice[id] = { points: 0, joined: null };

    if (!oldState.channelId && newState.channelId) {
      lbData.voice[id].joined = Date.now();
    }

    if (oldState.channelId && !newState.channelId) {
      if (lbData.voice[id].joined) {
        const diff = Date.now() - lbData.voice[id].joined;
        lbData.voice[id].points += diff / 3600000;
        lbData.voice[id].joined = null;
        saveData();
      }
    }
  });

  // --------------------
  // GENERATE EMBED
  // --------------------
  async function generate(type, guild) {
    const data = Object.entries(lbData[type])
      .filter(([id]) => guild.members.cache.has(id) && !guild.members.cache.get(id).user.bot)
      .sort((a, b) => b[1].points - a[1].points)
      .slice(0, 10);

    let desc = "";

    data.forEach(([id, d], i) => {
      const m = guild.members.cache.get(id);
      desc += `${i + 1}. ${m} - ${d.points.toFixed(1)}h\n`;
    });

    if (!desc) desc = "No data yet.";

    return new EmbedBuilder()
      .setTitle(type === "chat" ? "Chat Leaderboard" : "VC Leaderboard")
      .setDescription(desc)
      .setFooter({ text: "Updates every 10 minutes" })
      .setColor("#202225");
  }

  // --------------------
  // UPDATE BOARDS
  // --------------------
  async function updateBoards(forceType = null) {
    for (const guild of client.guilds.cache.values()) {
      await guild.members.fetch();

      if ((!forceType || forceType === "chat") && lbData.channels.chat) {
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

      if ((!forceType || forceType === "voice") && lbData.channels.voice) {
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

  // --------------------
  // COMMANDS
  // --------------------
  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot) return;
    if (!message.content.startsWith(config.PREFIX)) return;

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
      return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    if (cmd === "set") {
      const type = args.shift();
      const ch = message.mentions.channels.first();

      if (!type || !ch)
        return message.reply("Usage: .set chatlb #channel or .set vclb #channel");

      if (type === "chatlb") lbData.channels.chat = ch.id;
      else if (type === "vclb") lbData.channels.voice = ch.id;
      else return message.reply("Type must be chatlb or vclb");

      saveData();
      return message.reply(`Set ${type} to ${ch}`);
    }

    if (cmd === "upload") {
      const type = args.shift();

      if (!type)
        return message.reply("Usage: .upload chat or .upload voice");

      if (type === "chat") {
        await updateBoards("chat");
        return message.reply("Chat leaderboard updated.");
      }

      if (type === "voice") {
        await updateBoards("voice");
        return message.reply("VC leaderboard updated.");
      }

      return message.reply("Type must be chat or voice");
    }
  });
};
