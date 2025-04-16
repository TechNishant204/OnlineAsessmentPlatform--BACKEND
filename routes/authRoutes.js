const express = require("express");
const router = express.Router();

const {
  forgotPassword,
  verifyResetToken,
  resetPassword,
  registerUser,
  loginUser,
} = require("../controllers/authController");
const { auth, isAdmin, isStudent } = require("../middlewares/auth");
const {
  registerValidator,
  loginValidator,
} = require("../middlewares/authValidators");

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post("/register", registerValidator, registerUser);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post("/login", loginValidator, loginUser);

/**
 * @route   POST api/auth/forgot-password
 * @desc    Initiate password reset process by sending reset link to user's email
 * @access  Public
 */
router.post("/forgot-password", forgotPassword);

/**
 * @route   GET api/auth/reset-password/:token
 * @desc    Verify password reset token and redirect to reset password page
 * @access  Public
 * @param   {string} token - The password reset token from the email link
 */
router.get("/reset-password/:token", verifyResetToken);

/**
 * @route   POST api/auth/reset-password
 * @desc    Reset user's password with valid token
 * @access  Public
 */
router.post("/reset-password", resetPassword);

// @route   GET api/auth/me
// @desc    Get user profile
// @access  Private
// router.get("/me", auth, authController.getUserProfile);

module.exports = router;
