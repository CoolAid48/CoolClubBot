const { Schema, model } = require('mongoose');

const banCounterSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    caseNumber: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = model('BanCounter', banCounterSchema);
