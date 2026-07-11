const { Schema, model } = require('mongoose');

const trapSettingsSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    warningMessageId: {
      type: String,
      default: null,
    },
    warningText: {
      type: String,
      required: true,
    },
    setBy: {
    type: String,
    required: true,
  },
},
  { timestamps: true }
);

module.exports = model('TrapSettings', trapSettingsSchema);