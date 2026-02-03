// index.js

// Required Discord.js dependencies
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent
  ]
});

// Import config and voiceMaster.js functions
const config = require("./config");
const { voiceStateUpdate, messageCreate } = require("./voiceMaster");  // Importing from voiceMaster.js

// --------------------
// LOGIN
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
// VOICE STATE AND COMMAND HANDLING
// --------------------

// Voice State Update: Join and Leave VC
client.on("voiceStateUpdate", (oldState, newState) => {
  voiceStateUpdate(client, oldState, newState, config);  // Call the voice state update function
});

// Command Handling (Message Create)
client.on("messageCreate", (message) => {
  messageCreate(client, message, config);  // Call the message create function to handle commands
});

// --------------------
// LOGIN TO DISCORD
// --------------------
client.login(config.TOKEN);  // Your bot's token from config.js
