const express = require('express');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const {
  getValidatedAccounts,
} = require('../controllers/verificationRequestsController');

const {
  signUp,
  login,
  getSpecialists,
  getSpecialist,
  // confirmAccountViaOtp,
  updateSpecialist,
  sendOTP,
  changeAvatar,
  confirmAccountCreation,
  uploadMedicalLicense,
  getMe,
  getMyPatients,
  updateSpecialistViaEmail,
} = require('../controllers/specialistController');

const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signUp);
router.post('/send-otp', sendOTP);
router.post('/confirm-account', confirmAccountCreation);
router.post('/login', login);

router.route('/').get(getValidatedAccounts);
router.patch('/update-info', updateSpecialistViaEmail);

router.patch('/update-avatar', upload.single('avatar'), changeAvatar);
router.patch(
  '/upload-medical-license',
  upload.single('license'),
  uploadMedicalLicense
);

router.use(protect);
router.route('/me').get(getMe);
router.route('/my-patients').get(getMyPatients);
router.get('/:id', getSpecialist);
router.patch('/update-me', updateSpecialist);

module.exports = router;
