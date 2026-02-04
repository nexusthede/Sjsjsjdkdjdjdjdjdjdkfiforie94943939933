require("dotenv").config();

module.exports = {
  TOKEN: process.env.TOKEN,                     // Bot token from .env
  PREFIX: ".",                                  // Command prefix
  GUILD_ID: "1449708401050259457",             // Your server ID
  CATEGORY_ID: "1468344769213235306",          // Voice Master category ID
  JOIN_TO_CREATE_ID: "1468360353955053669",    // Join-to-create VC ID
  WELCOME_CHANNEL_ID: "1466485294927843338",   // Channel where welcome embed is sent
  EMBED_COLOR: "#000001"                        // Black embed color for all embeds
};
