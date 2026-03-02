const { Schema, model } = require('mongoose');

const birthdaySchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    guildId: {
      type: String,
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    day: {
      type: Number,
      required: true,
      min: 1,
      max: 31,
    },
    lastAnnouncedYear: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

birthdaySchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = model('Birthday', birthdaySchema);