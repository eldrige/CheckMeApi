const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware.js');

const router = express.Router();
const {
  createAppointment,
  deleteAppointment,
  updateAppointment,
  getAppointment,
  getAppointments,
  getMyAppointments,
  getMyAppointmentsAsSpecialist,
  rescheduleAppointment,
  cancelAppointment,
  approveAppointment,
  createBlankAppointment,
  getMyDoctors,
} = require('../controllers/appointmentController');

router.use(protect);

router.route('/').post(createAppointment);
router.route('/new').post(createBlankAppointment);
router.route('/specialist').get(getMyAppointmentsAsSpecialist);
router.route('/my-appointments').get(getMyAppointments);
router.route('/my-doctors').get(getMyDoctors);
router.route('/:id').get(getAppointment);
router.route('/:id').patch(updateAppointment);
router.route('/:id/reschedule').patch(rescheduleAppointment);
router.route('/:id/cancel').patch(cancelAppointment);
router.route('/:id/approve').patch(approveAppointment);

router.use(restrictTo('admin'));
router.route('/:id').delete(deleteAppointment);
router.route('/').get(getAppointments);

module.exports = router;
