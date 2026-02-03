// --------------------
// DISCORD SETUP
// --------------------
const { Client, GatewayIntentBits, ActivityType } = require("discord.js");
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
  
  // Set the bot's streaming status (Streaming on Twitch)
  client.user.setPresence({
    activities: [
      {
        name: "My prefix is .",  // The message you want to show
        type: ActivityType.Streaming,  // This sets the activity to "streaming"
        url: "https://www.twitch.tv/nexus"  // The Twitch link that shows up
      }
    ],
    status: "online"  // Makes sure the bot is shown as online
  });
});

// --------------------
// MODULES
// --------------------
voiceMaster(client, config);  // Voice Master system

client.login(config.TOKEN);  // Your bot's token from config.js
