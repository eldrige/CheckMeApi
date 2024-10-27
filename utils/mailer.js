const config = require('../config/config');

const AWS = require('aws-sdk');

const SES_CONFIG = {
  accessKeyId: config.AWS_ACCESS_KEY_ID,
  secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  region: config.AWS_REGION,
};

const SES = new AWS.SES(SES_CONFIG);

const sendEmail = async () => {
  const params = {
    Destination: {
      ToAddresses: ['peldrige8@gmail.com'],
    },
    Template: 'AppointmentNotification',
    Source: 'peldrige8@gmail.com',
    TemplateData: JSON.stringify({
      name: 'Dr . Prince Eldrige',
      patient_name: 'Kezoh Joyce',
      day: 'Monday',
      time: '10:00 AM',
    }),
  };

  try {
    const response = await SES.sendTemplatedEmail(params).promise();
    console.log(response, 'Email has been sent');
  } catch (error) {
    console.log(error, 'Error sending email');
  }
};

sendEmail();
