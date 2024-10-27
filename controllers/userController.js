const User = require('../models/User');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { deleteOne, updateOne, getOne, getAll } = require('./handlerFactory');
const config = require('../config/config');
const crypto = require('crypto');
const multer = require('multer');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../utils/s3');
const sharp = require('sharp');
const { ONE_HOUR } = require('../constants');

const storage = multer.memoryStorage();
const upload = multer({ storage });

upload.single('avatar');

const generateRandomImageName = (bytes = 10) =>
  crypto.randomBytes(bytes).toString('hex');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

/**
 * @swagger
 *
 * /api/v1/users/updateMe:
 *   patch:
 *     tags: [Users]
 *     produces:
 *       - application/json
 *     description: Update the currently authenticated user's information
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/definitions/UserUpdate'
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
 *                     user:
 *                       $ref: '#/definitions/User'
 *       '400':
 *         description: Bad request
 *
 * definitions:
 *   User:
 *     type: object
 *     properties:
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
 *       savedArticles:
 *         type: array
 *         items:
 *           type: string
 *       bodyTemperature:
 *         type: string
 *       bloodPressure:
 *         type: string
 *       maritalStatus:
 *         type: string
 *         enum: ['Married', 'Single', 'Divorced', 'Widowed']
 *       gender:
 *         type: string
 *         enum: ['Male', 'Female', 'Other']
 *       medications:
 *         type: array
 *         items:
 *           type: string
 *       createdAt:
 *         type: string
 *         format: date-time
 *       updatedAt:
 *         type: string
 *         format: date-time
 *       __v:
 *         type: integer
 *       otp:
 *         type: string
 *       otpExpires:
 *         type: string
 *         format: date-time
 *       bio:
 *         type: string
 *       location:
 *         type: string
 *       profession:
 *         type: string
 *       houseAddress:
 *         type: string
 *   UserUpdate:
 *     type: object
 *     properties:
 *       name:
 *         type: string
 *       photo:
 *         type: string
 *       location:
 *         type: string
 *       birthDate:
 *         type: string
 *         format: date
 *       bio:
 *         type: string
 *       profession:
 *         type: string
 *       gender:
 *         type: string
 *         enum: ['Male', 'Female', 'Other']
 *       maritalStatus:
 *         type: string
 *         enum: ['Married', 'Single', 'Divorced', 'Widowed']
 *       houseAddress:
 *         type: string
 *       telephone:
 *         type: string
 */
const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password)
    return next(new AppError('This route isnt for password updates', 400));
  const filteredBody = filterObj(
    req.body,
    'name',
    'photo',
    'location',
    'birthDate',
    'bio',
    'gender',
    'maritalStatus',
    'telephone',
    'location',
    'birthDate',
    'bio',
    'profession',
    'houseAddress'
  );

  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: false,
  }).select('-_id');

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * @swagger
 * api/v1/users/vitals:
 *   patch:
 *     tags: [Users]
 *     summary: Update user vitals
 *     description: Update the user's vital information, such as weight, blood pressure, body temperature, and height.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVitalsRequest'
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateVitalsResponse'
 *       '400':
 *         $ref: '#/components/responses/BadRequest'
 *       '401':
 *         $ref: '#/components/responses/Unauthorized'
 *       '403':
 *         $ref: '#/components/responses/Forbidden'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/InternalServerError'
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *
 *   schemas:
 *     UpdateVitalsRequest:
 *       type: object
 *       properties:
 *         weight:
 *           type: number
 *           description: The user's updated weight
 *         bloodPressure:
 *           type: string
 *           description: The user's updated blood pressure
 *         bodyTemperature:
 *           type: number
 *           description: The user's updated body temperature
 *         height:
 *           type: number
 *           description: The user's updated height
 *
 *     UpdateVitalsResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *
 *     User:
 *       type: object
 *       properties:
 *         weight:
 *           type: number
 *           description: The user's updated weight
 *         bloodPressure:
 *           type: string
 *           description: The user's updated blood pressure
 *         bodyTemperature:
 *           type: number
 *           description: The user's updated body temperature
 *         height:
 *           type: number
 *           description: The user's updated height
 *
 *   responses:
 *     BadRequest:
 *       description: Bad request
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Forbidden:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     NotFound:
 *       description: Not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     InternalServerError:
 *       description: Internal server error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           example: Error message
 */
const updateVitals = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'weight',
    'bloodPressure',
    'bodyTemperature',
    'height'
  );

  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: false,
  }).select('-_id');

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

const updateBreastVitals = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new AppError('User not found', 404));

  user.vitalSigns.push(req.body);
  await user.save();

  res.status(201).json(user.vitalSigns);
});

const getBreastVitals = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new AppError('User not found', 404));

  res.status(200).json(user.vitalSigns);
});

const deleteBreastVital = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) return next(new AppError('User not found', 404));
  user.vitalSigns = user?.vitalSigns.filter(
    (vitalSign) => vitalSign._id.toString() !== req.params.vitalId
  );

  await user.save();

  res.status(204).json({ status: 'success' });
});

/**
 * @swagger
 * /api/v1/users/update-avatar:
 *   patch:
 *     summary: Update user avatar
 *     description: Update the user's avatar image
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
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
 * name: User
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
  const userId = req.user._id;

  if (!req.file) {
    return res
      .status(400)
      .send({ error: 'Please provide the image to upload.' });
  }

  // resize image
  const buffer = await sharp(req.file.buffer).resize(400, 400).toBuffer();
  const imageName = generateRandomImageName();
  const command = new PutObjectCommand({
    Bucket: config.BUCKET_NAME,
    Key: imageName,
    Body: buffer,
    ContentType: req.body.mimetype,
  });

  await s3.send(command);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { avatar: imageName },
    { new: true }
  );

  const getObjectParams = {
    Bucket: config.BUCKET_NAME,
    Key: imageName,
  };

  // get signed url
  const getCommand = new GetObjectCommand(getObjectParams);
  const url = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
  updatedUser.avatar = url;

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * @swagger
 *
 * /api/v1/users/deleteMe:
 *   delete:
 *     tags: [Users]
 *     produces:
 *       - application/json
 *     description: Deactivate the currently authenticated user
 *     responses:
 *       '204':
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
 *                   nullable: true
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *
 * definitions:
 *   Error:
 *     type: object
 *     properties:
 *       status:
 *         type: string
 *       message:
 *         type: string
 */
const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * @swagger
 *
 * /api/v1/users/me:
 *   get:
 *     tags: [Users]
 *     produces:
 *       - application/json
 *     description: Get the currently authenticated user
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
 *                   $ref: '#/definitions/User'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Error'
 *
 * definitions:
 *   User:
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
 *       savedArticles:
 *         type: array
 *         items:
 *           type: string
 *       passwordResetExpires:
 *         type: string
 *         format: date-time
 *       passwordResetToken:
 *         type: string
 *       passwordChangedAt:
 *         type: string
 *         format: date-time
 *       bloodPressure:
 *         type: string
 *       bodyTemperature:
 *         type: string
 *       medications:
 *         type: array
 *         items:
 *           $ref: '#/definitions/Medication'
 *   Medication:
 *     type: object
 *     properties:
 *       _id:
 *         type: string
 *       name:
 *         type: string
 *       dosage:
 *         type: string
 *       frequency:
 *         type: string
 *       startDate:
 *         type: string
 *         format: date-time
 *       endDate:
 *         type: string
 *         format: date-time
 *       prescribedBy:
 *         type: string
 *       notes:
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
  const user = await User.findById(req.user._id);

  if (user.avatar) {
    const getObjectParams = {
      Bucket: config.BUCKET_NAME,
      Key: user.avatar,
    };

    // get signed url
    const getCommand = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, getCommand, { expiresIn: ONE_HOUR });
    user.avatar = url;
    res.status(200).json({
      status: 'success',
      data: user,
    });
  }

  res.status(200).json({
    status: 'success',
    data: user,
  });
});

const updateMenstrualCycleInfo = catchAsync(async (req, res, next) => {
  if (req.body.password)
    return next(new AppError('This route isnt for password updates', 400));

  const { dayCount, daysBledCount, description } = req.body;

  if (!dayCount) {
    return next(new AppError('The period was not provided', 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      menstrualCycleInfo: { ...req.body },
    },
    {
      new: true,
      runValidators: true,
    }
  ).select('-_id');

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * @swagger
 *
 * /api/v1/users/medications:
 *   post:
 *     tags:
 *       - Medication
 *     summary: Create a new medication for the current user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the medication
 *               dosage:
 *                 type: string
 *                 description: The dosage of the medication
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: The start date for the medication
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: The end date for the medication
 *               prescribedBy:
 *                 type: string
 *                 description: The name of the prescribing doctor
 *               notes:
 *                 type: string
 *                 description: Additional notes about the medication
 *               frequency:
 *                 type: string
 *                 description: The frequency of the medication
 *               tag:
 *                 type: string
 *                 description: A tag for the medication, could be a vitamin, painkiller,anti-biotic etc
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
 *         medications:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Medication'
 *     Medication:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         dosage:
 *           type: string
 *         startDate:
 *           type: string
 *           format: date-time
 *         endDate:
 *           type: string
 *           format: date-time
 *         prescribedBy:
 *           type: string
 *         notes:
 *           type: string
 *         frequency:
 *           type: string
 *         tag:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *         message:
 *           type: string
 */
const createMedication = catchAsync(async (req, res, next) => {
  if (req.body.password)
    return next(new AppError('This route isnt for password updates', 400));

  const user = await User.findById(req.user._id);
  const {
    name,
    dosage,
    startDate,
    endDate,
    prescribedBy,
    notes,
    frequency,
    tag,
  } = req.body;

  const newMedication = {
    name,
    dosage,
    startDate,
    endDate,
    prescribedBy,
    notes,
    frequency,
    tag,
  };

  user.medications.push(newMedication);
  const updatedUser = await user.save();

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * @swagger
 *
 * /api/v1/users/medications/{id}:
 *   patch:
 *     tags:
 *       - Medication
 *     summary: Update an existing medication for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the medication
 *               dosage:
 *                 type: string
 *                 description: The dosage of the medication
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: The start date for the medication
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: The end date for the medication
 *               prescribedBy:
 *                 type: string
 *                 description: The name of the prescribing doctor
 *               notes:
 *                 type: string
 *                 description: Additional notes about the medication
 *               tag:
 *                 type: string
 *                 description: A tag for the medication, could be a vitamin, painkiller,anti-biotic etc
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
 *                   $ref: '#/components/schemas/Medication'
 *       '404':
 *         description: Medication not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const updateMedication = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, dosage, startDate, endDate, prescribedBy, notes, tag } =
    req.body;

  // const filteredBody = filterObj(
  //   req.body,
  //   'name',
  //   'dosage',
  //   'startDate',
  //   'endDate',
  //   'prescribedBy',
  //   'tag',
  //   'notes'
  // );
  const user = await User.findById(req.user._id);

  const medication = user.medications.id(id);
  if (!medication) {
    return res.status(404).json({ message: 'Medication not found' });
  }

  if (name) medication.name = name;
  if (dosage) medication.dosage = dosage;
  if (startDate) medication.startDate = startDate;
  if (endDate) medication.endDate = endDate;
  if (notes) medication.notes = notes;
  if (tag) medication.tag = tag;
  if (prescribedBy) medication.prescribedBy = prescribedBy;

  await user.save();

  res.status(200).json({
    status: 'success',
    data: {
      medication,
    },
  });
});

/**
 * @swagger
 *
 * /api/v1/users/medications/{id}:
 *   delete:
 *     tags:
 *       - Medication
 *     summary: Delete an existing medication for the current user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       '404':
 *         description: Medication not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const deleteMedication = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await User.findById(req.user._id);

  const medication = user.medications.id(id);
  if (!medication) {
    return res.status(404).json({ message: 'Medication not found' });
  }

  user.medications.pull(medication);
  await user.save();

  res.json({ message: 'Medication deleted' });
});

/**
 * @swagger
 * /api/v1/users/medications:
 *   get:
 *     tags: [Medication]
 *     summary: Get all medications for connected user
 *     description: Retrieves a list of all medications for connected user.
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
 *                 medications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       dosage:
 *                         type: string
 *                       frequency:
 *                         type: string
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                       prescribedBy:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       _id:
 *                         type: string
 *       '404':
 *         description: No medications found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
const getMedications = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const medications = user.medications;
  if (!medications) {
    return res.status(404).json({ message: 'Medication not found' });
  }

  res.json({
    status: 'success',
    medications,
  });
});

/**
 * @swagger
 * /api/v1/users/medications/{medicationId}:
 *   get:
 *     tags: [Medication]
 *     summary: Get a specific medication
 *     description: Retrieves the details of a specific medication.
 *     parameters:
 *       - in: path
 *         name: medicationId
 *         required: true
 *         schema:
 *           type: string
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
 *                 medication:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     dosage:
 *                       type: string
 *                     frequency:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     endDate:
 *                       type: string
 *                       format: date-time
 *                     prescribedBy:
 *                       type: string
 *                     notes:
 *                       type: string
 *                     _id:
 *                       type: string
 *       '404':
 *         description: Medication not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
const getMedication = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const { id } = req.params;

  const medication = user.medications.id(id);
  if (!medication) {
    return res.status(404).json({ message: 'Medication not found' });
  }

  res.json({
    status: 'success',
    medication,
  });
});

const deleteUser = deleteOne(User);
const updateUser = updateOne(User);

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Retrieve a user by ID
 *     tags: [Users]
 *     description: Returns a single user object with the specified ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to retrieve
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     doc:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         telephone:
 *                           type: string
 *                         email:
 *                           type: string
 *                         active:
 *                           type: boolean
 *                         role:
 *                           type: string
 *                         savedArticles:
 *                           type: array
 *                           items:
 *                             type: string
 *                         bodyTemperature:
 *                           type: string
 *                         bloodPressure:
 *                           type: string
 *                         maritalStatus:
 *                           type: string
 *                         gender:
 *                           type: string
 *                         medications:
 *                           type: array
 *                           items:
 *                             type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                         __v:
 *                           type: integer
 *                         passwordChangedAt:
 *                           type: string
 *                           format: date-time
 *                         houseAddress:
 *                           type: string
 *                         profession:
 *                           type: string
 *                         avatar:
 *                           type: string
 */
const getUser = getOne(User);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Retrieve a list of users
 *     tags: [Users]
 *     description: Returns a list of users with their respective details.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 15
 *         description: Number of results per page
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: integer
 *                       description: Total number of results
 *                     docs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           telephone:
 *                             type: string
 *                           email:
 *                             type: string
 *                           active:
 *                             type: boolean
 *                           role:
 *                             type: string
 *                           savedArticles:
 *                             type: array
 *                             items:
 *                               type: string
 *                           bodyTemperature:
 *                             type: string
 *                           bloodPressure:
 *                             type: string
 *                           maritalStatus:
 *                             type: string
 *                           gender:
 *                             type: string
 *                           medications:
 *                             type: array
 *                             items:
 *                               type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           __v:
 *                             type: integer
 *                           passwordChangedAt:
 *                             type: string
 *                             format: date-time
 *                           houseAddress:
 *                             type: string
 *                           profession:
 *                             type: string
 *                           avatar:
 *                             type: string
 */
const getUsers = getAll(User);

const registerUserAndVitals = catchAsync(async (req, res, next) => {
  const { name, telephone, age, location } = req.body;
  if (!telephone || !name || !age || !location) {
    return next(new AppError('Please provide valid user details', 400));
  }

  const newUser = await User.create({
    telephone,
    active: true,
    name,
    age,
    location,
  });
  await newUser.save();

  newUser.vitalSigns.push(req.body);
  await newUser.save();

  res.status(201).json({ 'User created successfully': newUser.vitalSigns });
});

module.exports = {
  updateMe,
  deleteMe,
  deleteUser,
  updateUser,
  getUsers,
  getUser,
  getMe,
  changeAvatar,
  updateMenstrualCycleInfo,
  createMedication,
  updateMedication,
  deleteMedication,
  updateVitals,
  getMedications,
  getMedication,
  updateBreastVitals,
  getBreastVitals,
  deleteBreastVital,
  registerUserAndVitals,
};
