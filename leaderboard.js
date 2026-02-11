const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./config");

const lbFile = path.join(__dirname, "lbData.json");

let lbData = { chat: {}, voice: {}, channels: { chat: null, voice: null }, msgs: { chat: null, voice: null } };

// SAFE LOAD
try {
  if (fs.existsSync(lbFile)) {
    lbData = JSON.parse(fs.readFileSync(lbFile, "utf8"));
  }
} catch (err) {
  console.log("LB load failed, resetting file.");
}

const saveData = () => {
  try {
    fs.writeFileSync(lbFile, JSON.stringify(lbData, null, 2));
  } catch (e) {
    console.log("LB save error:", e.message);
  }
};

const leaderboard = (client) => {

  // ================= UPDATE =================
  const updateBoards = async (guild, forceType) => {
    if (!guild) return;

    // CHAT
    if ((!forceType || forceType === "chat") && lbData.channels.chat) {
      const ch = guild.channels.cache.get(lbData.channels.chat);
      if (!ch) return;

      const e = await generate("chat", guild);

      try {
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
      } catch {}
    }

    // VC
    if ((!forceType || forceType === "voice") && lbData.channels.voice) {
      const ch = guild.channels.cache.get(lbData.channels.voice);
      if (!ch) return;

      const e = await generate("voice", guild);

      try {
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
      } catch {}
    }

    saveData();
  };

  // ================= GENERATE =================
  const generate = async (type, guild) => {
    let data;

    if (type === "chat") {
      data = Object.entries(lbData.chat)
        .filter(([id]) => guild.members.cache.has(id) && !guild.members.cache.get(id).user.bot)
        .sort((a, b) => b[1].points - a[1].points)
        .slice(0, 10);
    } else {
      data = Object.entries(lbData.voice)
        .filter(([id]) => guild.members.cache.has(id) && !guild.members.cache.get(id).user.bot)
        .sort((a, b) => b[1].points - a[1].points)
        .slice(0, 10);
    }

    let desc = "";

    data.forEach(([id, d], i) => {
      const m = guild.members.cache.get(id);
      if (!m) return;

      if (type === "chat") {
        desc += `**${i + 1}.** ${m} — ${d.points} msgs\n`;
      } else {
        desc += `**${i + 1}.** ${m} — ${d.points.toFixed(1)}h\n`;
      }
    });

    if (!desc) desc = "No data yet.";

    return new EmbedBuilder()
      .setTitle(type === "chat" ? "Chat Leaderboard" : "VC Leaderboard")
      .setDescription(desc)
      .setFooter({ text: "Updates every 10 minutes" })
      .setColor("#202225");
  };

  // ================= CHAT TRACK =================
  client.on("messageCreate", message => {
    if (!message.guild || message.author.bot) return;

    if (!lbData.chat[message.author.id]) lbData.chat[message.author.id] = { points: 0 };
    lbData.chat[message.author.id].points++;

    saveData();
  });

  // ================= VC TRACK =================
  const vcJoinTimes = new Map();

  client.on("voiceStateUpdate", (oldState, newState) => {
    if (!newState.member || newState.member.user.bot) return;

    const id = newState.id;

    if (!oldState.channelId && newState.channelId) {
      vcJoinTimes.set(id, Date.now());
    }

    if (oldState.channelId && !newState.channelId) {
      const joined = vcJoinTimes.get(id);
      if (!joined) return;

      const diff = (Date.now() - joined) / 3600000;
      if (!lbData.voice[id]) lbData.voice[id] = { points: 0 };

      lbData.voice[id].points += diff;
      vcJoinTimes.delete(id);
      saveData();
    }
  });

  // ================= COMMANDS =================
  client.on("messageCreate", async message => {
    if (!message.guild || message.author.bot || !message.content.startsWith(config.PREFIX)) return;

    const args = message.content.slice(config.PREFIX.length).trim().split(/ +/);
    const cmd = args.shift()?.toLowerCase();

    if (cmd === "set") {
      const type = args[0]?.toLowerCase();
      const ch = message.mentions.channels.first();
      if (!ch) return message.channel.send("Mention a channel.");

      if (type === "chatlb") {
        lbData.channels.chat = ch.id;
        saveData();
        return message.channel.send("Chat leaderboard channel set.");
      }

      if (type === "vclb") {
        lbData.channels.voice = ch.id;
        saveData();
        return message.channel.send("VC leaderboard channel set.");
      }
    }

    if (cmd === "upload") {
      const type = args[0]?.toLowerCase();

      if (type === "chat") {
        await updateBoards(message.guild, "chat");
        return message.channel.send("Chat leaderboard uploaded.");
      }

      if (type === "voice") {
        await updateBoards(message.guild, "voice");
        return message.channel.send("VC leaderboard uploaded.");
      }
    }
  });

  // ================= AUTO UPDATE =================
  setInterval(() => {
    client.guilds.cache.forEach(g => updateBoards(g));
  }, 10 * 60 * 1000);
};

module.exports = leaderboard;
