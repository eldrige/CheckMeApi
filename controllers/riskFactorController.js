const RiskFactor = require('../models/RiskFactor.js');

const {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
} = require('./handlerFactory');

const getRiskFactors = getAll(RiskFactor);
const getRiskFactor = getOne(RiskFactor);
const deleteRiskFactor = deleteOne(RiskFactor);
const updateRiskFactor = updateOne(RiskFactor);
const createRiskFactor = createOne(RiskFactor);

module.exports = {
  createRiskFactor,
  deleteRiskFactor,
  updateRiskFactor,
  getRiskFactor,
  getRiskFactors,
};
