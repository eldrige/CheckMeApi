const config = require('../config/config');
const jwt = require('jsonwebtoken');

const generateToken = (id) =>
  jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRY_DATE,
  });

module.exports = generateToken;
