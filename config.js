require("dotenv").config();

module.exports = {
  TOKEN: process.env.TOKEN,                   // Bot token
  PREFIX: ".",                                // Command prefix
  GUILD_ID: "1449708401050259457",           // Your server ID
  CATEGORY_ID: "1468344769213235306",        // Voice Master category ID
  JOIN_TO_CREATE_ID: "1468360353955053669",  // Join-to-create VC ID
  EMBED_COLOR: "#202225"                      // Dark embed color for VC & LB
};
