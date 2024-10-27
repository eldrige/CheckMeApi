const config = require('../config/config');
const accountSid = config.TWILIO_ACCOUNT_SID;
const authToken = config.TWILIO_AUTH_TOKEN;
const twilioClient = require('twilio')(accountSid, authToken);

export { twilioClient };
