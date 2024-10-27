const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, required: true },
  receiverId: { type: Schema.Types.ObjectId, required: true },
  text: { type: String },
  document: { type: String },
  sentAt: { type: Date, default: Date.now },
});

const chatSchema = new Schema({
  participants: [
    { type: Schema.Types.ObjectId, required: true },
    // { type: Schema.Types.ObjectId, ref: 'Specialist', required: true },
  ],
  messages: [messageSchema],
  unreadCounts: {
    type: Map,
    of: Number, // Key: userId, Value: unread count
  },
});

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;
