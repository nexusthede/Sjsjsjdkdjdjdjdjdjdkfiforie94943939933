// Import required modules
const { Client, GatewayIntentBits } = require("discord.js");
const voiceMaster = require("./voiceMaster");

// Create a new Discord client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// When the client is ready (online), log a message
client.once("ready", () => {
  console.log(`${client.user.tag} is online!`);

  // Set the bot's presence/status
  client.user.setPresence({
    activities: [
      {
        name: "My prefix is .", // The message you want to show
        type: 1,  // This sets the activity to "streaming"
        url: "https://www.twitch.tv/nexus"  // Optional Twitch URL (not required for this bot)
      }
    ],
    status: "online"  // Status is online
  });
});

// Use the voiceMaster function to handle voice-related logic
voiceMaster(client);

// Login to Discord with the bot's token from environment variables
client.login(process.env.TOKEN);
