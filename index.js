const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});
const config = require("./config");

// Import modules
require("./modules/voiceMaster")(client);
require("./modules/welcome")(client);
require("./modules/mod")(client);

// Login
client.login(config.TOKEN);

// Keep bot alive 24/7
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Keep-alive running on port ${PORT}`));
