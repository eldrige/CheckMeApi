const mongoose = require('mongoose');
const { Schema } = mongoose;

const fcmTokenSchema = Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the User model (replace 'User' with your actual User model name)
      required: true,
    },
    tokens: [
      {
        type: String,
        required: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const FCMToken = mongoose.model('FCMToken', fcmTokenSchema);

module.exports = FCMToken;
