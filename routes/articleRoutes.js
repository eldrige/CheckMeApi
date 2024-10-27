const express = require('express');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();
const {
  createArticle,
  deleteArticle,
  updateArticle,
  getArticle,
  getArticles,
  likeArticle,
  unLikeArticle,
  commentArticle,
  saveArticle,
  replyToComment,
  replyToReply,
} = require('../controllers/articleController');

router.route('/').get(getArticles);
router.route('/:id').get(getArticle);

router.use(protect);

router.route('/').post(createArticle);

router.route('/save/:id').post(saveArticle);
router.route('/comment/:id').patch(commentArticle);
router.route('/like/:id').patch(likeArticle);
router.route('/unlike/:id').patch(unLikeArticle);
router.route('/:articleId/comments/:commentId/replies').patch(replyToComment);
router
  .route('/:articleId/comments/:commentId/replies/:replyId')
  .patch(replyToReply);

router.route('/:id').delete(deleteArticle).patch(updateArticle);

module.exports = router;
