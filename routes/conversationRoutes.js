const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  sendTextMessage,
  getAllChats,
  sendDocumentMessage,
  getChatById,
  getChats,
} = require('../controllers/conversationController');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

const conversationRoutes = express.Router();

conversationRoutes.get('/all-chats', protect, getChats);
conversationRoutes.post('/send-text-message', protect, sendTextMessage);
conversationRoutes.get('/', protect, getAllChats);
conversationRoutes.get('/:chatId', protect, getChatById);

// Upload a document
conversationRoutes.post(
  '/send-document',
  protect,
  upload.single('document'),
  sendDocumentMessage
);

module.exports = conversationRoutes;
