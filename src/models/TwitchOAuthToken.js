const { Schema, model } = require('mongoose');

const twitchOAuthTokenSchema = new Schema(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accessToken: {
      type: String,
      required: true,
      trim: true,
    },
    refreshToken: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = model('TwitchOAuthToken', twitchOAuthTokenSchema);
