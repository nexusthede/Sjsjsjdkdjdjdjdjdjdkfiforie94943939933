// Import required modules
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
const voiceMaster = require("./voiceMaster");
const welcome = require("./welcome");       // Welcome + test greet module
const moderation = require("./moderation"); // Moderation module (fixed)
const express = require("express");
const config = require("./config");

// ======================
// CLIENT SETUP
// ======================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,       // needed for welcome messages
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
voiceMaster(client);   // Voice Master VC module
welcome(client);       // Welcome + test greet module
moderation(client);    // Moderation module (staff protected)

// ======================
// SAFETY
// ======================
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

// ======================
// LOGIN
// ======================
client.login(config.TOKEN);
