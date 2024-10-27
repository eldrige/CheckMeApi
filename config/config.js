const dotenv = require('dotenv');
const path = require('path');
const dirname = path.join(__dirname, '../');

dotenv.config({
  path: path.resolve(dirname, `${process.env.NODE_ENV}.env`),
});

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST: process.env.HOST || 'localhost',
  PORT: process.env.PORT || 8080,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/check-me',
  JWT_SECRET: process.env.JWT_SECRET || 'pride-is-the-devil',
  JWT_EXPIRY_DATE: process.env.JWT_EXPIRY_DATE || '30d',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || 'kendrick7',
  EMAIL_USERNAME: process.env.EMAIL_USERNAME || 'peldrige8@gmail.com',
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  JWT_COOKIE_EXPIRES_IN: process.env.JWT_COOKIE_EXPIRES_IN || '90',
  CLOUD_NAME: process.env.CLOUD_NAME || 'dav5lnlxj',
  API_KEY: process.env.API_KEY || '111717899823352',
  API_SECRET: process.env.API_SECRET || 'R_KXz_fWRQ9f78z7CHKErVV3L0w',
  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ||
    '773507698296-d8j7e9uu8ol9i5hrtrorctcd3emgggjg.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET:
    process.env.GOOGLE_CLIENT_SECRET || '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',
  TWILIO_ACCOUNT_SID:
    process.env.TWILIO_ACCOUNT_SID || 'AC1bdd8cd57aa3c73e85437b1079b6dda8',
  TWILIO_AUTH_TOKEN:
    process.env.TWILIO_AUTH_TOKEN || 'ffc14efc10a9ebee9b1b5c30c8748c5f',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '+13392185772',
  TWILIO_VERIFICATION_SID: process.env.TWILIO_VERIFICATION_SID || '',
  SEND_GRID_API_KEY:
    process.env.SEND_GRID_API_KEY ||
    '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',
  SEND_GRID_VERIFIED_SENDER:
    process.env.SEND_GRID_VERIFIED_SENDER || 'falconinnovation04@gmail.com',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY || 'AKIA4MTWLVSMSYJLC7MK',
  AWS_SECRET_ACCESS_KEY:
    process.env.AWS_SECRET_ACCESS_KEY ||
    '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',
  AWS_REGION: process.env.AWS_REGION || 'eu-north-1',
  BUCKET_NAME: process.env.BUCKET_NAME || 'check-me-profile-pictures',
};
