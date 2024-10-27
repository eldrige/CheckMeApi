const Specialist = require('../models/Specialist');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/sendGridEmail');
const { EMAIL_TEMPLATE_IDS } = require('../constants');

/**
 * @swagger
 * paths:
 *   /requests/{id}/approve:
 *     patch:
 *       summary: Approve a specialist
 *       tags: [Specialist-Verification]
 *       description: Approves a specialist's account and sets their status to 'approved'.
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema:
 *             type: string
 *             format: uuid
 *       responses:
 *         '200':
 *           description: Successful operation
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: success
 *                   message:
 *                     type: string
 *                     example: Specialist account approved
 *         '400':
 *           description: Invalid specialist ID
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Error'
 *         '404':
 *           description: Specialist not found
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Error'
 *
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           example: Specialist not found
 */
const approveSpecialist = catchAsync(async (req, res, next) => {
  const specialistId = req.params.id;

  if (!specialistId) {
    return next(new AppError('Please provide a valid specialist ID', 400));
  }

  // Use findOneAndUpdate to avoid race conditions
  const specialist = await Specialist.findOneAndUpdate(
    { _id: specialistId, status: { $ne: 'approved' } },
    { active: true, status: 'approved' },
    { new: true, runValidators: true }
  );

  if (!specialist) {
    return next(new AppError('Specialist not found or already approved', 404));
  }

  // Extract email, firstName, and lastName from the specialist object
  const { email, firstName, lastName } = specialist;

  //* Send email to specialist about account approval
  const response = await sendEmail({
    recipientEmail: email,
    title: 'Account approval',
    templateId: EMAIL_TEMPLATE_IDS.ACCOUNT_APPROVAL,
    template_data: {
      username: `${firstName} ${lastName}`,
    },
  });

  if (!response || response[0]?.statusCode !== 202) {
    return next(
      new AppError('Something went wrong while sending the email', 500)
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Specialist account approved',
  });
});

/**
 * @swagger
 * paths:
 *   /requests/{id}/decline:
 *     patch:
 *       summary: Decline a specialist
 *       tags: [Specialist-Verification]
 *       description: Declines a specialist's account and sets their status to 'rejected'. The request body should include the target fields and a note for the rejection.
 *       parameters:
 *         - in: path
 *           name: id
 *           required: true
 *           schema:
 *             type: string
 *             format: uuid
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 targetFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                 note:
 *                   type: string
 *       responses:
 *         '200':
 *           description: Successful operation
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: success
 *                   message:
 *                     type: string
 *                     example: Specialist account rejected
 *         '400':
 *           description: Invalid request
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Error'
 *         '404':
 *           description: Specialist not found
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: '#/components/schemas/Error'
 *
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           example: Specialist not found
 */
const declineSpecialist = catchAsync(async (req, res, next) => {
  const specialistId = req.params.id;
  const { targetFields, note } = req.body;

  // Validate input
  if (!specialistId) {
    return next(new AppError('Please provide a valid specialist ID', 400));
  }
  if (!Array.isArray(targetFields) || targetFields.length === 0 || !note) {
    return next(
      new AppError('Please provide valid target fields and a note', 400)
    );
  }

  // Use findOneAndUpdate to avoid race conditions
  const specialist = await Specialist.findOneAndUpdate(
    { _id: specialistId, status: { $ne: 'rejected' } },
    {
      status: 'rejected',
      'feedback.targetFields': targetFields,
      'feedback.note': note,
    },
    { new: true, runValidators: true }
  );

  if (!specialist) {
    return next(new AppError('Specialist not found or already rejected', 404));
  }

  // Extract email, firstName, and lastName from the specialist object
  const { email, firstName, lastName } = specialist;

  // Send email to specialist about account rejection
  const response = await sendEmail({
    recipientEmail: email,
    title: 'Account Rejection',
    templateId: EMAIL_TEMPLATE_IDS.ACCOUNT_REJECTION,
    template_data: {
      username: `${firstName} ${lastName}`,
      note,
    },
  });

  if (!response || response[0]?.statusCode !== 202) {
    // Log the error but don't stop the process
    console.error('Failed to send rejection email:', response);
  }

  res.status(200).json({
    status: 'success',
    message: 'Specialist account rejected',
  });
});

/**
 * @swagger
 * paths:
 *   /requests:
 *     get:
 *       summary: Get pending and rejected specialist accounts
 *       tags: [Specialist-Verification]
 *       description: Retrieves a list of specialist accounts with a status of 'pending' or 'rejected'.
 *       responses:
 *         '200':
 *           description: Successful operation
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: success
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Specialist'
 *
 * components:
 *   schemas:
 *     Specialist:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         status:
 *           type: string
 *           enum: ['pending', 'approved', 'rejected']
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const getPendingAccounts = catchAsync(async (req, res, next) => {
  const specialists = await Specialist.find({
    status: { $in: ['pending', 'rejected'] },
  })
    .sort({ updatedAt: -1 })
    .select('-password -__v -otp -otpExpires -id');

  res.status(200).json({
    status: 'success',
    data: specialists,
  });
});

/**
 * @swagger
 * paths:
 *   /requests/approved:
 *     get:
 *       summary: Get validated specialist accounts
 *       tags: [Specialist-Verification]
 *       description: Retrieves a list of specialist accounts with that have been validated.
 *       responses:
 *         '200':
 *           description: Successful operation
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     example: success
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/Specialist'
 *
 * components:
 *   schemas:
 *     Specialist:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         status:
 *           type: string
 *           enum: ['pending', 'approved', 'rejected']
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */
const getValidatedAccounts = catchAsync(async (req, res, next) => {
  const specialists = await Specialist.find({
    status: { $in: ['approved'] },
  })
    .sort({ updatedAt: -1 })
    .select('-password -__v -otp -otpExpires -id');

  res.status(200).json({
    status: 'success',
    data: specialists,
  });
});

module.exports = {
  declineSpecialist,
  approveSpecialist,
  getPendingAccounts,
  getValidatedAccounts,
};
