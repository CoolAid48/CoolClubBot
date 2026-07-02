const { Schema, model } = require('mongoose');

const liveNotificationSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    lastStreamId: {
      type: String,
      default: null,
    },
    lastAnnouncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = model('LiveNotification', liveNotificationSchema);
