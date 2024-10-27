const formidable = require('formidable');
const cloudinary = require('cloudinary').v2;
const config = require('../config/config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const ONE_MEGEGABYTE = 1024 * 1024;

cloudinary.config({
  cloud_name: config.CLOUD_NAME,
  api_key: config.API_KEY,
  api_secret: config.API_SECRET,
});

const uploadOptions = {
  maxFileSize: ONE_MEGEGABYTE * 3,
  filter: function ({ name, originalFilename, mimetype }) {
    return mimetype && mimetype.includes('image');
  },
};

const uploadToCloudinary = catchAsync(async (req, res, next) => {
  const form = formidable(uploadOptions);

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(400).json({
        status: 'error',
        message: `Error occured during file upload: ${err} `,
      });
    }

    console.log(files, 'From upload to cloudinary');

    cloudinary.uploader.upload(
      files.image.filepath,
      { public_id: files.image.originalFilename },
      function (error, result) {
        if (error) {
          console.log(error);
          next(error);
        }
        console.log(result);
        res.status(200).json({
          status: 'success',
          message: 'Image uploaded successfully',
          data: result,
        });
      }
    );
  });

  res.send('Hello world');
});

module.exports = {
  uploadToCloudinary,
};
