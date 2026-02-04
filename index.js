// Import required modules
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const voiceMaster = require("./voiceMaster");
const express = require("express");

// ======================
// CLIENT SETUP
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// ======================
// UPTIME SERVER
// ======================
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Uptime server running on port ${PORT}`);
});

// ======================
// READY EVENT
// ======================
client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);

  client.user.setPresence({
    activities: [
      {
        name: "My prefix is .",
        type: ActivityType.Streaming,
        url: "https://www.twitch.tv/nexus"
      }
    ],
    status: "online"
  });
});

// ======================
// LOAD MODULES
// ======================
voiceMaster(client);

// ======================
// SAFETY
// ======================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ======================
// LOGIN
// ======================
client.login(process.env.TOKEN);
