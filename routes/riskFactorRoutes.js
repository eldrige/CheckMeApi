const express = require('express');
const { restrictTo } = require('../middleware/authMiddleware.js');

const router = express.Router();
const {
  createRiskFactor,
  deleteRiskFactor,
  updateRiskFactor,
  getRiskFactor,
  getRiskFactors,
} = require('../controllers/riskFactorController.js');

router.route('/').get(getRiskFactors);
router.route('/:id').get(getRiskFactor);
router.route('/').post(createRiskFactor);

// router.use(restrictTo('admin'));
router.route('/:id').delete(deleteRiskFactor).patch(updateRiskFactor);

module.exports = router;
