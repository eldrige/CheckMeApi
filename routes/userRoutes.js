const express = require('express');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const {
  signUp,
  login,
  forgotPassword,
  resetPassword,
  updatePassword,
  sendOTP,
  checkOTP,
  signUpViaPassword,
  signUpViaGoogle,
  loginViaGoogle,
  registerViaGoogle,
  confirmAccountCreation,
  registerAdminUser,
} = require('../controllers/authController');
const {
  updateMe,
  deleteMe,
  changeAvatar,
  deleteUser,
  updateUser,
  getUsers,
  getUser,
  getMe,
  updateMenstrualCycleInfo,
  createMedication,
  updateMedication,
  deleteMedication,
  updateVitals,
  getMedications,
  getMedication,
  getBreastVitals,
  deleteBreastVital,
  updateBreastVitals,
  registerUserAndVitals,
} = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/signup', signUp);
router.post('/signup/admin', registerAdminUser);
router.post('/signUpWithPassword', signUpViaPassword);
router.get('/auth-google/callback', signUpViaGoogle);
router.post('/login', login);
router.post('/login-via-google', loginViaGoogle);
router.post('/register-via-google', registerViaGoogle);
router.post('/sendOTP', sendOTP);
router.post('/checkOTP', checkOTP);
router.post('/confirm-account', confirmAccountCreation);
router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);

router.use(protect); // mount protect middleware, so all routes after this should get it

router
  .post('/medications', createMedication)
  .get('/medications', getMedications);
router
  .patch('/medications/:id', updateMedication)
  .delete('/medications/:id', deleteMedication)
  .get('/medications/:id', getMedication);

router
  .get('/:id/breast-vitals', getBreastVitals)
  .delete('/:id/breast-vitals/:vitalId', deleteBreastVital)
  .post('/:id/breast-vitals', updateBreastVitals);

router.patch('/updateMyPassword', updatePassword);
router.patch('/updateMe', updateMe);
router.patch('/updateMenstrualCycle', updateMenstrualCycleInfo);
router.patch('/update-avatar', upload.single('avatar'), changeAvatar);
router.patch('/vitals', updateVitals);
router.delete('/deleteMe', deleteMe);
router.route('/me').get(getMe);
router.post('/new-breast-vitals', registerUserAndVitals);

router.route('/:id').get(getUser);

/**
 * Admin routes
 */

// router.use(restrictTo('admin'));

// router.route('/').get(getUsers);
// router.patch(updateUser).delete(deleteUser);

module.exports = router;
