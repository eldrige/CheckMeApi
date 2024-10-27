const mongoose = require('mongoose');
const { Schema } = mongoose;

const riskFactorSchema = Schema(
  {
    title: {
      type: String,
      required: [true, 'Please give your risk factor a title'],
    },
    description: String,
    color: {
      type: String,
    },
    image: String,
  },
  { timestamps: true }
);

const RiskFactor = mongoose.model('RiskFactor', riskFactorSchema);

module.exports = RiskFactor;
