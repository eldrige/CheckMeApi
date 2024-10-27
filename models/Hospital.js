const mongoose = require('mongoose');
const { Schema } = mongoose;
const validator = require('validator');

const hospitalSchema = Schema(
  {
    name: {
      type: String,
      required: [true, 'Please give your hospital a name'],
    },
    logo: String,
    country: {
      type: String,
    },
    town: String,
    category: {
      type: String,
      required: true,
      enum: {
        values: ['state', 'private', 'mission'],
      },
    },
    services: {
      type: [String],
      required: true,
      enum: [
        'chemotherapy',
        'immunotherapy',
        'surgery',
        'palliative care',
        'radiotherapy',
      ],
    },
    investigations: {
      type: [String],
    },
    registrationNumber: {
      type: String,
    },
    specialistServices: {
      type: [String],
      required: true,
      enum: {
        values: [
          'radiation oncologist',
          'medical oncologist',
          'surgical oncologist',
          'hematologist oncologist',
          'palliative care specialists',
        ],
      },
    },
    telephone: {
      required: true,
      type: String,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    workingHours: {
      type: String,
    },
    bio: {
      type: String,
    },
  },
  { timestamps: true }
);

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
