const Hospital = require('../models/Hospital');

const {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
} = require('./handlerFactory');

const getHospitals = getAll(Hospital);
const getHospital = getOne(Hospital);
const deleteHospital = deleteOne(Hospital);
const updateHospital = updateOne(Hospital);
const createHospital = createOne(Hospital);

module.exports = {
  createHospital,
  deleteHospital,
  updateHospital,
  getHospital,
  getHospitals,
};
