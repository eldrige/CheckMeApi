const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');
const ONE_HOUR = 60 * 60 * 1000;
const { Schema } = mongoose;

// Vital Signs Schema
const vitalSignsSchema = new mongoose.Schema(
  {
    lumpsOnBreast: {
      present: { type: Boolean, required: true },
      size: { type: String }, // e.g., "small", "medium", "large"
    },
    nippleDischarges: {
      present: { type: Boolean, required: true },
      description: { type: String }, // e.g., "clear", "bloody", etc.
    },
    redness: {
      present: { type: Boolean, required: true },
      description: { type: String }, // e.g., "mild", "severe"
    },
    changeInSkinColor: {
      present: { type: Boolean, required: true },
      description: { type: String }, // e.g., "lightening", "darkening"
    },
    pain: {
      present: { type: Boolean, required: true },
      description: { type: String }, // e.g., "mild", "moderate", "severe"
    },
    invertedNipple: {
      present: { type: Boolean, required: true },
      description: { type: String }, // e.g., "mild", "moderate", "severe"
    },
    hasConsumedAlcohol: {
      present: { type: Boolean, required: true },
    },
    hasAppliedForeignOilOnBreast: {
      present: { type: Boolean, required: true },
    },
  },
  { timestamps: true }
);

const userSchema = Schema(
  {
    name: {
      type: String,
      required: [true, 'Please tell us your name'],
    },
    age: {
      type: Number,
    },
    socialId: {
      type: String,
      unique: true,
    },
    provider: {
      type: String,
      enum: ['google', 'facebook'],
    },
    telephone: {
      type: String,
      // required: [true, 'Please provide your telephone number'],
      unique: true,
      sparse: true,
    },
    email: {
      type: String,
      // required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email'],
      sparse: true,
    },
    password: {
      type: String,
      // required: [true, 'Please provide a password'],
      minLength: 8,
      select: false,
    },
    otp: {
      type: String,
      // select: false,
    },
    otpExpires: {
      type: Date,
      // select: false,
    },
    active: {
      type: Boolean,
      default: true,
      // select: false,
    },
    location: {
      type: String,
    },
    avatar: String,
    role: {
      type: String,
      enum: ['user', 'doctor', 'admin'],
      default: 'user',
    },
    passwordChangedAt: Date,
    birthDate: Date,
    bio: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    menstrualCycleInfo: {
      dayCount: {
        type: Number,
        min: 20,
        max: 35,
      },
      daysBledCount: {
        type: Number,
      },
      description: {
        type: String,
      },
    },
    savedArticles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article',
      },
    ],
    bodyTemperature: {
      type: String,
      default: '37',
    },
    bloodPressure: {
      type: String,
      default: '120/80',
    },
    weight: {
      type: String,
    },
    height: String,
    medications: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
        prescribedBy: { type: String, required: true },
        notes: { type: String },
        tag: { type: String },
      },
    ],
    title: {
      type: String,
    },
    maritalStatus: {
      type: String,
      default: 'Single',
    },
    gender: {
      type: String,
      default: 'Male',
    },
    profession: {
      type: String,
    },
    houseAddress: {
      type: String,
    },
    prescriptions: {
      type: [String],
    },
    vitalSigns: [vitalSignsSchema],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) next();

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.virtual('avatarURL').get(function () {
  if (this.avatar) {
    return `https://check-me-profile-pictures.s3.eu-north-1.amazonaws.com/${this.avatar}`;
  }
});

userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre(/^find/, function (next) {
//   // the this keyword, points to the current query
//   this.find({ active: { $ne: false } });
//   next();
// });

// Instance methods (Methods we define ,made available to all documents)
userSchema.methods.checkPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.hasChangedPassword = function (jwtTimestamp) {
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

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + ONE_HOUR;
  return resetToken;
};

userSchema.methods.createOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;

  this.otpExpires = Date.now() + ONE_HOUR;
  return otp;
};

const User = mongoose.model('User', userSchema);
const VitalSigns = mongoose.model('VitalSigns', vitalSignsSchema);

module.exports = User;
