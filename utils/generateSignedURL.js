const { GetObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config/config');
const { s3 } = require('./s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { ONE_HOUR } = require('../constants');

const generateSignedURL = async (name) => {
  try {
    const getObjectParams = {
      Bucket: config.BUCKET_NAME,
      Key: name,
    };

    // get signed url
    const getCommand = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, getCommand, { expiresIn: ONE_HOUR });
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
  }
};

module.exports = generateSignedURL;
