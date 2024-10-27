const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/User');
const Specialist = require('../models/Specialist');
const config = require('../config/config');

const protect = catchAsync(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = await promisify(jwt.verify)(token, config.JWT_SECRET); // the payload foudn in the token
      const freshUser =
        (await User.findById(decoded.id)) ||
        (await Specialist.findById(decoded.id));

      if (!freshUser)
        return next(
          new AppError('The user belonging to this token does not exist', 401)
        );

      const userHasChangedPasswordRecently = await freshUser.hasChangedPassword(
        decoded.iat
      );

      if (userHasChangedPasswordRecently) {
        return next(
          new AppError(
            'User recently changed password, Please login again',
            401
          )
        );
      }
      req.user = freshUser;
      next();
    } catch (error) {
      return next(
        new AppError(
          'Something went wrong, Please try logging to the app again',
          400
        )
      );
    }
  }

  if (!token) return next(new AppError('You are not logged in', 401));
});

const restrictTo = (...roles) =>
  catchAsync(async (req, res, next) => {
    console.log(req.user.role, 'From authmiddlewware');
    if (!roles.includes(req.user.role))
      return next(new AppError('You do not have access to this section.', 403));
    next();
  });

module.exports = {
  protect,
  restrictTo,
};
