const Appointment = require('../models/Appointment');
const catchAsync = require('../utils/catchAsync');
const Specialist = require('../models/Specialist');
const User = require('../models/User');
const { EMAIL_TEMPLATE_IDS } = require('../constants');
const { format } = require('date-fns');

const {
  deleteOne,
  updateOne,
  getOne,
  getAll,
  createOne,
} = require('./handlerFactory');
const sendEmail = require('../utils/sendGridEmail');
const AppError = require('../utils/appError');
const generateSignedURL = require('../utils/generateSignedURL');
// const sendMail = require('../utils/sendEmail');

const getAppointments = getAll(Appointment);

// async function processAppointments(appointments) {
//   return Promise.all(
//     appointments.map(async (appointment) => {
//       const processedAppointment = appointment.toObject();

//       if (processedAppointment.patient && processedAppointment.patient.avatar) {
//         processedAppointment.patient.avatar = await generateSignedURL(
//           processedAppointment.patient.avatar
//         );
//       }

//       if (processedAppointment.doctor && processedAppointment.doctor.avatar) {
//         processedAppointment.doctor.avatar = await generateSignedURL(
//           processedAppointment.doctor.avatar
//         );
//       }

//       return processedAppointment;
//     })
//   );
// }

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Get an appointment by ID
 *     description: Get all appointments for the current specialist
 *     tags: [Appointments]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: integer
 *                       description: The appointment retrieved
 *                     doc:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Appointment'
 *       '404':
 *         description: No appointment found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         day:
 *           type: string
 *           format: date-time
 *         time:
 *           type: string
 *         status:
 *           type: string
 *         consultationReason:
 *           type: string
 *         patient:
 *           $ref: '#/components/schemas/Patient'
 *         doctor:
 *           $ref: '#/components/schemas/Doctor'
 *         appointmentDuration:
 *           type: string
 *         isFirstVisit:
 *           type: boolean
 *         isTakingMeds:
 *           type: boolean
 *         hasAllergy:
 *           type: boolean
 *         focusArea:
 *           type: string
 *         reviews:
 *           type: array
 *           items:
 *             type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Patient:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *
 *     Doctor:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         qualification:
 *           type: string
 *
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */
const getAppointment = getOne(Appointment);
const deleteAppointment = deleteOne(Appointment);
const updateAppointment = updateOne(Appointment);

/**
 * @swagger
 * /appointments/new:
 *   post:
 *     summary: Create a new appointment
 *     description: Create a new appointment for a patient with a specialist.
 *     tags:
 *       - Appointments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAppointmentRequest'
 *     responses:
 *       '201':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * components:
 *   schemas:
 *     CreateAppointmentRequest:
 *       type: object
 *       required:
 *         - title
 *         - day
 *         - time
 *         - consultationReason
 *         - patient
 *         - doctor
 *       properties:
 *         title:
 *           type: string
 *         day:
 *           type: string
 *           format: date
 *         time:
 *           type: string
 *         status:
 *           type: string
 *           enum: ['pending', 'completed', 'postponed', 'canceled', 'upcoming']
 *           default: 'pending'
 *         consultationReason:
 *           type: string
 *         patient:
 *           type: string
 *           format: uuid
 *         doctor:
 *           type: string
 *           format: uuid
 *         appointmentDuration:
 *           type: string
 *           enum: ['15', '30', '45', '60']
 *           default: '30'
 *         videoCallLink:
 *           type: string
 *         isFirstVisit:
 *           type: boolean
 *           default: true
 *         isTakingMeds:
 *           type: boolean
 *           default: false
 *         hasAllergy:
 *           type: boolean
 *           default: false
 *         focusArea:
 *           type: string
 *         uploads:
 *           type: string
 *
 *     Appointment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         day:
 *           type: string
 *           format: date
 *         time:
 *           type: string
 *         status:
 *           type: string
 *           enum: ['pending', 'completed', 'postponed', 'canceled', 'upcoming']
 *         consultationReason:
 *           type: string
 *         patient:
 *           $ref: '#/components/schemas/User'
 *         doctor:
 *           $ref: '#/components/schemas/Specialist'
 *         appointmentDuration:
 *           type: string
 *           enum: ['15', '30', '45', '60']
 *         videoCallLink:
 *           type: string
 *         isFirstVisit:
 *           type: boolean
 *         isTakingMeds:
 *           type: boolean
 *         hasAllergy:
 *           type: boolean
 *         focusArea:
 *           type: string
 *         uploads:
 *           type: string
 *         specialistNote:
 *           type: string
 *         reviews:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Review'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: uuid
 *         username:
 *           type: string
 *
 *     Specialist:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *
 *     Review:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: uuid
 *         rating:
 *           type: number
 *         comment:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const createBlankAppointment = createOne(Appointment);

const getMyAppointments = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const appointments = await Appointment.find({ patient: userId });
  // const processedAppointments = await processAppointments(appointments);

  if (!appointments) {
    return next(new AppError('No appointments found', 404));
  }

  res.status(200).json({
    data: {
      results: appointments.length,
      docs: appointments,
    },
  });
});

/**
 * @swagger
 * /appointments/my-doctors:
 *   get:
 *     summary: Get doctors the patient has had appointments with
 *     tags:
 *       - Appointments
 *     security:
 *       - bearerAuth: []
 *     description: Returns a list of doctors the authenticated patient has had appointments with. The doctors' details include first name, last name, qualification, and avatar.
 *     responses:
 *       200:
 *         description: A list of doctors the patient has had appointments with
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 doctors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "605c72d8a3a184001f8364f9"
 *                       firstName:
 *                         type: string
 *                         example: "John"
 *                       lastName:
 *                         type: string
 *                         example: "Doe"
 *                       qualification:
 *                         type: string
 *                         example: "MD"
 *                       avatar:
 *                         type: string
 *                         example: "https://example.com/avatar.jpg"
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Server error
 */
const getMyDoctors = catchAsync(async (req, res, next) => {
  const patientId = req.user._id;
  console.log(patientId);
  // Find appointments for the logged-in patient
  const appointments = await Appointment.find({ patient: patientId }).populate({
    path: 'doctor',
    select: 'firstName lastName qualification avatar _id',
  });

  const uniqueDoctors = Array.from(
    new Set(
      appointments
        .filter((app) => app.doctor != null) // Filter out appointments with null doctors
        .map((app) => app.doctor._id.toString()) // Map to doctor IDs
    )
  ).map(
    (id) =>
      appointments.find((app) => app.doctor && app.doctor._id.toString() === id)
        .doctor
  );

  res.json({
    status: 'success',
    uniqueDoctors,
  });
});

/**
 * @swagger
 * /appointments/specialist:
 *   get:
 *     summary: Get appointments for the current specialist
 *     description: Get all appointments for the current specialist
 *     tags: [Appointments]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: integer
 *                       description: The number of appointments retrieved
 *                     docs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Appointment'
 *       '404':
 *         description: No appointments found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         title:
 *           type: string
 *         day:
 *           type: string
 *           format: date-time
 *         time:
 *           type: string
 *         status:
 *           type: string
 *         consultationReason:
 *           type: string
 *         patient:
 *           $ref: '#/components/schemas/Patient'
 *         doctor:
 *           $ref: '#/components/schemas/Doctor'
 *         appointmentDuration:
 *           type: string
 *         isFirstVisit:
 *           type: boolean
 *         isTakingMeds:
 *           type: boolean
 *         hasAllergy:
 *           type: boolean
 *         focusArea:
 *           type: string
 *         reviews:
 *           type: array
 *           items:
 *             type: object
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     Patient:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *
 *     Doctor:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         qualification:
 *           type: string
 *
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */
const getMyAppointmentsAsSpecialist = catchAsync(async (req, res, next) => {
  const specialistId = req.user._id;

  const appointments = await Appointment.find({ doctor: specialistId });
  // const processedAppointments = await processAppointments(appointments);

  if (!appointments) {
    return next(new AppError('No appointments found', 404));
  }

  res.status(200).json({
    data: {
      results: appointments.length,
      docs: appointments,
    },
  });
});

/**
 * @swagger
 * /appointments/{id}/reschedule:
 *   patch:
 *     summary: Reschedule an existing appointment
 *     description: Reschedule an existing appointment
 *     tags: [Appointments]
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
 *             $ref: '#/components/schemas/UpdateAppointment'
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       '404':
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * @swagger
 * components:
 *   schemas:
 *     UpdateAppointment:
 *       type: object
 *       properties:
 *         day:
 *           type: string
 *           format: date-time
 *         time:
 *           type: string
 *         specialistNote:
 *           type: string
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         day:
 *           type: string
 *           format: date-time
 *         time:
 *           type: string
 *         status:
 *           type: string
 *         consultationReason:
 *           type: string
 *         appointmentDuration:
 *           type: string
 *         isTakingMeds:
 *           type: boolean
 *         hasAllergy:
 *           type: boolean
 *         focusArea:
 *           type: string
 *         specialistNote:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */
const rescheduleAppointment = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;
  const { day, time, specialistNote } = req.body;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  appointment.day = day;
  appointment.time = time;
  appointment.status = 'postponed';
  appointment.specialistNote = specialistNote;

  await appointment.save();
  res.status(200).json(appointment);
});

/**
 * @swagger
 * /appointments/{id}/cancel:
 *   patch:
 *     summary: Cancel an existing appointment
 *     description: Cancel an existing appointment
 *     tags: [Appointments]
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
 *             $ref: '#/components/schemas/UpdateAppointment'
 *     responses:
 *       '200':
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       '404':
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * @swagger
 * components:
 *   schemas:
 *     UpdateAppointment:
 *       type: object
 *       properties:
 *         specialistNote:
 *           type: string
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         day:
 *           type: string
 *           format: date-time
 *         time:
 *           type: string
 *         status:
 *           type: string
 *         consultationReason:
 *           type: string
 *         appointmentDuration:
 *           type: string
 *         isTakingMeds:
 *           type: boolean
 *         hasAllergy:
 *           type: boolean
 *         focusArea:
 *           type: string
 *         specialistNote:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */
const cancelAppointment = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;
  const { specialistNote } = req.body;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  appointment.status = 'canceled';
  appointment.specialistNote = specialistNote;

  await appointment.save();
  res.status(200).json(appointment);
});

/**
 * @swagger
 * /appointments/{id}/approve:
 *   patch:
 *     summary: Approve an existing appointment
 *     description: Approve an existing appointment
 *     tags: [Appointments]
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
 *               $ref: '#/components/schemas/Appointment'
 *       '404':
 *         description: Appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       '400':
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         day:
 *           type: string
 *           format: date-time
 *         time:
 *           type: string
 *         status:
 *           type: string
 *         consultationReason:
 *           type: string
 *         appointmentDuration:
 *           type: string
 *         isTakingMeds:
 *           type: boolean
 *         hasAllergy:
 *           type: boolean
 *         focusArea:
 *           type: string
 *         specialistNote:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */
const approveAppointment = catchAsync(async (req, res, next) => {
  const appointmentId = req.params.id;

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }

  appointment.status = 'upcoming';

  await appointment.save();
  res.status(200).json(appointment);
});

const createAppointment = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(req.user._id);
  const { doctor: specialistId, time, day } = req.body;
  if (!user) return next(new AppError('There is no user, with that ID', 404));
  const { name, email } = user;
  const friendlyDate = format(day, 'EEEE, MMMM d, yyyy');

  if (!specialistId) {
    return next(new AppError('Please provide a valid specialist ID', 400));
  }

  const specialist = await Specialist.findById(specialistId);

  if (!specialist) {
    return next(new AppError('No specialist matching that ID was found', 400));
  }

  const newDocument = await Appointment.create({
    ...req.body,
    doctor: specialistId,
    patient: userId,
  });

  try {
    const response = await sendEmail({
      recipientEmail: email,
      title: 'Appointment update',
      template_data: {
        username: name,
        time,
        date: friendlyDate,
        specialist_name: `${specialist.firstName} ${specialist.lastName}`,
      },
      templateId: EMAIL_TEMPLATE_IDS.APPOINTMENT_CONFIRMATION,
    });

    if (response[0].statusCode !== 202) {
      return next(
        new AppError('Something went wrong while sending the email', 500)
      );
    }

    res.status(201).json({
      status: 'success',
      data: {
        newDocument,
      },
    });
  } catch (e) {
    return next(
      new AppError('There was an error creating the appointment', 500)
    );
  }
});

// const createAppointmentAsSpecialist = catchAsync(async (req, res, next) => {
//   const specialistId = req.user._id;
//   const specialist = await Specialist.findById(req.user._id);
//   const { userId, time, day } = req.body;
//   if (!specialist)
//     return next(new AppError('There is no specialist, with that ID', 404));
//   const { firstName, lastName, email } = specialist;
//   const friendlyDate = format(day, 'EEEE, MMMM d, yyyy');

//   if (!userId) {
//     return next(new AppError('Please provide a valid specialist ID', 400));
//   }

//   const user = await User.findById(userId);

//   if (!user) {
//     return next(new AppError('No user matching that ID was found', 400));
//   }

//   const newDocument = await Appointment.create({
//     ...req.body,
//     doctor: specialistId,
//     patient: userId,
//   });

//   try {
//     const response = await sendEmail({
//       recipientEmail: email,
//       title: 'Appointment update',
//       template_data: {
//         username: `${specialist.firstName} ${specialist.lastName}`,
//         time,
//         date: friendlyDate,
//         specialist_name: `${specialist.firstName} ${specialist.lastName}`,
//       },
//       templateId: EMAIL_TEMPLATE_IDS.APPOINTMENT_CONFIRMATION,
//     });

//     if (response[0].statusCode !== 202) {
//       return next(
//         new AppError('Something went wrong while sending the email', 500)
//       );
//     }

//     res.status(201).json({
//       status: 'success',
//       data: {
//         newDocument,
//       },
//     });
//   } catch (e) {
//     return next(
//       new AppError('There was an error creating the appointment', 500)
//     );
//   }
// });

module.exports = {
  createAppointment,
  deleteAppointment,
  updateAppointment,
  getAppointment,
  getAppointments,
  getMyAppointments,
  getMyAppointmentsAsSpecialist,
  rescheduleAppointment,
  cancelAppointment,
  approveAppointment,
  createBlankAppointment,
  getMyDoctors,
};
