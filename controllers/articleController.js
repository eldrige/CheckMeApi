const { Article } = require('../models/Article');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
} = require('./handlerFactory');

const getArticles = getAll(Article);
// const getArticle = getOne(Article);
const deleteArticle = deleteOne(Article);
const updateArticle = updateOne(Article);
const createArticle = createOne(Article);

const getArticle = catchAsync(async (req, res, next) => {
  const articleId = req.params.id;

  try {
    // Find the article by ID and increment the views by 1
    const article = await Article.findByIdAndUpdate(
      articleId,
      { $inc: { views: 1 } }, // Increment the 'views' field
      { new: true } // Return the updated document
    )
      .populate('author', 'name email') // Populate author data
      .populate('comments.user', 'name') // Populate comment authors
      .populate('comments.replies.user', 'name'); // Populate reply authors

    // If the article does not exist
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.status(200).json({
      data: {
        article,
      },
    });
  } catch (err) {
    return next(err); // Pass the error to the error handler middleware
  }
});

// Get an article and like/ dislike it
const voteArticle = catchAsync(async (req, res, next) => {
  const articleId = req.params.id;
  const userId = req.user._id;

  try {
    let message;
    const article = await Article.findById(articleId);

    if (!article) {
      return next(new AppError('Article not found', 404));
    }
    const userVote = article.likes.find(
      (like) => like.author.toString() === userId.toString()
    );

    if (userVote) {
      await Article.updateOne(
        { id: articleId },
        {
          $pull: { likes: { author: userId } },
        }
      );
      message = 'Article unliked';
    } else {
      await Article.updateOne(
        { id: articleId },
        {
          $push: { likes: { author: userId } },
        }
      );
      message = 'Article liked';
    }

    const updatedArticle = await Article.findById(articleId);

    res.status(200).json({
      status: 'success',
      data: {
        message,
        updatedArticle,
      },
    });
  } catch (error) {
    return next(error);
  }
});

const likeArticle = catchAsync(async (req, res, next) => {
  const articleId = req.params.id;
  const userId = req.user._id;

  const article = await Article.findById(articleId);

  console.log(articleId, 'From like route');

  if (!article) {
    return next(new AppError('Article not found', 404));
  }

  // Check if user has already liked the article
  const hasLiked = article.likes.includes(userId);

  if (hasLiked) {
    return next(new AppError('User has already liked the article', 400));
  }

  article.likes.push(userId);
  const updatedArticle = await article.save();

  res.status(200).json({
    status: 'success',
    message: 'Article liked',
    updatedArticle,
  });
});

// unLike an article
const unLikeArticle = catchAsync(async (req, res, next) => {
  const articleId = req.params.id;
  const userId = req.user._id;

  try {
    const article = await Article.findById(articleId);

    if (!article) {
      return next(new AppError('Article not found', 404));
    }

    // Check if user has already liked the article
    const hasLiked = article.likes.includes(userId);

    if (!hasLiked) {
      return next(new AppError('User has not liked the article', 400));
    }

    article.likes = article.likes.filter(
      (likeId) => likeId.toString() !== userId.toString()
    );
    const updatedArticle = await article.save();

    res.status(200).json({
      status: 'success',
      message: 'Article unliked succesfully',
      updatedArticle,
    });
  } catch (err) {
    return next(error);
  }
});

// Comment an article
const commentArticle = catchAsync(async (req, res, next) => {
  const articleId = req.params.id;
  const userId = req.user._id;

  try {
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const comment = {
      user: userId,
      text,
    };

    article.comments.push(comment);
    await article.save();

    res.status(200).json({ message: 'Comment added successfully', comment });
  } catch (err) {
    return next(err);
  }
});

// Save an article
const saveArticle = catchAsync(async (req, res, next) => {
  const articleId = req.params.id;
  const userId = req.user._id;

  try {
    const article = await Article.findById(articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.savedArticles.includes(articleId)) {
      return res.status(400).json({ message: 'Article is already saved' });
    }

    user.savedArticles.push(articleId);

    article.saveCount += 1; // Increment the saveCount
    await Promise.all([user.save(), article.save()]);

    res.status(200).json({ message: 'Article saved' });
  } catch (err) {
    return next(error);
  }
});

/**
 * @swagger
 * /articles/{articleId}/comments/{commentId}/replies:
 *   patch:
 *     summary: Reply to a reply on a comment on an article
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         description: ID of the article
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         description: ID of the comment to reply to
 *         schema:
 *           type: string
 *       - in: path
 *         name: replyId
 *         required: true
 *         description: ID of the reply to reply to
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: The reply text
 *                 example: "This is my reply."
 *     responses:
 *       200:
 *         description: Reply added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reply added successfully"
 *                 comment:
 *                   type: object
 *                   description: The updated comment with the reply
 *       400:
 *         description: Reply text is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reply text is required"
 *       404:
 *         description: Article or comment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Article not found"
 */

const findArticleAndComment = async (articleId, commentId) => {
  const article = await Article.findById(articleId);
  if (!article) {
    throw new AppError('Article not found', 404);
  }

  const comment = article.comments.id(commentId);
  if (!comment) {
    throw new AppError('Comment not found', 404);
  }

  return { article, comment };
};

const replyToComment = catchAsync(async (req, res, next) => {
  const { articleId, commentId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text) {
    return res.status(400).json({ message: 'Reply text is required' });
  }

  try {
    const { article, comment } = await findArticleAndComment(
      articleId,
      commentId
    );

    comment.replies.push({ user: userId, text, createdAt: new Date() });
    await article.save();

    res.status(200).json({
      message: 'Reply added successfully',
      comment,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /articles/{articleId}/comments/{commentId}/replies/{replyId}:
 *   patch:
 *     summary: Reply to a comment on an article
 *     tags:
 *       - Articles
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         description: ID of the article
 *         schema:
 *           type: string
 *       - in: path
 *         name: commentId
 *         required: true
 *         description: ID of the comment to reply to
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *                 description: The reply text
 *                 example: "This is my reply."
 *     responses:
 *       200:
 *         description: Reply added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reply added successfully"
 *                 comment:
 *                   type: object
 *                   description: The updated comment with the reply
 *       400:
 *         description: Reply text is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Reply text is required"
 *       404:
 *         description: Article or comment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Article not found"
 */
const replyToReply = catchAsync(async (req, res, next) => {
  const { articleId, commentId, replyId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  if (!text) {
    return res.status(400).json({ message: 'Reply text is required' });
  }

  try {
    const { article, comment } = await findArticleAndComment(
      articleId,
      commentId
    );

    const reply = comment.replies.id(replyId);
    console.log(reply, 'Twenty one minutes');
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    reply.replies.push({ user: userId, text, createdAt: new Date() });
    await article.save();

    res.status(200).json({
      message: 'Reply added successfully',
      reply,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = {
  createArticle,
  deleteArticle,
  updateArticle,
  getArticle,
  getArticles,
  voteArticle,
  likeArticle,
  unLikeArticle,
  commentArticle,
  saveArticle,
  replyToComment,
  replyToReply,
};
