const mongoose = require('mongoose');
const { Schema } = mongoose;

// Nested schema for replies within comments
const replySchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  replies: [this],
});

const commentSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: [],
    },
  ],
  replies: [replySchema],
});

// Create a model for the comment (optional if comments are only embedded in articles)
const Comment = mongoose.model('Comment', commentSchema);

const articleSchema = Schema(
  {
    title: {
      type: String,
      required: [true, 'Please give your article a title'],
    },
    tags: {
      type: [String],
    },
    photo: String,
    description: {
      type: String,
    },
    video: String,
    content: {
      type: String,
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    author: {
      type: Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    comments: {
      type: [commentSchema],
      default: [],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: [],
      },
    ],
    saveCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

articleSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'author',
    select: 'name email',
  })
    .populate({
      path: 'comments',
      populate: { path: 'user', select: 'name' }, // Populate user in top-level comments
    })
    .populate({
      path: 'comments',
      populate: { path: 'replies', populate: { path: 'user', select: 'name' } }, // Populate users in replies recursively
    });

  next();
});

const Article = mongoose.model('Article', articleSchema);

module.exports = { Article, Comment };
