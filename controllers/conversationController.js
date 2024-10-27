const catchAsync = require('../utils/catchAsync');
const Chat = require('../models/Conversation');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../utils/s3');
const config = require('../config/config');
const User = require('../models/User'); // Import the User model
const Specialist = require('../models/Specialist'); // Import the Specialist model
const { getAll } = require('./handlerFactory');

exports.getChats = getAll(Chat);

/**
 * @swagger
 * /chat/send-text-message:
 *   post:
 *     summary: Send a text message
 *     description: Sends a text message from one user to another. If a chat does not exist, it creates a new chat.
 *     tags:
 *       - Chats
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: The ID of the user or specialist receiving the message.
 *                 example: "60d21b4667d0d8992e610c85"
 *               text:
 *                 type: string
 *                 description: The text of the message to be sent.
 *                 example: "Hello, how are you?"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     chat:
 *                       type: object
 *                       properties:
 *                         participants:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["60d21b4667d0d8992e610c85", "60d21b4667d0d8992e610c86"]
 *                         messages:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               senderId:
 *                                 type: string
 *                                 example: "60d21b4667d0d8992e610c85"
 *                               receiverId:
 *                                 type: string
 *                                 example: "60d21b4667d0d8992e610c86"
 *                               text:
 *                                 type: string
 *                                 example: "Hello, how are you?"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "An unexpected error occurred."
 */
exports.sendTextMessage = catchAsync(async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, text } = req.body;

    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [senderId, receiverId],
        messages: [],
        unreadCounts: new Map(),
      });
    }

    chat.messages.push({ senderId, receiverId, text });
    // Increment the unread count for the receiver
    chat.unreadCounts.set(
      receiverId.toString(),
      (chat.unreadCounts.get(receiverId.toString()) || 0) + 1
    );
    await chat.save();

    res.status(200).json({
      status: 'success',
      data: {
        chat,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /chat/send-document:
 *   post:
 *     summary: Send a document message
 *     description: Sends a document message from one user to another. If a chat does not exist, it creates a new chat. A document must be provided in the request.
 *     tags:
 *       - Chats
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: The ID of the user receiving the document message.
 *                 example: "60d21b4667d0d8992e610c85"
 *               text:
 *                 type: string
 *                 description: Optional text accompanying the document.
 *                 example: "Please find the attached document."
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The document file to upload.
 *     responses:
 *       200:
 *         description: Document message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     chat:
 *                       type: object
 *                       properties:
 *                         participants:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["60d21b4667d0d8992e610c85", "60d21b4667d0d8992e610c86"]
 *                         messages:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               senderId:
 *                                 type: string
 *                                 example: "60d21b4667d0d8992e610c85"
 *                               receiverId:
 *                                 type: string
 *                                 example: "60d21b4667d0d8992e610c86"
 *                               document:
 *                                 type: string
 *                                 format: uri
 *                                 example: "https://your-bucket.s3.amazonaws.com/1640995200000-document.pdf"
 *                               text:
 *                                 type: string
 *                                 example: "Please find the attached document."
 *       400:
 *         description: Bad request - no document provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Please provide the document to upload."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "An unexpected error occurred."
 */
exports.sendDocumentMessage = catchAsync(async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, text } = req.body;

    if (!req.file) {
      return res
        .status(400)
        .send({ error: 'Please provide the document to upload.' });
    }

    const documentName = `${Date.now()}-${req.file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: config.BUCKET_NAME,
      Key: documentName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3.send(command);

    const getObjectParams = {
      Bucket: config.BUCKET_NAME,
      Key: documentName,
    };

    const getCommand = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });

    let chat = await Chat.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [senderId, receiverId],
        messages: [],
      });
    }

    chat.messages.push({ senderId, receiverId, document: url, text });
    await chat.save();

    res.status(200).json({
      status: 'success',
      data: {
        chat,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /chats:
 *   get:
 *     summary: Retrieve all chats for a user
 *     description: Fetches a list of all chats that the authenticated user is a participant in.
 *     tags:
 *       - Chats
 *     responses:
 *       200:
 *         description: Successfully retrieved all chats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     chats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60d21b4667d0d8992e610c85"
 *                           participants:
 *                             type: array
 *                             items:
 *                               type: string
 *                             example: ["60d21b4667d0d8992e610c85", "60d21b4667d0d8992e610c86"]
 *                           messages:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 senderId:
 *                                   type: string
 *                                   example: "60d21b4667d0d8992e610c85"
 *                                 receiverId:
 *                                   type: string
 *                                   example: "60d21b4667d0d8992e610c86"
 *                                 text:
 *                                   type: string
 *                                   example: "Hello!"
 *                                 document:
 *                                   type: string
 *                                   format: uri
 *                                   example: "https://your-bucket.s3.amazonaws.com/1640995200000-document.pdf"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "An unexpected error occurred."
 */
exports.getAllChats = catchAsync(async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({ participants: userId });

    // Fetch unique participant IDs
    const participantIds = [
      ...new Set(chats.flatMap((chat) => chat.participants)),
    ];

    // Fetch user details
    const usersDetails = await User.find(
      { _id: { $in: participantIds } },
      '_id name avatarURL avatar'
    );
    const specialistsDetails = await Specialist.find(
      { _id: { $in: participantIds } },
      '_id firstName lastName avatar'
    );

    // Create a mapping of participant IDs to their details
    const participantsMap = {};

    usersDetails.forEach((user) => {
      participantsMap[user._id] = {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        type: 'user',
      };
    });

    specialistsDetails.forEach((specialist) => {
      participantsMap[specialist._id] = {
        id: specialist._id,
        name: `${specialist.firstName}  ${specialist.lastName}`,
        avatar: specialist.avatar,
        type: 'specialist',
      };
    });

    // Map chats to include participant details
    const enrichedChats = chats.map((chat) => ({
      ...chat.toObject(),
      participants: chat.participants.map(
        (id) => participantsMap[id] || { name: 'Unknown', avatar: null }
      ), // Include participant details
    }));

    res.status(200).json({
      status: 'success',
      data: {
        chats: enrichedChats,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * @swagger
 * /chats/{chatId}:
 *   get:
 *     summary: Retrieve a chat by ID
 *     description: Fetches a specific chat using its ID.
 *     tags:
 *       - Chats
 *     parameters:
 *       - name: chatId
 *         in: path
 *         required: true
 *         description: The ID of the chat to retrieve.
 *         schema:
 *           type: string
 *           example: "60d21b4667d0d8992e610c85"
 *     responses:
 *       200:
 *         description: Successfully retrieved the chat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     chat:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "60d21b4667d0d8992e610c85"
 *                         participants:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["60d21b4667d0d8992e610c85", "60d21b4667d0d8992e610c86"]
 *                         messages:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               senderId:
 *                                 type: string
 *                                 example: "60d21b4667d0d8992e610c85"
 *                               receiverId:
 *                                 type: string
 *                                 example: "60d21b4667d0d8992e610c86"
 *                               text:
 *                                 type: string
 *                                 example: "Hello!"
 *                               document:
 *                                 type: string
 *                                 format: uri
 *                                 example: "https://your-bucket.s3.amazonaws.com/1640995200000-document.pdf"
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Chat not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "An unexpected error occurred."
 */
exports.getChatById = catchAsync(async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId);
    console.log(chat, 'From the get chat by id function');

    if (!chat) {
      return res.status(404).json({
        message: 'Chat not found',
      });
    }

    // Fetch unique participant IDs
    const participantIds = [...new Set(chat.participants)];

    // Fetch user details
    const usersDetails = await User.find(
      { _id: { $in: participantIds } },
      '_id name avatarURL avatar'
    );
    const specialistsDetails = await Specialist.find(
      { _id: { $in: participantIds } },
      '_id firstName lastName avatar'
    );

    // Create a mapping of participant IDs to their details
    const participantsMap = {};

    usersDetails.forEach((user) => {
      participantsMap[user._id] = {
        id: user._id,
        name: user.name,
        avatar: user.avatar,
        type: 'user',
      };
    });

    specialistsDetails.forEach((specialist) => {
      participantsMap[specialist._id] = {
        id: specialist._id,
        name: `${specialist.firstName} ${specialist.lastName}`,
        avatar: specialist.avatar,
        type: 'specialist',
      };
    });

    console.log(chat.unreadCounts.toObject(), 'Here mf');

    // Enrich the chat with participant details
    const enrichedChat = {
      ...chat.toObject(),
      participants: chat.participants.map(
        (id) => participantsMap[id] || { name: 'Unknown', avatar: null }
      ),
      unreadCounts: chat.unreadCounts,
    };

    res.status(200).json({
      status: 'success',
      data: {
        chat: enrichedChat,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});
