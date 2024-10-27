const PeriodTracking = require('../models/PeriodTracking');
const { addDays, subDays } = require('date-fns');
const catchAsync = require('../utils/catchAsync');

/**
 * @swagger
 * /period-tracking/save-period:
 *   post:
 *     summary: Save period data
 *     tags: [Period Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lastPeriodStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-10-01"
 *               lastPeriodEndDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-10-05"
 *               periodLength:
 *                 type: integer
 *                 example: 5
 *               cycleLength:
 *                 type: integer
 *                 example: 28
 *     responses:
 *       201:
 *         description: Period data saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Period data saved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PeriodTracking'
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
const savePeriodData = catchAsync(async (req, res, next) => {
  const { lastPeriodStartDate, lastPeriodEndDate, periodLength, cycleLength } =
    req.body;

  const periodData = new PeriodTracking({
    user: req.user._id, // Assuming you're using authentication
    lastPeriodStartDate,
    lastPeriodEndDate,
    periodLength,
    cycleLength: cycleLength || 28, // Default to 28 days if not provided
  });

  await periodData.save();

  res.status(201).json({
    message: 'Period data saved successfully',
    data: periodData,
  });
});

const getNextPeriod = catchAsync(async (req, res, next) => {
  // Fetch the user's period tracking data
  const periodData = await PeriodTracking.findOne({ user: req.user._id });

  if (!periodData) {
    return res
      .status(404)
      .json({ message: 'No period tracking data found for this user' });
  }

  // Calculate the next period start date
  const nextPeriodStart = addDays(
    new Date(periodData.lastPeriodStartDate),
    periodData.cycleLength
  );

  res.status(200).json({
    message: 'Next period calculated successfully',
    nextPeriodStart,
  });
});

/**
 * @swagger
 * /period-tracking/update-period:
 *   put:
 *     summary: Update period data
 *     tags: [Period Tracking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lastPeriodStartDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-10-01"
 *               lastPeriodEndDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-10-05"
 *               periodLength:
 *                 type: integer
 *                 example: 5
 *               cycleLength:
 *                 type: integer
 *                 example: 28
 *     responses:
 *       200:
 *         description: Period data updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Period data updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PeriodTracking'
 *       404:
 *         description: No period tracking data found for this user
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
const updatePeriodData = catchAsync(async (req, res, next) => {
  const { lastPeriodStartDate, lastPeriodEndDate, periodLength, cycleLength } =
    req.body;

  const periodData = await PeriodTracking.findOneAndUpdate(
    { user: req.user._id },
    {
      lastPeriodStartDate,
      lastPeriodEndDate,
      periodLength,
      cycleLength: cycleLength || 28,
    },
    { new: true }
  );

  if (!periodData) {
    return res
      .status(404)
      .json({ message: 'No period tracking data found for this user' });
  }

  res.status(200).json({
    message: 'Period data updated successfully',
    data: periodData,
  });
});

/**
 * @swagger
 * /period-tracking/fertile-window:
 *   get:
 *     summary: Get fertile window and ovulation day
 *     tags: [Period Tracking]
 *     responses:
 *       200:
 *         description: Fertile window and ovulation day calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Fertile window and ovulation day calculated successfully"
 *                 ovulationDay:
 *                   type: string
 *                   format: date
 *                   example: "2023-10-19"
 *                 fertileWindowStart:
 *                   type: string
 *                   format: date
 *                   example: "2023-10-14"
 *                 fertileWindowEnd:
 *                   type: string
 *                   format: date
 *                   example: "2023-10-19"
 *                 nextPeriodStart:
 *                   type: string
 *                   format: date
 *                   example: "2023-10-29"
 *       404:
 *         description: No period tracking data found for this user
 *       500:
 *         description: Internal server error
 */

const getFertileWindow = catchAsync(async (req, res, next) => {
  // Fetch the user's period tracking data
  const periodData = await PeriodTracking.findOne({ user: req.user._id });

  if (!periodData) {
    return res
      .status(404)
      .json({ message: 'No period tracking data found for this user' });
  }

  // Calculate the next period start date
  const nextPeriodStart = addDays(
    new Date(periodData.lastPeriodStartDate),
    periodData.cycleLength
  );

  // Calculate the ovulation day (cycleLength - 14)
  const ovulationDay = subDays(nextPeriodStart, 14);

  // Calculate the fertile window (5 days before ovulation until ovulation day)
  const fertileWindowStart = subDays(ovulationDay, 5);
  const fertileWindowEnd = ovulationDay;

  // Update the period tracking document with the calculated values
  periodData.ovulationDay = ovulationDay;
  periodData.fertileWindowStart = fertileWindowStart;
  periodData.fertileWindowEnd = fertileWindowEnd;
  periodData.nextPeriodStartDate = nextPeriodStart;

  await periodData.save();

  res.status(200).json({
    message: 'Fertile window and ovulation day calculated successfully',
    ovulationDay,
    fertileWindowStart,
    fertileWindowEnd,
    nextPeriodStart,
  });
});

/**
 * @swagger
 * /period-tracking/cycle-info:
 *   get:
 *     summary: Get cycle day and pregnancy chances
 *     tags: [Period Tracking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cycle information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pregnancyChances:
 *                   type: string
 *                   enum: [High, Medium, Low]
 *                   example: "High"
 *                 message:
 *                   type: string
 *                   example: "You are in your most fertile period. If you're trying to conceive, this is an optimal time. If you're not, ensure you're using reliable contraception"
 *                 currentCycleDay:
 *                   type: integer
 *                   example: 14
 *       404:
 *         description: No period tracking data found for this user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No period tracking data found for this user"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
const getCycleDayAndPregnancyChances = catchAsync(async (req, res, next) => {
  // Fetch the user's period tracking data
  const periodData = await PeriodTracking.findOne({ user: req.user._id });

  if (!periodData) {
    return res
      .status(404)
      .json({ message: 'No period tracking data found for this user' });
  }

  const currentCycleDay = periodData.getCurrentCycleDay();
  const pregnancyChances = periodData.getPregnancyChances();
  let message = '';

  // Generate descriptive text based on the pregnancy chances
  if (pregnancyChances === 'High') {
    message =
      "You are in your most fertile period. If you're trying to conceive, this is an optimal time. If you're not, ensure you're using reliable contraception";
  } else if (pregnancyChances === 'Medium') {
    message =
      "You're approaching or just past your most fertile period. Pregnancy is possible. Take appropriate precautions based on your goals.";
  } else {
    message =
      "You're in the latter part of your cycle. While pregnancy is less likely, it's still possible. Continue with your usual family planning methods.";
  }

  res.json({
    pregnancyChances,
    message,
    currentCycleDay,
  });
});

module.exports = {
  savePeriodData,
  getNextPeriod,
  updatePeriodData,
  getFertileWindow,
  getCycleDayAndPregnancyChances,
};
