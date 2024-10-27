const mongoose = require('mongoose');
const { Schema } = mongoose;

const overrideSchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    timeZone: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      enum: ['Online', 'On-site'],
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const availabilityIntervalSchema = new Schema(
  {
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: {
      transform: function (doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

const scheduleSchema = new Schema(
  {
    doctor: {
      type: Schema.Types.ObjectId,
      ref: 'Specialist',
      required: true,
    },
    daysOfWeek: {
      type: {
        Monday: [availabilityIntervalSchema],
        Tuesday: [availabilityIntervalSchema],
        Wednesday: [availabilityIntervalSchema],
        Thursday: [availabilityIntervalSchema],
        Friday: [availabilityIntervalSchema],
        Saturday: [availabilityIntervalSchema],
        Sunday: [availabilityIntervalSchema],
      },
      required: true,
    },
    timezone: {
      type: String,
    },
    appointmentTypes: {
      type: [String],
      enum: ['Consultation', 'Follow-up', 'Emergency', 'Check-up'],
      default: ['Consultation'],
    },
    notes: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    location: {
      type: String,
      enum: ['Online', 'On-site'],
      required: true,
    },
    title: String,
    overrides: [overrideSchema],
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

//middleware to make sure doctors information is populated before sending the response
scheduleSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'doctor',
    select: 'firstName lastName qualification',
  });
  next();
});

//middleware to check if the start time is before the end time & the doctor information is added before saving the data
scheduleSchema.pre('save', function (next) {
  if (this.startTime >= this.endTime) {
    return next(new Error('Start time must be before end time'));
  }

  this.populate({
    path: 'doctor',
    select: 'firstName lastName qualification',
  });

  next();
});

const Schedule = mongoose.model('Schedule', scheduleSchema);

module.exports = Schedule;
