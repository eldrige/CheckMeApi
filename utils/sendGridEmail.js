const config = require('../config/config');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(config.SEND_GRID_API_KEY);

const sendEmail = async ({
  recipientEmail,
  title,
  template_data,
  templateId,
}) => {
  const msg = {
    // to: recipientEmail,
    to: recipientEmail,
    from: 'peldrige8@gmail.com', // Change to your verified sender
    subject: title,
    templateId: templateId,
    dynamic_template_data: { ...template_data },
  };

  try {
    const response = await sgMail.send(msg);
    return response;
  } catch (e) {
    console.log(e);
  }
};

module.exports = sendEmail;
