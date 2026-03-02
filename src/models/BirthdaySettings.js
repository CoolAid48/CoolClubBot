const { Schema, model } = require('mongoose');

const birthdaySettingsSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    channelId: {
      type: String,
      default: null,
    },
    roleId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = model('BirthdaySettings', birthdaySettingsSchema);