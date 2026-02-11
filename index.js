const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const express = require("express");
const config = require("./config");
const voiceMaster = require("./voiceMaster");
const leaderboard = require("./leaderboard");

// ======================
// CLIENT SETUP
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// ======================
// UPTIME SERVER
// ======================
const app = express();
app.get("/", (req, res) => res.send("Bot is alive."));
app.listen(process.env.PORT || 3000, () => console.log("Uptime server running."));

// ======================
// READY EVENT
// ======================
client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);

  client.user.setPresence({
    activities: [{ name: "My prefix is .", type: ActivityType.Streaming, url: "https://www.twitch.tv/nexus" }],
    status: "online"
  });
});

// ======================
// LOAD MODULES
// ======================
voiceMaster(client);
leaderboard(client);

// ======================
// SAFETY
// ======================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ======================
// LOGIN
// ======================
client.login(config.TOKEN);
