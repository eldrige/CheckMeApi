const ONE_MEGEGABYTE = 1024 * 1024
const ONE_HOUR = 3600

const EMAIL_TEMPLATE_IDS = {
  SEND_OTP: "d-3a7a75e76c8d47f793970737da8743e3",
  APPOINTMENT_CONFIRMATION: "d-6c6282261bd743758f95fd8910134511",
  APPOINTMENT_REQUEST: "33bb085e-43d1-49b7-941d-a5b6fcf61191",
  ACCOUNT_APPROVAL: "d-f25176e3b7ab4d268c4537e1fabad922",
  ACCOUNT_REJECTION: "d-168787122efe4adba902b0d602750712",
  RESET_PASSWORD: "d-ee4ed51e592d4ca3b9a35be5c9cec575",
}

const SOCKET_EVENTS = {
  REGISTER: "register",
  SEND_TEXT_MESSAGE: "send-text-message",
  SEND_DOCUMENT_MESSAGE: "send-document-message",
  DISCONNECT: "disconnect",
  READ_MESSAGES: "read-messages",
  TEXT_MESSAGE_RECEIVED: "text-message-received",
  DOCUMENT_MESSAGE_RECEIVED: "document-message-received",
  USER_STATUS: "user-status",
  CHAT_TYPING: "chat-typing",

  // events for video calls
  VIDEO_CALL_OFFER: "video-call-offer",
  VIDEO_CALL_ANSWER: "video-call-answer",
  ICE_CANDIDATE: "ice-candidate",
  CALL_ENDED: "call-ended",
}

module.exports = {
  ONE_MEGEGABYTE,
  EMAIL_TEMPLATE_IDS,
  ONE_HOUR,
  SOCKET_EVENTS,
}
