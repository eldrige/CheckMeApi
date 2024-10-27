const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware.js');

const router = express.Router();
const {
  createHospital,
  deleteHospital,
  updateHospital,
  getHospital,
  getHospitals,
} = require('../controllers/hospitalController');

router.route('/').get(getHospitals);
router.route('/:id').get(getHospital);
router.route('/').post(createHospital);

router.use(restrictTo('admin'));
router.route('/:id').delete(deleteHospital).patch(updateHospital);

module.exports = router;
