const express = require('express');
const { protect, restrictTo } = require('../middleware/authMiddleware.js');

const router = express.Router();
const {
  approveSpecialist,
  getPendingAccounts,
  declineSpecialist,
  getValidatedAccounts,
} = require('../controllers/verificationRequestsController');

router.use(protect);
router.use(restrictTo('admin'));

router.route('/').get(getPendingAccounts);
router.route('/approved').get(getValidatedAccounts);
router.route('/:id/approve').patch(approveSpecialist);
router.route('/:id/decline').patch(declineSpecialist);

module.exports = router;
