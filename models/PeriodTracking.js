const mongoose = require('mongoose');
const { Schema } = mongoose;
const { addDays, subDays } = require('date-fns');

const periodTrackingSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastPeriodStartDate: {
      type: Date,
      required: true,
    },
    lastPeriodEndDate: {
      type: Date,
      //   required: true,
    },
    periodLength: {
      type: Number, // Length of the period (usually 3 - 7 days)
      required: true,
    },
    cycleLength: {
      type: Number, // Length of the cycle (in days)
      default: 28, // Default to 28 days unless the user specifies otherwise
    },
    ovulationDay: {
      type: Date,
    },
    fertileWindowStart: {
      type: Date,
    },
    fertileWindowEnd: {
      type: Date,
    },
    nextPeriodStartDate: {
      type: Date,
    },
  },
  { timestamps: true }
);
periodTrackingSchema.methods.getCurrentCycleDay = function () {
  const today = new Date();
  const daysSinceLastPeriod = Math.floor(
    (today - this.lastPeriodStartDate) / (1000 * 60 * 60 * 24)
  );
  return (daysSinceLastPeriod % this.cycleLength) + 1;
};

// Method to calculate pregnancy chances
periodTrackingSchema.methods.getPregnancyChances = function () {
  const currentCycleDay = this.getCurrentCycleDay();

  // Calculate the next period start date
  const nextPeriodStart = addDays(
    new Date(this.lastPeriodStartDate),
    this.cycleLength
  );

  // Calculate the ovulation day (cycleLength - 14)
  const ovulationDay = subDays(nextPeriodStart, 14);

  if (
    currentCycleDay >= ovulationDay - 3 &&
    currentCycleDay <= ovulationDay + 1
  ) {
    return 'High';
  } else if (
    currentCycleDay >= ovulationDay - 5 &&
    currentCycleDay <= ovulationDay + 2
  ) {
    return 'Medium';
  } else {
    return 'Low';
  }
};

const PeriodTracking = mongoose.model('PeriodTracking', periodTrackingSchema);

module.exports = PeriodTracking;
