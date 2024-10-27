const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const generateSignedURL = require('../utils/generateSignedURL');
const ONE_HOUR = 60 * 60 * 1000;
const { Schema } = mongoose;

const addressSchema = Schema({
  country: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  zipCode: {
    type: String,
  },
  street: {
    type: String,
  },
});

const Address = mongoose.model('Address', addressSchema);

const specialistSchema = Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Please tell us your name'],
    },
    lastName: {
      type: String,
    },
    gender: {
      type: String,
      default: 'Male',
    },
    qualification: {
      type: String,
      default: 'MD',
    },
    licenceNumber: {
      type: String,
    },
    licenceNumberObtentionDate: {
      type: Date,
    },
    license: {
      type: String,
    },
    hospital: {
      type: String,
    },
    town: {
      type: String,
    },
    speciality: {
      type: String,
      default: 'General Practitioner',
    },
    telephone: {
      type: String,
      required: [true, 'Please provide your telephone number'],
      unique: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minLength: 8,
      select: false,
    },
    active: {
      type: Boolean,
      default: true,
      // select: false,
    },
    degreeObtentionDate: {
      type: Date,
    },
    location: {
      type: String,
    },
    bio: String,
    avatar: String,
    passwordChangedAt: Date,
    birthDate: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    address: {
      type: Address.schema,
    },
    yearsOfExperience: Number,
    maritalStatus: {
      type: String,
      default: 'Single',
    },
    previousUniversity: {
      type: String,
    },
    lengthOfMedicalTraining: Number,
    role: String,
    workTitle: String,
    startedWorkingDate: {
      type: Date,
      min: new Date('1970-01-01'),
      max: new Date(),
    },
    currentWorkPlace: String,
    roleDescription: String,
    isStillEmployed: {
      type: Boolean,
      default: true,
    },
    otp: {
      type: String,
      // select: false,
    },
    otpExpires: {
      type: Date,
      // select: false,
    },
    secondaryEmail: String,
    secondaryPhone: String,
    accountVisibility: {
      type: String,
      default: 'public',
    },
    status: {
      type: String,
      default: 'pending',
      enum: {
        values: ['pending', 'approved', 'rejected'],
      },
    },
    feedback: {
      targetFields: { type: [String] },
      note: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true }, // include virtual properties in JSON output
    toObject: { virtuals: true }, // include virtual properties in object output
  }
);

// Pppties not saved to the db, but obtainable upon querying && derived from saved fields
specialistSchema.virtual('username').get(function () {
  return this.firstName + ' ' + this.lastName;
});

specialistSchema.virtual('avatarURL').get(function () {
  if (this.avatar) {
    return `https://check-me-profile-pictures.s3.eu-north-1.amazonaws.com/${this.avatar}`;
  }
});

specialistSchema.pre('save', async function (next) {
  if (!this.isModified('password')) next();

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
  next();
});

specialistSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// specialistSchema.pre('find', async function (next) {
//   // the this keyword, points to the current query
//   console.log(this.avatar, 'When we run our query');
//   if (this.avatar) {
//     this.avatar = await generateSignedURL(this.avatar);
//   }

//   next();
// });

// Instance methods (Methods we define ,made available to all documents)
specialistSchema.methods.checkPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

specialistSchema.methods.hasChangedPassword = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    let result = jwtTimestamp < changedTimeStamp;
    return result;
    // compare entered jwt timestamp, to the timestamp of user changing password
  }
  return false;
};

specialistSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + ONE_HOUR;
  return resetToken;
};

specialistSchema.methods.createOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;

  this.otpExpires = Date.now() + ONE_HOUR;
  return otp;
};

const Specialist = mongoose.model('Specialist', specialistSchema);

module.exports = Specialist;
