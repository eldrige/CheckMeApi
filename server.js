const config = require('./config/config');
const socketIo = require('socket.io');
const http = require('http');
const Chat = require('./models/Conversation');
const app = require('./app');
const connectDB = require('./config/db');
const { SOCKET_EVENTS } = require('./constants');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('./utils/s3');
const {
  REGISTER,
  SEND_TEXT_MESSAGE,
  DISCONNECT,
  READ_MESSAGES,
  TEXT_MESSAGE_RECEIVED,
  DOCUMENT_MESSAGE_RECEIVED,
  USER_STATUS,
  SEND_DOCUMENT_MESSAGE,
  VIDEO_CALL_OFFER,
  VIDEO_CALL_ANSWER,
  ICE_CANDIDATE,
  CALL_ENDED,
} = SOCKET_EVENTS;

connectDB();

const PORT = config.PORT || 2000;
const server = http.createServer(app).listen(PORT, () => {
  console.log(`Server is running in ${config.NODE_ENV} mode on port : ${PORT}`);
});

const io = socketIo(server, {
  cors: {
    origin: '*', // Allow this origin
    methods: ['GET', 'POST'],
    credentials: true, // Allow credentials if needed
  },
});

const onlineUsers = {};

io.on('connection', (socket) => {
  console.log('New socket connected');

  // Handle user registration
  socket.on(REGISTER, (userId) => handleUserRegistration(socket, userId));

  socket.on(
    SEND_TEXT_MESSAGE,
    async (messageData) => await handleTextMessage(messageData)
  );
  socket.on(
    SEND_DOCUMENT_MESSAGE,
    async (documentData) => await handleDocumentMessage(documentData)
  );
  socket.on(DISCONNECT, () => handleDisconnect(socket));

  socket.on(
    READ_MESSAGES,
    async (chatId, userId) => await resetUnreadCount(chatId, userId)
  );

  socket.on(VIDEO_CALL_OFFER, (offerData) =>
    handleVideoCallOffer(socket, offerData)
  );
  socket.on(VIDEO_CALL_ANSWER, (answerData) =>
    handleVideoCallAnswer(socket, answerData)
  );
  socket.on(ICE_CANDIDATE, (iceCandidateData) =>
    handleIceCandidate(socket, iceCandidateData)
  );
  socket.on(CALL_ENDED, (callEndData) => handleCallEnd(socket, callEndData));
});

// Function to handle user registration
function handleUserRegistration(socket, userId) {
  onlineUsers[userId] = socket.id;
  console.log(`User ${userId} is online`);
  socket.broadcast.emit(USER_STATUS, { userId, status: 'online' });
}

// Function to handle text messages
async function handleTextMessage(messageData) {
  console.log('Text message received:', messageData);
  const { senderId, receiverId, text } = messageData;

  try {
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
    chat.unreadCounts.set(
      receiverId.toString(),
      (chat.unreadCounts.get(receiverId.toString()) || 0) + 1
    );
    await chat.save();

    io.emit(TEXT_MESSAGE_RECEIVED, messageData);
  } catch (error) {
    console.error('Error handling text message:', error);
  }
}

// Function to handle document messages
async function handleDocumentMessage(documentData) {
  console.log('Document received:', documentData);
  const { senderId, receiverId, document, text } = documentData;
  const documentName = `${Date.now()}-file`;

  // Ensure document data is passed correctly
  const command = new PutObjectCommand({
    Bucket: config.BUCKET_NAME,
    Key: documentName,
    Body: document.buffer, // Use document.buffer instead of req.file.buffer
    ContentType: document.mimetype, // Use document.mimetype instead of req.file.mimetype
  });

  try {
    await s3.send(command);
  } catch (error) {
    console.error('Error uploading document to S3:', error);
    return; // Exit the function if there's an error
  }

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
      unreadCounts: new Map(),
    });
  }

  chat.unreadCounts.set(
    receiverId.toString(),
    (chat.unreadCounts.get(receiverId.toString()) || 0) + 1
  );
  chat.messages.push({ senderId, receiverId, document: url, text });

  await chat.save();

  io.emit(DOCUMENT_MESSAGE_RECEIVED, documentData);
}

// Function to handle user disconnection
function handleDisconnect(socket) {
  console.log('Socket disconnected');
  for (const userId in onlineUsers) {
    if (onlineUsers[userId] === socket.id) {
      delete onlineUsers[userId];
      console.log(`User ${userId} is offline`);
      socket.broadcast.emit(USER_STATUS, { userId, status: 'offline' });
      break;
    }
  }
}

// Function to reset unread count for a user in a chat
async function resetUnreadCount(chatId, userId) {
  const chat = await Chat.findById(chatId);

  if (chat) {
    chat.unreadCounts.set(userId.toString(), 0); // Reset unread count for the user
    await chat.save();
  }
}

// Handle video call offer
function handleVideoCallOffer(socket, offerData) {
  const { senderId, receiverId, offer } = offerData;
  console.log(`Video call offer from ${senderId} to ${receiverId}`);

  // Check if the receiver is online
  if (onlineUsers[receiverId]) {
    io.to(onlineUsers[receiverId]).emit(VIDEO_CALL_OFFER, { senderId, offer });
  } else {
    // Notify the caller that the receiver is not online
    console.log(`User ${receiverId} is not online`);
    io.to(onlineUsers[senderId]).emit(CALL_ENDED, {
      receiverId,
      message: 'Receiver is not online.',
    });
  }
}

// Handle video call answer
function handleVideoCallAnswer(socket, answerData) {
  const { senderId, receiverId, answer, accepted } = answerData;
  console.log(
    `Video call answer from ${receiverId} to ${senderId} - Accepted: ${accepted}`
  );

  if (accepted) {
    if (onlineUsers[senderId]) {
      io.to(onlineUsers[senderId]).emit(VIDEO_CALL_ANSWER, {
        receiverId,
        answer,
      });
    }
  } else {
    // Notify the caller that the call was declined
    if (onlineUsers[senderId]) {
      io.to(onlineUsers[senderId]).emit(CALL_ENDED, {
        receiverId,
        message: 'Call was declined.',
      });
    }
  }
}

// Handle ICE candidate
function handleIceCandidate(socket, iceCandidateData) {
  const { senderId, receiverId, candidate } = iceCandidateData;
  console.log(`ICE candidate from ${senderId} to ${receiverId}`);

  if (onlineUsers[receiverId]) {
    io.to(onlineUsers[receiverId]).emit(ICE_CANDIDATE, { senderId, candidate });
  }
}

// Handle call end
function handleCallEnd(socket, callEndData) {
  const { senderId, receiverId } = callEndData;
  console.log(`Call ended between ${senderId} and ${receiverId}`);

  if (onlineUsers[senderId]) {
    io.to(onlineUsers[senderId]).emit(CALL_ENDED, { receiverId });
  }
  if (onlineUsers[receiverId]) {
    io.to(onlineUsers[receiverId]).emit(CALL_ENDED, { senderId });
  }
}

process.on('unhandledRejection', (err) => {
  console.error(err.name, err.message);
  console.log('Unhandled rejection, shutting down...');
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error(err.name, err.message);
  console.log('Unhandled exception, shutting down...');
  process.exit(1);
});
