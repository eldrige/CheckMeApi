const express = require('express');
const { uploadToCloudinary } = require('../controllers/uploadController');

// const { protect, restrictTo } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', uploadToCloudinary);

// router.use(protect); // mount protect middleware, so all routes after this should get it

// router.patch('/updateMyPassword', updatePassword);
// router.patch('/updateMe', updateMe);
// router.delete('/deleteMe', deleteMe);
// router.route('/me').get(getMe, getUser);

/**
 * Admin routes
 */

// router.use(restrictTo('admin'));
// router.route('/').get(getUsers);
// router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
