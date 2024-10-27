const GoogleStrategy = require('passport-google-oauth2').Strategy;
const config = require('../config/config');
const crypto = require('crypto');
const User = require('../models/User');
const FCMTokens = require('../models/FCMTokens');
const catchAsync = require('../utils/catchAsync');
const generateToken = require('../utils/generateToken');
const AppError = require('../utils/appError');

const { google } = require('googleapis');
const sendEmail = require('../utils/sendGridEmail');
const { EMAIL_TEMPLATE_IDS } = require('../constants');
const twilioClient = require('twilio')(
  config.TWILIO_ACCOUNT_SID,
  config.TWILIO_AUTH_TOKEN
);

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const CALLBACK_URL = 'http://localhost:8080/auth/google/callback';
const initGoogle = () =>
  // Authentication using OAuth 2.0
  new google.auth.OAuth2({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: CALLBACK_URL,
  });

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
      user,
    },
  });
};

// Doing some nasty stuff for google validation
const signUp = catchAsync(async (req, res, next) => {
  const { name, email, telephone } = req.body;
  /**
   * name -> google
   * email -> google@gmail.com
   * telephone -> +237 678477710
   */

  if (email === 'google@gmail.com') {
    const newUser = await User.create({
      name,
      email,
      telephone,
      active: true,
    });
    res.status(201).json({
      status: 'success',
      message: `OTP sent to ${telephone}`,
      user: newUser,
    });
  }

  if (!telephone || !name) {
    return next(
      new AppError('Please provide a valid phone number and a username', 400)
    );
  }

  const response = await twilioClient.verify.v2
    .services(config.TWILIO_VERIFICATION_SID)
    .verifications.create({
      to: telephone,
      channel: 'sms',
    });

  if (response.status === 'pending') {
    const newUser = await User.create({
      name,
      email,
      telephone,
      active: false,
    });
    res.status(201).json({
      status: 'success',
      message: `OTP sent to ${telephone}`,
      user: newUser,
    });
  } else {
    res.status(400).json({
      status: 'fail',
      message: `OTP sending failed to ${recipientPhoneNumber}`,
    });
  }
});

/**
 * @swagger
 *
 * /api/v1/users/signUpWithPassword:
 *   post:
 *     tags:
 *       - Authentication
 *     produces:
 *       - application/json
 *     description: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewUser'
 *     responses:
 *       '201':
 *         description: User created successfully
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
 *
 * components:
 *   schemas:
 *     NewUser:
 *       type: object
 *       required:
 *         - name
 *         - password
 *         - email
 *         - telephone
 *       properties:
 *         name:
 *           type: string
 *         password:
 *           type: string
 *         email:
 *           type: string
 *         telephone:
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
const signUpViaPassword = catchAsync(async (req, res, next) => {
  const { password, email, telephone, name } = req.body;

  if (!telephone || !email || !password || !name) {
    return next(
      new AppError(
        'Please provide a valid phone number and a username,password',
        400
      )
    );
  }

  const newUser = await User.create({ ...req.body, active: true });
  await newUser.save();

  createSendToken(newUser, 201, res);
});

const registerAdminUser = catchAsync(async (req, res, next) => {
  const { password, email, name } = req.body;

  if (!email || !password || !name) {
    return next(
      new AppError(
        'Please provide a valid phone number and a username,password',
        400
      )
    );
  }

  const newUser = await User.create({
    ...req.body,
    active: true,
    role: 'admin',
  });
  await newUser.save();

  createSendToken(newUser, 201, res);
});

/**
 * @swagger
 *
 * /api/v1/users/login:
 *   post:
 *     tags:
 *       - Authentication
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

  const user = await User.findOne({ email, active: { $ne: false } }).select(
    'password'
  );

  if (!user)
    return next(
      new AppError('User does not exist or has not been confirmed', 404)
    );

  if (user && (await user.checkPassword(password))) {
    return createSendToken(user, 200, res);
  }
  return next(new AppError('Incorrect email or password', 400));
});

/**
 * @swagger
 *
 * /api/v1/users/forgotPassword:
 *   post:
 *     tags:
 *       - Authentication
 *     produces:
 *       - application/json
 *     description: Initiate a password reset process
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       '200':
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       '404':
 *         description: No user found with the provided email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '500':
 *         description: Error sending the password reset email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * components:
 *   schemas:
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         message:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         statusCode:
 *           type: integer
 */
const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new AppError('Please provide an email address', 400));
  }

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with that email address', 404));
  }

  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  console.log(resetUrl, 'From Auth controller');

  // const message = `Forgot your password? Click the link below to reset your password:\n\n${resetUrl}\n\nIf you didn't request a password reset, please ignore this email.`;

  try {
    const response = await sendEmail({
      recipientEmail: email,
      title: 'Password Reset Request',
      templateId: EMAIL_TEMPLATE_IDS.RESET_PASSWORD,
      template_data: {
        username: user.name,
        link: resetUrl,
      },
    });

    if (!response || response[0]?.statusCode !== 202) {
      return next(
        new AppError('Something went wrong while sending the email', 500)
      );
    }

    res.status(200).json({
      status: 'success',
      message: 'Password reset link sent to your email',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'Failed to send password reset email. Please try again later.',
        500
      )
    );
  }
});

/**
 * @swagger
 *
 * /api/v1/users/resetPassword/{token}:
 *   patch:
 *     tags:
 *       - Authentication
 *     produces:
 *       - application/json
 *     description: Reset the user's password
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       '200':
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       '400':
 *         description: Invalid or expired password reset token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * components:
 *   schemas:
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - password
 *       properties:
 *         password:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         token:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         statusCode:
 *           type: integer
 */
const resetPassword = catchAsync(async (req, res, next) => {
  // rehash psw for comparsim, with whats in the db

  if (!req.body.password)
    return next(new AppError('Please provide a password', 400));

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

const confirmAccountCreation = catchAsync(async (req, res, next) => {
  if (!req.body.otp) return next(new AppError('Please provide an OTP', 400));

  // check if there is a user belonging to the token
  // and also if his token is still valid
  const user = await User.findOne({
    otp: req.body.otp,
    // otpExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Token is invalid or has expired', 400));

  // update users password and save
  user.otp = null;
  user.otpExpires = null;
  user.active = true;
  await user.save();

  createSendToken(user, 200, res);
});

/**
 * @swagger
 *
 * /api/v1/users/updateMyPassword:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update the current user's password
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: The user's current password
 *               newPassword:
 *                 type: string
 *                 description: The new password to be set
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
 *                   $ref: '#/components/schemas/User'
 *       '400':
 *         description: Bad request
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
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         message:
 *           type: string
 */
const updatePassword = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+password');
  const { oldPassword, newPassword } = req.body;

  let doesPasswordMatch = await user.checkPassword(oldPassword);

  if (!doesPasswordMatch)
    return next(new AppError('Your password is incorrect', 400));
  user.password = newPassword;
  await user.save();
  createSendToken(user, 200, res);

  // we dont user finbyidandupdate bcos of our validators
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
          console.log('Inside google function.......');
          // let existingUser = await User.findOne({ 'google.id': profile.id });
          const existingUser = await User.findOne({ socialId: profile.id });
          // if user exists return the user
          if (existingUser) {
            console.log('Existing user', existingUser);
            return done(null, existingUser);
          }
          // if user does not exist create a new user
          console.log('Creating new user...');

          // });
          const newUser = new User({
            socialId: profile.id,
            provider: 'google',
            name: profile.displayName, // Optional if provided by Google
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
          });

          await newUser.save();
          console.log('New user created...', newUser);
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

  const user = await User.findOne({ telephone: recipientPhoneNumber });

  if (!user) {
    return next(new AppError('This account does not exist yet', 400));
  }

  console.log('************');
  console.log(config.TWILIO_VERIFICATION_SID, 'Twilio verification SID');
  console.log('************');

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
  // const { recipientPhoneNumber, smsCode, fcmToken } = req.body;
  const recipientPhoneNumber = req.body.phoneNumber;
  const smsCode = req.body.smsCode;
  const fcmToken = req.body.fcmToken;

  if (!recipientPhoneNumber || !smsCode) {
    return next(
      new AppError('Please provide a valid phone number and sms code', 400)
    );
  }

  const user = await User.findOne({ telephone: recipientPhoneNumber });

  if (!user) {
    return next(new AppError('User not found', 404));
  }
  // Hard coded for google testing
  if (recipientPhoneNumber === '+237678477710' && smsCode === '0000') {
    createSendToken(user, 200, res);
    return;
  }

  const verificationCheck = await twilioClient.verify.v2
    .services(config.TWILIO_VERIFICATION_SID)
    .verificationChecks.create({
      to: recipientPhoneNumber,
      code: smsCode,
    });

  if (verificationCheck.status === 'approved') {
    user.active = true;
    if (fcmToken) {
      const newTokenDocument = new FCMTokens({
        userId: user._id,
        tokens: fcmToken,
      });
      await newTokenDocument.save();
    }
    await user.save();
    createSendToken(user, 200, res);
  } else {
    res.status(400).json({
      status: 'fail',
      message: `OTP verification failed for ${recipientPhoneNumber}`,
    });
  }
});

const loginViaGoogle = catchAsync(async (req, res, next) => {
  const { access_token } = req.body;
  const auth = initGoogle();

  if (!access_token) {
    return next(new AppError('Please provide a valid access token', 400));
  }

  // Set the access token
  auth.setCredentials({
    access_token: access_token,
  });

  // Create a People API instance
  const people = google.people({ version: 'v1', auth });

  const { data } = await people.people.get({
    resourceName: 'people/me',
    personFields: 'emailAddresses,names,photos',
  });

  const profileId = data.resourceName.split('/')[1];
  const existingUser = await User.findOne({
    $or: [{ socialId: profileId }, { email: data?.emailAddresses[0]?.value }],
  });

  if (!existingUser) return next(new AppError('User not found', 404));
  createSendToken(existingUser, 200, res);
});

const registerViaGoogle = catchAsync(async (req, res, next) => {
  const { access_token } = req.body;
  const auth = initGoogle();

  if (!access_token) {
    return next(new AppError('Please provide a valid access token', 400));
  }

  // Set the access token
  auth.setCredentials({
    access_token: access_token,
  });

  // Create a People API instance
  const people = google.people({ version: 'v1', auth });

  const { data } = await people.people.get({
    resourceName: 'people/me',
    personFields: 'emailAddresses,names,photos',
  });

  const profileId = data.resourceName.split('/')[1];
  const existingUser = await User.findOne({
    $or: [{ socialId: profileId }, { email: data?.emailAddresses[0]?.value }],
  });

  // Just log the user in at once
  if (existingUser) {
    existingUser.socialId = profileId;
    existingUser.provider = 'google';
    await existingUser.save();
    createSendToken(existingUser, 200, res);
  }

  const newUser = new User({
    socialId: profileId,
    provider: 'google',
    name: data.names[0].displayName,
    email: data.emailAddresses[0].value,
    avatar: data.photos[0].value,
  });

  await newUser.save();

  createSendToken(newUser, 200, res);
});

module.exports = {
  signUp,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  signUpViaGoogle,
  sendOTP,
  checkOTP,
  signUpViaPassword,
  createSendToken,
  loginViaGoogle,
  registerViaGoogle,
  confirmAccountCreation,
  registerAdminUser,
};
