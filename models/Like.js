const mongoose = require('mongoose');
const { Schema } = mongoose;

const likeSchema = Schema(
  {
    article: {
      type: Schema.ObjectId,
      ref: 'Article',
    },
    votes: [{ author: { type: Schema.ObjectId, ref: 'User' } }],
  },
  {
    timestamps: true,
  }
);

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;
