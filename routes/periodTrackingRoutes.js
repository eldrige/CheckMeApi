const express = require('express');
const { protect } = require('../middleware/authMiddleware.js');

const router = express.Router();
const {
  getFertileWindow,
  savePeriodData,
  getNextPeriod,
  updatePeriodData,
  getCycleDayAndPregnancyChances,
} = require('../controllers/periodTrackingController.js');

router.use(protect);

router.route('/fertile-window').get(getFertileWindow);
router.route('/cycle-info').get(getCycleDayAndPregnancyChances);
router.route('/next-period').get(getNextPeriod);
router.route('/update-period').patch(updatePeriodData);
router.route('/save-period').post(savePeriodData);

module.exports = router;
