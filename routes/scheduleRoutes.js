const express = require('express');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();
const {
  createSchedule,
  deleteSchedule,
  updateSchedule,
  getSchedule,
  getMySchedules,
  addOverrideToSchedule,
  getDoctorSchedules,
} = require('../controllers/scheduleController');

router.use(protect);

router.route('/').get(getMySchedules);
router.route('/:id').get(getSchedule);
router.route('/doctor/:specialist_id').get(getDoctorSchedules);
router.route('/').post(createSchedule);
router.route('/:id/overrides').post(addOverrideToSchedule);

router.route('/:id').delete(deleteSchedule).patch(updateSchedule);

module.exports = router;
