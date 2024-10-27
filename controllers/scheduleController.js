const Schedule = require('../models/Schedule');
const catchAsync = require('../utils/catchAsync');
const Specialist = require('../models/Specialist');
const { deleteOne, updateOne, getOne, getAll } = require('./handlerFactory');
const AppError = require('../utils/appError');

const getSchedules = getAll(Schedule);

/**
 * @swagger
 * /schedules/{id}:
 *   get:
 *     summary: Get a schedule by id
 *     description: This endpoint allows doctors or specialists to get a schedule by ID.
 *     tags: [Schedules]
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
 *                     docs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           isDefault:
 *                             type: boolean
 *                           _id:
 *                             type: string
 *                           doctor:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               qualification:
 *                                 type: string
 *                           daysOfWeek:
 *                             type: object
 *                             properties:
 *                               Monday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               Tuesday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               Wednesday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               _id:
 *                                 type: string
 *                               Thursday:
 *                                 type: array
 *                                 items: {}
 *                               Friday:
 *                                 type: array
 *                                 items: {}
 *                               Saturday:
 *                                 type: array
 *                                 items: {}
 *                               Sunday:
 *                                 type: array
 *                                 items: {}
 *                           timezone:
 *                             type: string
 *                           appointmentTypes:
 *                             type: array
 *                             items:
 *                               type: string
 *                           notes:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           location:
 *                             type: string
 *                           title:
 *                             type: string
 *                           overrides:
 *                             type: array
 *                             items: {}
 *                           createdAt:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                           __v:
 *                             type: integer
 */
const getSchedule = getOne(Schedule, null, {
  'daysOfWeek._id': 0,
});

/**
 * @swagger
 *
 * /schedules/{id}:
 *   delete:
 *     tags: [Schedules]
 *     summary: Delete an existing schedule for the current specialist
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
 *         description: Schedule not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const deleteSchedule = deleteOne(Schedule);

/**
 * @swagger
 * /schedules/{id}:
 *   patch:
 *     summary: Update a new schedule
 *     description: This endpoint allows doctors or specialists to update a schedule via id.
 *     tags:
 *       - Schedules
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduleInput'
 *     responses:
 *       '200':
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       '400':
 *         description: Bad Request
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
 *   schemas:
 *     ScheduleInput:
 *       type: object
 *       required:
 *         - doctor
 *         - daysOfWeek
 *         - timezone
 *         - location
 *       properties:
 *         doctor:
 *           type: string
 *           description: The ID of the doctor or specialist associated with this schedule.
 *         daysOfWeek:
 *           type: object
 *           description: An object containing the availability intervals for each day of the week.
 *           properties:
 *             Monday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Tuesday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Wednesday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Thursday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Friday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Saturday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Sunday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *         timezone:
 *           type: string
 *           description: The timezone associated with the schedule.
 *         appointmentTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Consultation, Follow-up, Emergency, Check-up]
 *         notes:
 *           type: string
 *           description: Additional notes about the schedule.
 *         location:
 *           type: string
 *           enum: [Online, On-site]
 *           description: The location of the schedule.
 *     AvailabilityInterval:
 *       type: object
 *       required:
 *         - startTime
 *         - endTime
 *       properties:
 *         startTime:
 *           type: string
 *           description: The start time of the availability interval, in the format 'HH:mm'.
 *         endTime:
 *           type: string
 *           description: The end time of the availability interval, in the format 'HH:mm'.
 *     Schedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         doctor:
 *           type: string
 *         daysOfWeek:
 *           type: object
 *         timezone:
 *           type: string
 *         appointmentTypes:
 *           type: array
 *           items:
 *             type: string
 *         notes:
 *           type: string
 *         isActive:
 *           type: boolean
 *         location:
 *           type: string
 *         overrides:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Override'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         code:
 *           type: integer
 *         stack:
 *           type: string
 */
const updateSchedule = updateOne(Schedule, {
  'daysOfWeek._id': 0,
});

/**
 * @swagger
 * /schedules:
 *   get:
 *     summary: Get doctor's schedules
 *     description: This endpoint allows doctors or specialists to get their schedules.
 *     tags: [Schedules]
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
 *                     docs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           isDefault:
 *                             type: boolean
 *                           _id:
 *                             type: string
 *                           doctor:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               qualification:
 *                                 type: string
 *                           daysOfWeek:
 *                             type: object
 *                             properties:
 *                               Monday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               Tuesday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               Wednesday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               _id:
 *                                 type: string
 *                               Thursday:
 *                                 type: array
 *                                 items: {}
 *                               Friday:
 *                                 type: array
 *                                 items: {}
 *                               Saturday:
 *                                 type: array
 *                                 items: {}
 *                               Sunday:
 *                                 type: array
 *                                 items: {}
 *                           timezone:
 *                             type: string
 *                           appointmentTypes:
 *                             type: array
 *                             items:
 *                               type: string
 *                           notes:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           location:
 *                             type: string
 *                           title:
 *                             type: string
 *                           overrides:
 *                             type: array
 *                             items: {}
 *                           createdAt:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                           __v:
 *                             type: integer
 */
const getMySchedules = catchAsync(async (req, res, next) => {
  //get the logged in specialist information
  const specialistId = req.user._id;

  //check if the specialist exists
  const specialist = await Specialist.findById(specialistId);
  if (!specialist)
    return next(new AppError('There is no specialist, with that ID', 404));

  const schedules = await Schedule.find({ doctor: specialistId });

  if (!schedules) {
    return next(new AppError('No Schedules found', 404));
  }

  res.status(200).json({
    data: {
      results: schedules.length,
      docs: schedules,
    },
  });
});

/**
 * @swagger
 * /:id/schedules:
 *   get:
 *     summary: Get doctor's schedules
 *     description: This endpoint exposes the schedule of a given doctor.
 *     tags: [Schedules]
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
 *                     docs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           isDefault:
 *                             type: boolean
 *                           _id:
 *                             type: string
 *                           doctor:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               firstName:
 *                                 type: string
 *                               lastName:
 *                                 type: string
 *                               qualification:
 *                                 type: string
 *                           daysOfWeek:
 *                             type: object
 *                             properties:
 *                               Monday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               Tuesday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               Wednesday:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     startTime:
 *                                       type: string
 *                                     endTime:
 *                                       type: string
 *                                     _id:
 *                                       type: string
 *                               _id:
 *                                 type: string
 *                               Thursday:
 *                                 type: array
 *                                 items: {}
 *                               Friday:
 *                                 type: array
 *                                 items: {}
 *                               Saturday:
 *                                 type: array
 *                                 items: {}
 *                               Sunday:
 *                                 type: array
 *                                 items: {}
 *                           timezone:
 *                             type: string
 *                           appointmentTypes:
 *                             type: array
 *                             items:
 *                               type: string
 *                           notes:
 *                             type: string
 *                           isActive:
 *                             type: boolean
 *                           location:
 *                             type: string
 *                           title:
 *                             type: string
 *                           overrides:
 *                             type: array
 *                             items: {}
 *                           createdAt:
 *                             type: string
 *                           updatedAt:
 *                             type: string
 *                           __v:
 *                             type: integer
 */
const getDoctorSchedules = catchAsync(async (req, res, next) => {
  //get the logged in specialist information
  const specialistId = req.params.specialist_id;
  console.log(specialistId, 'From our request');

  //check if the specialist exists
  const specialist = await Specialist.findById(specialistId);
  if (!specialist)
    return next(new AppError('There is no specialist, with that ID', 404));

  const schedules = await Schedule.find({ doctor: specialistId });

  if (!schedules) {
    return next(new AppError('No Schedules found', 404));
  }

  res.status(200).json({
    data: {
      results: schedules.length,
      docs: schedules,
    },
  });
});

/**
 * @swagger
 * /schedules:
 *   post:
 *     summary: Create a new schedule
 *     description: This endpoint allows doctors or specialists to create a new schedule.
 *     tags:
 *       - Schedules
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ScheduleInput'
 *     responses:
 *       '201':
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Schedule'
 *       '400':
 *         description: Bad Request
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
 *   schemas:
 *     ScheduleInput:
 *       type: object
 *       required:
 *         - doctor
 *         - daysOfWeek
 *         - timezone
 *         - location
 *       properties:
 *         doctor:
 *           type: string
 *           description: The ID of the doctor or specialist associated with this schedule.
 *         daysOfWeek:
 *           type: object
 *           description: An object containing the availability intervals for each day of the week.
 *           properties:
 *             Monday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Tuesday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Wednesday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Thursday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Friday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Saturday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *             Sunday:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AvailabilityInterval'
 *         timezone:
 *           type: string
 *           description: The timezone associated with the schedule.
 *         appointmentTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [Consultation, Follow-up, Emergency, Check-up]
 *         notes:
 *           type: string
 *           description: Additional notes about the schedule.
 *         location:
 *           type: string
 *           enum: [Online, On-site]
 *           description: The location of the schedule.
 *     AvailabilityInterval:
 *       type: object
 *       required:
 *         - startTime
 *         - endTime
 *       properties:
 *         startTime:
 *           type: string
 *           description: The start time of the availability interval, in the format 'HH:mm'.
 *         endTime:
 *           type: string
 *           description: The end time of the availability interval, in the format 'HH:mm'.
 *     Schedule:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         doctor:
 *           type: string
 *         daysOfWeek:
 *           type: object
 *         timezone:
 *           type: string
 *         appointmentTypes:
 *           type: array
 *           items:
 *             type: string
 *         notes:
 *           type: string
 *         isActive:
 *           type: boolean
 *         location:
 *           type: string
 *         overrides:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Override'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         code:
 *           type: integer
 *         stack:
 *           type: string
 */
const createSchedule = catchAsync(async (req, res, next) => {
  //get the logged in specialist information
  const specialistId = req.user._id;

  //check if the specialist exists
  const specialist = await Specialist.findById(specialistId);

  if (!specialist)
    return next(new AppError('There is no specialist, with that ID', 404));

  const newDocument = await Schedule.create({
    ...req.body,
    doctor: specialistId,
  });

  res.status(201).json({
    status: 'success',
    data: {
      newDocument,
    },
  });
});

const markScheduleAsDefault = catchAsync(async (req, res, next) => {
  //get the logged in specialist information
  const specialistId = req.user._id;

  //check if the specialist exists
  const specialist = await Specialist.findById(specialistId);

  if (!specialist)
    return next(new AppError('There is no specialist, with that ID', 404));

  const newDocument = await Schedule.create({
    ...req.body,
    doctor: specialistId,
  });

  res.status(201).json({
    status: 'success',
    data: {
      newDocument,
    },
  });
});

const addOverrideToSchedule = catchAsync(async (req, res, next) => {
  //check if the overriden schedule is valid schedule
  const { scheduleId } = req.params;

  const schedule = await Schedule.findById(scheduleId);
  if (!schedule) {
    return next(new AppError('Schedule not found', 404));
  }

  //get the scheduled override from the req.body
  const { date } = req.body;

  //push to the overrides array the new schedule information
  schedule.overrides.push({
    date: new Date(date),
    ...req.body,
  });
  await schedule.save();

  res.status(200).json({
    status: 'success',
    data: {
      schedule,
    },
  });
});

module.exports = {
  createSchedule,
  deleteSchedule,
  updateSchedule,
  getSchedule,
  getSchedules,
  getMySchedules,
  addOverrideToSchedule,
  markScheduleAsDefault,
  getDoctorSchedules,
};
