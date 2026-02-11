const { EmbedBuilder } = require("discord.js");
const config = require("./config");

const leaderboard = (client) => {

  let chatData = {};
  let voiceData = {};

  const generateEmbed = (type, guild) => {
    const data = type === "chat"
      ? Object.entries(chatData).sort((a,b)=>b[1]-a[1]).slice(0,10)
      : Object.entries(voiceData).sort((a,b)=>b[1]-a[1]).slice(0,10);

    let desc = "";
    data.forEach(([id, points], i) => {
      const member = guild.members.cache.get(id);
      if (!member || member.user.bot) return;
      if (type === "chat") desc += `**${i+1}.** ${member} — ${points} msgs\n`;
      else desc += `**${i+1}.** ${member} — ${points.toFixed(1)}h\n`;
    });

    if (!desc) desc = "No data yet.";

    return new EmbedBuilder()
      .setTitle(type==="chat"?"Chat Leaderboard":"VC Leaderboard")
      .setDescription(desc)
      .setColor(config.EMBED_COLOR)
      .setFooter({ text:"Updates every 10 minutes" });
  };

  const updateBoards = () => {
    client.guilds.cache.forEach(guild => {
      const chatCh = guild.channels.cache.find(ch => ch.name.toLowerCase().includes("chat-lb"));
      const voiceCh = guild.channels.cache.find(ch => ch.name.toLowerCase().includes("vc-lb"));

      if(chatCh) chatCh.send({ embeds:[generateEmbed("chat", guild)] }).catch(()=>{});
      if(voiceCh) voiceCh.send({ embeds:[generateEmbed("voice", guild)] }).catch(()=>{});
    });
  };

  // CHAT TRACKING
  client.on("messageCreate", m => {
    if(!m.guild || m.author.bot) return;
    chatData[m.author.id] = (chatData[m.author.id]||0)+1;
  });

  // VOICE TRACKING
  client.on("voiceStateUpdate", (oldState,newState)=>{
    if(!newState.guild) return;
    if(newState.member.user.bot) return;
    const dur = (!newState.member.voice.selfMute && !newState.member.voice.selfDeaf) ? 0.1 : 0;
    voiceData[newState.id] = (voiceData[newState.id]||0)+dur;
  });

  // AUTO UPDATE EVERY 10 MIN
  setInterval(updateBoards, 10*60*1000);
};

module.exports = leaderboard;
