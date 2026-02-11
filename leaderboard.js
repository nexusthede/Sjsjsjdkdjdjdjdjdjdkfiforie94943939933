const { EmbedBuilder } = require("discord.js");
const config = require("./config");

let lbData = {
  chat: {},
  voice: {},
  joinTimes: {},
  channels: { chat: null, voice: null },
  msgs: { chat: null, voice: null }
};

const leaderboard = (client) => {

  // ---------------- RESET WEEKLY ----------------
  setInterval(() => {
    lbData.chat = {};
    lbData.voice = {};
    lbData.joinTimes = {};
    console.log("Leaderboard reset.");
  }, 7 * 24 * 60 * 60 * 1000);

  // ---------------- UPDATE BOARDS ----------------
  const updateBoards = async (guild, forceType) => {

    if ((!forceType || forceType === "chat") && lbData.channels.chat) {
      const ch = guild.channels.cache.get(lbData.channels.chat);
      if (ch) {
        const e = generate("chat", guild);

        if (lbData.msgs.chat) {
          const m = await ch.messages.fetch(lbData.msgs.chat).catch(() => null);
          if (m) await m.edit({ embeds: [e] });
          else {
            const sent = await ch.send({ embeds: [e] });
            lbData.msgs.chat = sent.id;
          }
        } else {
          const sent = await ch.send({ embeds: [e] });
          lbData.msgs.chat = sent.id;
        }
      }
    }

    if ((!forceType || forceType === "voice") && lbData.channels.voice) {
      const ch = guild.channels.cache.get(lbData.channels.voice);
      if (ch) {
        const e = generate("voice", guild);

        if (lbData.msgs.voice) {
          const m = await ch.messages.fetch(lbData.msgs.voice).catch(() => null);
          if (m) await m.edit({ embeds: [e] });
          else {
            const sent = await ch.send({ embeds: [e] });
            lbData.msgs.voice = sent.id;
          }
        } else {
          const sent = await ch.send({ embeds: [e] });
          lbData.msgs.voice = sent.id;
        }
      }
    }
  };

  // ---------------- GENERATE ----------------
  const generate = (type, guild) => {
    let data = Object.entries(type === "chat" ? lbData.chat : lbData.voice)
      .filter(([id]) => guild.members.cache.has(id) && !guild.members.cache.get(id).user.bot)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    let desc = "";

    data.forEach(([id, points], i) => {
      const m = guild.members.cache.get(id);
      if (type === "chat") {
        desc += `**${i + 1}.** ${m} — ${points} msgs\n`;
      } else {
        desc += `**${i + 1}.** ${m} — ${(points / 3600).toFixed(1)}h\n`;
      }
    });

    if (!desc) desc = "No data yet.";

    return new EmbedBuilder()
      .setTitle(type === "chat" ? "Chat Leaderboard" : "VC Leaderboard")
      .setDescription(desc)
      .setColor("#202225")
      .setFooter({ text: "Resets weekly • Updates every 10 minutes" });
  };

  // ---------------- CHAT TRACK ----------------
  client.on("messageCreate", msg => {
    if (!msg.guild || msg.author.bot) return;
    lbData.chat[msg.author.id] = (lbData.chat[msg.author.id] || 0) + 1;
  });

  // ---------------- VC TRACK ----------------
  client.on("voiceStateUpdate", (oldState, newState) => {
    const id = newState.id;

    if (!oldState.channelId && newState.channelId) {
      lbData.joinTimes[id] = Date.now();
    }

    if (oldState.channelId && !newState.channelId) {
      const joined = lbData.joinTimes[id];
      if (!joined) return;

      const diff = (Date.now() - joined) / 1000;
      lbData.voice[id] = (lbData.voice[id] || 0) + diff;
      delete lbData.joinTimes[id];
    }
  });

  // ---------------- COMMANDS ----------------
  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot || !message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift()?.toLowerCase();

    if (cmd === "set") {
      const type = args[0];
      const ch = message.mentions.channels.first();
      if (!ch) return message.channel.send("Mention a channel.");

      if (type === "chatlb") {
        lbData.channels.chat = ch.id;
        return message.channel.send("Chat leaderboard channel set.");
      }

      if (type === "vclb") {
        lbData.channels.voice = ch.id;
        return message.channel.send("VC leaderboard channel set.");
      }
    }

    if (cmd === "upload") {
      const type = args[0];

      if (type === "chat") {
        updateBoards(message.guild, "chat");
        return message.channel.send("Chat leaderboard uploaded.");
      }

      if (type === "voice") {
        updateBoards(message.guild, "voice");
        return message.channel.send("VC leaderboard uploaded.");
      }
    }
  });

  // ---------------- AUTO UPDATE ----------------
  setInterval(() => {
    client.guilds.cache.forEach(g => updateBoards(g));
  }, 10 * 60 * 1000);
};

module.exports = leaderboard;
