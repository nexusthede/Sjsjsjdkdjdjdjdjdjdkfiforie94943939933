// index.js

const { Client, GatewayIntentBits, EmbedBuilder, ChannelType } = require("discord.js");
const express = require("express");
const fs = require("fs");
const path = require("path");

// Configuration (hardcoded, can be changed directly here)
const config = {
  TOKEN: 'YOUR_BOT_TOKEN',  // Replace with your bot's token
  PREFIX: '.',              // Command prefix
  GUILD_ID: "1449708401050259457",  // Your server ID
  CATEGORY_ID: "1468344769213235306", // Voice Master category ID
  JOIN_TO_CREATE_ID: "1468360353955053669", // Join-to-create VC ID
  EMBED_COLOR: "#00008B"    // Embed color for messages
};

// Setup Express server for keep-alive
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Keep-alive running on port ${PORT}`));

// Create the bot client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// Load the VoiceMaster functionality (no module system, just include the file)
require('./voiceMaster.js')(client, config); // Pass the client and config to the voiceMaster logic

// --------------------
// LOGIN AND BOT STATUS
// --------------------
client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);

  // Set the bot's streaming status
  client.user.setPresence({
    activities: [
      {
        name: "My prefix is .",  // The message you want to show
        type: 1,  // This sets the activity to "streaming"
        url: "https://www.twitch.tv/nexus"  // The Twitch link that shows up
      }
    ],
    status: "online"  // Makes sure the bot is shown as online
  });
});

// --------------------
// LOGIN TO DISCORD
// --------------------
client.login(config.TOKEN);
