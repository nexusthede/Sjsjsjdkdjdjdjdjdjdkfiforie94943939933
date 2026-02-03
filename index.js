// --------------------
// KEEP ALIVE
// --------------------
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Keep-alive running on port ${PORT}`));

// --------------------
// DISCORD SETUP
// --------------------
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

const config = require("./config");  // Contains your bot token
const voiceMaster = require("./modules/voiceMaster");

// --------------------
// LOGIN
// --------------------
client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);
});

// --------------------
// MODULES
// --------------------
voiceMaster(client, config);  // Voice Master system

client.login(config.TOKEN);  // Your bot's token from config.js
