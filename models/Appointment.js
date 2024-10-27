const mongoose = require('mongoose');
const { Schema } = mongoose;
const { format, addMinutes } = require('date-fns');

const reviewSchema = mongoose.Schema(
  {
    rating: {
      type: Number,
      required: true,
      enum: {
        values: [1, 2, 3, 4, 5],
      },
    },
    comment: { type: String },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const appointmentSchema = Schema(
  {
    title: {
      type: String,
    },
    day: Date,
    time: String,
    status: {
      type: String,
      enum: {
        values: ['pending', 'completed', 'postponed', 'canceled', 'upcoming'],
      },
      default: 'pending',
    },
    consultationReason: {
      type: String,
      required: [true, 'Please provide a reason for your appointment'],
    },
    patient: {
      type: Schema.ObjectId,
      ref: 'User',
    },
    doctor: {
      required: [true, 'The appointment must be to a Doctor'],
      type: Schema.ObjectId,
      ref: 'Specialist',
    },
    appointmentDuration: {
      type: String,
      enum: {
        values: ['15', '30', '45', '60'],
      },
      default: '30',
    },
    videoCallLink: {
      type: String,
    },
    isFirstVisit: {
      type: Boolean,
      default: true,
    },
    isTakingMeds: {
      type: Boolean,
      default: false,
    },
    hasAllergy: {
      type: Boolean,
      default: false,
    },
    focusArea: {
      type: String,
    },
    uploads: {
      type: String,
    },
    consultationType: {
      type: String,
      enum: {
        values: ['online', 'on-site'],
      },
      default: 'online',
    },
    specialistNote: String,
    reviews: [reviewSchema],
    patientSex: String,
    patientDateOfBirth: Date,
    hasDisability: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // include virtual properties in JSON output
    toObject: { virtuals: true }, // include virtual properties in object output
  }
);

appointmentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'patient',
    select: 'name email avatar gender birthDate avatarURL',
  });
  this.populate({
    path: 'doctor',
    select: 'firstName lastName qualification avatar',
  });
  next();
});

function calculateEndTime(startTime, duration) {
  // Parse the start time
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const start = new Date();
  start.setHours(startHours);
  start.setMinutes(startMinutes);

  // Calculate the end time
  const end = addMinutes(start, duration);

  // Format the end time as a string
  return format(end, 'HH:mm');
}

// Virtual property for endTime
appointmentSchema.virtual('endTime').get(function () {
  return calculateEndTime(this.time, this.appointmentDuration);
});

appointmentSchema.pre('save', async function (next) {
  this.populate({
    path: 'patient',
    select: 'name email',
  });
  this.populate({
    path: 'doctor',
    select: 'firstName lastName qualification',
  });
  next();
});

// appointmentSchema.pre(/^find/, function (next) {
//   this.endTime = calculateEndTime(this.time, this.appointmentDuration);
//   next();
// });

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
