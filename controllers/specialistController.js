const GoogleStrategy = require('passport-google-oauth2').Strategy;
const config = require('../config/config');
const crypto = require('crypto');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const generateToken = require('../utils/generateToken');
const AppError = require('../utils/appError');
const sendMail = require('../utils/sendEmail');
const Specialist = require('../models/Specialist');
const { getAll, getOne } = require('./handlerFactory');
const sendEmail = require('../utils/sendGridEmail');
const { EMAIL_TEMPLATE_IDS } = require('../constants');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../utils/s3');
const sharp = require('sharp');
const { ONE_HOUR } = require('../constants');
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');
const Schedule = require('../models/Schedule');
const DEFAULT_SCHEDULE = require('../data/schedule');

const generateRandomImageName = (bytes = 10) =>
  crypto.randomBytes(bytes).toString('hex');

const twilioClient = require('twilio')(
  config.TWILIO_ACCOUNT_SID,
  config.TWILIO_AUTH_TOKEN
);

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const CALLBACK_URL = 'http://localhost:8080/auth/google/callback';

const createSendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);

  // cookies, make it such that the token, is always automatically sent back to the server

  const cookieOptions = {
    expires: new Date(
      Date.now() + config.JWT_COOKIE_EXPIRES_IN * TWENTY_FOUR_HOURS
    ),
    httpOnly: true, // to prevent against xss
  };

  if (config.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      specialist: user,
    },
  });
};

/**
 * @swagger
 *
 * /api/v1/specialists/signup:
 *   post:
 *     tags: [Specialist-Authentication]
 *     summary: Sign up a new Specialist
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/definitions/SignUpRequest'
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/SignUpResponse'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *
 * definitions:
 *   SignUpRequest:
 *     type: object
 *     required:
 *       - password
 *       - email
 *       - telephone
 *       - firstName
 *       - lastName
 *     properties:
 *       password:
 *         type: string
 *       email:
 *         type: string
 *         format: email
 *       telephone:
 *         type: string
 *       firstName:
 *         type: string
 *       lastName:
 *         type: string
 *
 *   SignUpResponse:
 *     type: object
 *     properties:
 *       status:
 *         type: string
 *         example: success
 *       message:
 *         type: string
 *         example: OTP sent to example@email.com
 *       specialist:
 *         $ref: '#/definitions/Specialist'
 *
 *   Specialist:
 *     type: object
 *     properties:
 *       id:
 *         type: string
 *       email:
 *         type: string
 *         format: email
 *       telephone:
 *         type: string
 *       firstName:
 *         type: string
 *       lastName:
 *         type: string
 *       active:
 *         type: boolean
 *
 *   Error:
 *     type: object
 *     properties:
 *       status:
 *         type: string
 *         example: error
 *       message:
 *         type: string
 */
const signUp = catchAsync(async (req, res, next) => {
  const { password, email, telephone, firstName, lastName } = req.body;

  if (!telephone || !email || !password || !firstName || !lastName) {
    return next(
      new AppError('Please provide a valid phone number and a username', 400)
    );
  }

  const newSpecialist = await Specialist.create({
    ...req.body,
    active: false,
    status: 'pending',
  });
  const otp = await newSpecialist.createOTP();
  await newSpecialist.save({ validateBeforeSave: false });

  await Schedule.create({
    ...DEFAULT_SCHEDULE,
    doctor: newSpecialist._id,
  });

  const response = await sendEmail({
    recipientEmail: email,
    title: 'OTP verification',
    templateId: EMAIL_TEMPLATE_IDS.SEND_OTP,
    template_data: {
      username: `${firstName} ${lastName}`,
      otp,
    },
  });

  if (!response || response[0]?.statusCode !== 202) {
    return next(
      new AppError('Something went wrong while sending the email', 500)
    );
  }

  res
    .json({
      status: 'success',
      message: `OTP sent to ${email}`,
      specialist: newSpecialist,
    })
    .status(201);
});

const confirmAccountViaOtp = catchAsync(async (req, res, next) => {
  const recipientPhoneNumber = req.body.phoneNumber;
  const smsCode = req.body.smsCode;

  if (!recipientPhoneNumber || !smsCode) {
    return next(
      new AppError('Please provide a valid phone number and sms code', 400)
    );
  }

  const specialist = await Specialist.findOne({
    telephone: recipientPhoneNumber,
  });

  if (!specialist) {
    return next(new AppError('Specialist not found', 404));
  }

  const verificationCheck = await twilioClient.verify.v2
    .services(config.TWILIO_VERIFICATION_SID)
    .verificationChecks.create({
      to: recipientPhoneNumber,
      code: smsCode,
    });

  if (verificationCheck.status === 'approved') {
    specialist.active = true;
    await specialist.save();
    createSendToken(specialist, 200, res);
  } else {
    res.status(400).json({
      status: 'fail',
      message: `OTP verification failed for ${recipientPhoneNumber}`,
    });
  }
});

/**
 * @swagger
 * /api/v1/specialists/confirm-account:
 *   post:
 *     tags: [Specialist-Authentication]
 *     summary: Confirm account creation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmAccountRequest'
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfirmAccountResponse'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * components:
 *   schemas:
 *     ConfirmAccountRequest:
 *       type: object
 *       required:
 *         - otp
 *       properties:
 *         otp:
 *           type: string
 *           description: One-Time Password
 *     ConfirmAccountResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT token
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 */
const confirmAccountCreation = catchAsync(async (req, res, next) => {
  if (!req.body.otp) return next(new AppError('Please provide an OTP', 400));

  const specialist = await Specialist.findOne({
    otp: req.body.otp,
    otpExpires: { $gt: Date.now() },
  });

  if (!specialist)
    return next(new AppError('Token is invalid or has expired', 400));

  specialist.otp = null;
  specialist.otpExpires = null;
  specialist.active = true;
  await specialist.save();

  createSendToken(specialist, 200, res);
});

/**
 * @swagger
 *
 * /api/v1/specialists/login:
 *   post:
 *     tags: [Specialist-Authentication]
 *     summary: Log a user via email and password
 *     produces:
 *       - application/json
 *     description: Login a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '404':
 *         description: User not found or not confirmed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *         password:
 *           type: string
 *     UserResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         telephone:
 *           type: string
 *         active:
 *           type: boolean
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         statusCode:
 *           type: integer
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError('Please provide a valid email and password', 400));

  const specialist = await Specialist.findOne({ email }).select('+password');
  if (specialist && (await specialist.checkPassword(password))) {
    return createSendToken(specialist, 200, res);
  }
  return next(new AppError('Incorrect email or password', 400));
});

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email });
  if (!user)
    return next(new AppError('There is no user, with that email', 404));

  // send reset link thru users emailb

  // Gen random reset token
  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // turn of validation before saving

  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Click here to request for a new password, and confirm this password to ${resetUrl}
  \nIf you didnt forget your password, just ignore this message
  `;

  try {
    await sendMail({
      email: user.email,
      subject: 'Your password reset token',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: `Token sent to ${email}`,
    });
  } catch (e) {
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save({ validateBeforeSave: false });
    return next(new AppError('There was an error sending the email', 500));
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  // rehash psw for comparsim, with whats in the db

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // check if there is a user belonging to the token
  // and also if his token is still valid
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Token is invalid or has expired', 400));

  // update users password and save
  user.password = req.body.password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  createSendToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');
  const { oldPassword, newPassword } = req.body;
  console.log(req.body, 'From request body');
  let doesPasswordMatch = await user.checkPassword(oldPassword);
  console.log(doesPasswordMatch, 'From update password');
  if (!doesPasswordMatch)
    return next(new AppError('Your password is incorrect', 400));
  user.password = newPassword;
  await user.save();
  createSendToken(user, 200, res);

  // we dont user finbyidandupdate bcos of our validators
});

/**
 * @swagger
 * /api/v1/specialists/update-me:
 *   patch:
 *     tags: [Specialists]
 *     summary: Update Specialist Profile
 *     description: This endpoint allows a specialist to update their profile information.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSpecialistProfile'
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SpecialistProfile'
 *       '400':
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *   schemas:
 *     UpdateSpecialistProfile:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         gender:
 *           type: string
 *         qualification:
 *           type: string
 *         licenceNumber:
 *           type: string
 *         licenceNumberObtentionDate:
 *           type: string
 *           format: date
 *         speciality:
 *           type: string
 *         workTitle:
 *            type: string
 *         isStillEmployed:
 *            type: boolean
 *         telephone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *         active:
 *           type: boolean
 *         degreeObtentionDate:
 *           type: string
 *           format: date
 *         location:
 *           type: string
 *         bio:
 *           type: string
 *         avatar:
 *           type: string
 *         birthDate:
 *           type: string
 *           format: date
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         yearsOfExperience:
 *           type: number
 *         maritalStatus:
 *           type: string
 *         previousUniversity:
 *           type: string
 *         lengthOfMedicalTraining:
 *           type: number
 *         role:
 *           type: string
 *         startedWorkingDate:
 *           type: string
 *           format: date
 *         currentWorkPlace:
 *           type: string
 *         roleDescription:
 *           type: string
 *         secondaryEmail:
 *           type: string
 *           format: email
 *         secondaryPhone:
 *           type: string
 *         accountVisibility:
 *           type: string
 *     SpecialistProfile:
 *       type: object
 *       properties:
 *         # ... (same as UpdateSpecialistProfile)
 *     Address:
 *       type: object
 *       properties:
 *         street:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         country:
 *           type: string
 *         zipCode:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         message:
 *           type: string
 */
const updateSpecialist = catchAsync(async (req, res, next) => {
  if (req.body.password)
    return next(new AppError('This route isnt for password updates', 400));

  const updatedSpecialist = await Specialist.findOneAndUpdate(
    req.user._id,
    req.body,
    {
      new: true,
      runValidators: false,
    }
  ).select('-_id');

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedSpecialist,
    },
  });
});

/**
 * @swagger
 * /api/v1/specialists/update-avatar:
 *   patch:
 *     summary: Update specialist avatar
 *     description: Update the specialist's avatar image
 *     tags:
 *       - Specialists
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     specialist:
 *                       $ref: '#/components/schemas/Specialist'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *     security:
 *       - bearerAuth: []
 *
 * @component
 * @schema
 * name: Specialist
 * type: object
 * properties:
 *   _id:
 *     type: string
 *   name:
 *     type: string
 *   email:
 *     type: string
 *   avatar:
 *     type: string
 */
const changeAvatar = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ error: 'Please provide an email address.' });
  }

  if (!req.file) {
    return res
      .status(400)
      .send({ error: 'Please provide the image to upload.' });
  }

  const specialist = await Specialist.findOne({ email });

  if (!specialist) {
    return res.status(404).send({ error: 'Specialist not found.' });
  }

  // resize image
  const buffer = await sharp(req.file.buffer).resize(400, 400).toBuffer();
  const imageName = generateRandomImageName();
  const command = new PutObjectCommand({
    Bucket: config.BUCKET_NAME,
    Key: imageName,
    Body: buffer,
    ContentType: req.file.mimetype,
  });

  await s3.send(command);

  const updatedSpecialist = await Specialist.findByIdAndUpdate(
    specialist._id,
    { avatar: imageName },
    { new: true }
  );

  const getObjectParams = {
    Bucket: config.BUCKET_NAME,
    Key: imageName,
  };

  // get signed url
  const getCommand = new GetObjectCommand(getObjectParams);
  const url = await getSignedUrl(s3, getCommand, { expiresIn: ONE_HOUR });
  updatedSpecialist.avatar = url;

  res.status(200).json({
    status: 'success',
    data: {
      specialist: updatedSpecialist,
    },
  });
});

/**
 * @swagger
 * /api/v1/specialists/update-medical-license:
 *   patch:
 *     summary: Update specialist medical license
 *     description: Update the specialist's medical license
 *     tags:
 *       - Specialists
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               license:
 *                 type: string
 *                 format: binary
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     specialist:
 *                       $ref: '#/components/schemas/Specialist'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *     security:
 *       - bearerAuth: []
 *
 * @component
 * @schema
 * name: Specialist
 * type: object
 * properties:
 *   _id:
 *     type: string
 *   name:
 *     type: string
 *   email:
 *     type: string
 *   avatar:
 *     type: string
 *   license:
 *     type: string
 */
const uploadMedicalLicense = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ error: 'Please provide an email address.' });
  }

  if (!req.file) {
    return res
      .status(400)
      .send({ error: 'Please provide the image/pdf to upload.' });
  }

  const specialist = await Specialist.findOne({ email });

  if (!specialist) {
    return res.status(404).send({ error: 'Specialist not found.' });
  }

  const fileName = generateRandomImageName();
  const command = new PutObjectCommand({
    Bucket: config.BUCKET_NAME,
    Key: fileName,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  });

  await s3.send(command);

  const updatedSpecialist = await Specialist.findByIdAndUpdate(
    specialist._id,
    { license: fileName },
    { new: true }
  );

  const getObjectParams = {
    Bucket: config.BUCKET_NAME,
    Key: fileName,
  };

  // get signed url
  const getCommand = new GetObjectCommand(getObjectParams);
  const url = await getSignedUrl(s3, getCommand, { expiresIn: ONE_HOUR });
  updatedSpecialist.license = url;

  res.status(200).json({
    status: 'success',
    data: {
      specialist: updatedSpecialist,
    },
  });
});

const signUpViaGoogle = (passport) => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: CALLBACK_URL,
        passReqToCallback: true,
      },
      async (request, accessToken, refreshToken, profile, done) => {
        try {
          let existingUser = await User.findOne({ 'google.id': profile.id });
          // if user exists return the user
          if (existingUser) {
            return done(null, existingUser);
          }
          // if user does not exist create a new user
          console.log('Creating new user...');
          const newUser = new User({
            method: 'google',
            google: {
              id: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              photo: profile.photos[0].value,
            },
            name: profile.displayName,
            email: profile.emails[0].value,
            telephone: '+237 673159685',
            password: 'google-auto-generated',
            photo: profile.photos[0].value,
          });
          await newUser.save();
          return done(null, newUser);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );
};

const sendOTP = catchAsync(async (req, res, next) => {
  const recipientPhoneNumber = req.body.phoneNumber;

  if (!recipientPhoneNumber) {
    return next(new AppError('Please provide a valid phone number', 400));
  }

  const response = await twilioClient.verify.v2
    .services(config.TWILIO_VERIFICATION_SID)
    .verifications.create({
      to: recipientPhoneNumber,
      channel: 'sms',
    });

  if (response.status === 'pending') {
    res.status(200).json({
      status: 'success',
      message: `OTP sent to ${recipientPhoneNumber}`,
    });
  } else {
    res.status(400).json({
      status: 'fail',
      message: `OTP sending failed to ${recipientPhoneNumber}`,
    });
  }
});

const checkOTP = catchAsync(async (req, res, next) => {
  const recipientPhoneNumber = req.body.phoneNumber;
  const smsCode = req.body.smsCode;

  if (!recipientPhoneNumber || !smsCode) {
    return next(
      new AppError('Please provide a valid phone number and sms code', 400)
    );
  }

  const user = await User.findOne({ telephone: recipientPhoneNumber });

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  const verificationCheck = await twilioClient.verify.v2
    .services(config.TWILIO_VERIFICATION_SID)
    .verificationChecks.create({
      to: recipientPhoneNumber,
      code: smsCode,
    });

  if (verificationCheck.status === 'approved') {
    user.active = true;
    await user.save();
    createSendToken(user, 200, res);
  } else {
    res.status(400).json({
      status: 'fail',
      message: `OTP verification failed for ${recipientPhoneNumber}`,
    });
  }
});

/**
 * @swagger
 *
 * /api/v1/specialists/me:
 *   get:
 *     tags: [Specialists]
 *     produces:
 *       - application/json
 *     description: Get the currently authenticated specialist
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   $ref: '#/definitions/Specialist'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *
 * definitions:
 *   Specialist:
 *     type: object
 *     properties:
 *       _id:
 *         type: string
 *       name:
 *         type: string
 *       telephone:
 *         type: string
 *       email:
 *         type: string
 *       active:
 *         type: boolean
 *       role:
 *         type: string
 *       __v:
 *         type: number
 *       passwordResetExpires:
 *         type: string
 *         format: date-time
 *       passwordResetToken:
 *         type: string
 *       passwordChangedAt:
 *         type: string
 *         format: date-time
 *       Address:
 *         type: object
 *         items:
 *           $ref: '#/definitions/Address'
 *   Address:
 *     type: object
 *     properties:
 *       _id:
 *         type: string
 *       country:
 *         type: string
 *       state:
 *         type: string
 *       city:
 *         type: string
 *       zipCode:
 *         type: string
 *       street:
 *         type: string
 *   Error:
 *     type: object
 *     properties:
 *       status:
 *         type: string
 *       message:
 *         type: string
 */
const getMe = catchAsync(async (req, res, next) => {
  const specialist = await Specialist.findById(req.user._id);

  if (specialist.avatar) {
    const getObjectParams = {
      Bucket: config.BUCKET_NAME,
      Key: specialist.avatar,
    };

    // get signed url
    const getCommand = new GetObjectCommand(getObjectParams);
    const avatarUrl = await getSignedUrl(s3, getCommand, {
      expiresIn: ONE_HOUR,
    });
    specialist.avatar = avatarUrl;
  }

  if (specialist.license) {
    const getObjectParams = {
      Bucket: config.BUCKET_NAME,
      Key: specialist.license,
    };

    // get signed url
    const getCommand = new GetObjectCommand(getObjectParams);
    const licenseURl = await getSignedUrl(s3, getCommand, {
      expiresIn: ONE_HOUR,
    });
    specialist.license = licenseURl;
  }

  res.status(200).json({
    status: 'success',
    data: {
      specialist,
    },
  });
});

/**
 * @swagger
 * /specialists/my-patients:
 *   get:
 *     tags: [Specialists]
 *     summary: Get the patients of the currently authenticated specialist
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: integer
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           patient:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               telephone:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *       '404':
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
const getMyPatients = catchAsync(async (req, res, next) => {
  const specialistId = req.user._id;
  const specialist = await Specialist.findById(specialistId);

  if (!specialist) {
    return next(new AppError('No specialist found with that ID', 404));
  }

  const users = await Appointment.aggregate([
    {
      $match: { doctor: mongoose.Types.ObjectId(specialistId) },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'patient',
        foreignField: '_id',
        as: 'patient',
      },
    },
    {
      $group: {
        _id: '$patient._id',
        patient: {
          $first: '$patient',
        },
      },
    },
    {
      $unwind: '$patient',
    },
    {
      $project: {
        _id: 0,
        patient: {
          _id: 1,
          name: 1,
          email: 1,
          telephone: 1,
          avatar: 1,
          avatarURL: 1,
          birthDate: 1,
          height: 1,
          weight: 1,
          bloodPressure: 1,
          bodyTemperature: 1,
          gender: 1,
        },
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      results: users.length,
      users,
    },
  });
});

/**
 * @swagger
 * /api/v1/specialists/update-info:
 *   patch:
 *     tags: [Specialists]
 *     summary: Update Specialist Profile
 *     description: This endpoint allows a specialist to update their profile information by providing their email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSpecialistProfile'
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SpecialistProfile'
 *       '400':
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *   schemas:
 *     UpdateSpecialistProfile:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         gender:
 *           type: string
 *         qualification:
 *           type: string
 *         licenceNumber:
 *           type: string
 *         licenceNumberObtentionDate:
 *           type: string
 *           format: date
 *         speciality:
 *           type: string
 *         workTitle:
 *            type: string
 *         isStillEmployed:
 *            type: boolean
 *         telephone:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *         active:
 *           type: boolean
 *         degreeObtentionDate:
 *           type: string
 *           format: date
 *         location:
 *           type: string
 *         bio:
 *           type: string
 *         avatar:
 *           type: string
 *         birthDate:
 *           type: string
 *           format: date
 *         address:
 *           $ref: '#/components/schemas/Address'
 *         yearsOfExperience:
 *           type: number
 *         maritalStatus:
 *           type: string
 *         previousUniversity:
 *           type: string
 *         lengthOfMedicalTraining:
 *           type: number
 *         role:
 *           type: string
 *         startedWorkingDate:
 *           type: string
 *           format: date
 *         currentWorkPlace:
 *           type: string
 *         roleDescription:
 *           type: string
 *         secondaryEmail:
 *           type: string
 *           format: email
 *         secondaryPhone:
 *           type: string
 *         accountVisibility:
 *           type: string
 *     SpecialistProfile:
 *       type: object
 *       properties:
 *         # ... (same as UpdateSpecialistProfile)
 *     Address:
 *       type: object
 *       properties:
 *         street:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         country:
 *           type: string
 *         zipCode:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         message:
 *           type: string
 */
const updateSpecialistViaEmail = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new AppError('Please provide your email', 400));

  const updatedSpecialist = await Specialist.findOneAndUpdate(
    { email: email },
    req.body,
    {
      new: true,
      runValidators: false,
    }
  ).select('-_id');

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedSpecialist,
    },
  });
});

const getSpecialists = getAll(Specialist);
const getSpecialist = getOne(Specialist);

module.exports = {
  signUp,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  signUpViaGoogle,
  sendOTP,
  checkOTP,
  getSpecialists,
  getSpecialist,
  confirmAccountViaOtp,
  updateSpecialist,
  changeAvatar,
  confirmAccountCreation,
  uploadMedicalLicense,
  getMe,
  getMyPatients,
  updateSpecialistViaEmail,
};
