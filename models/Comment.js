const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const Article = require('./Article');

const commentSchema = Schema(
  {
    // review: {
    //   type: String,
    // },
    // rating: {
    //   type: Number,
    //   required: [true, 'A review must have a rating'],
    //   min: 1,
    //   max: 5,
    // },
    //     Parent refrencing
    content: {
      type: String,
    },
    article: {
      type: Schema.ObjectId,
      ref: 'Article',
      required: [true, 'A like must have an article'],
    },
    user: {
      type: Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

commentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name',
  });
  next();
});

/**
 * In static methods, the this var, points to the method
 * we take adv of the aggregate pipeline, to derive stats as reviews are added
 *
 */
// commentSchema.statics.calcAvgRatings = async function (tourId) {
//   const stats = await this.aggregate([
//     {
//       $match: { tour: tourId },
//     },
//     {
//       $group: {
//         _id: '$tour',
//         nRating: { $sum: 1 },
//         avgRating: { $avg: '$rating' },
//       },
//     },
//   ]);

//   console.log(stats);
//   if (stats.length > 0) {
//     await Tour.findByIdAndUpdate(tourId, {
//       ratingsQuantity: stats[0].nRating,
//       ratingsAverage: stats[0].avgRating,
//     });
//   } else {
//     await Tour.findByIdAndUpdate(tourId, {
//       ratingsQuantity: 0,
//       ratingsAverage: 4.5,
//     });
//   }
// };

/**
 * finByIddelte and finbyidandupdate, dont have access to the document
 * the have access to the current query
 * as such, we bind a new ppty review to the pre query middleware, to get access
 * to the object, and finally calc d avg in the post query middleware
 */

// each combination of tour and user has to be unique (no duplicate reviews)
commentSchema.index(
  { article: 1, user: 1 },
  {
    unique: true,
  }
);

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
