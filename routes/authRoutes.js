const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const authController = require("../controllers/authController");
const auth = require("../middlewares/auth");
const {
  registerValidator,
  loginValidator,
} = require("../middlewares/authValidators");
// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post("./register", registerValidator, authController.registerUser);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public

router.post("/login", loginValidator, authController.loginUser);

// @route   GET api/auth/me
// @desc    Get user profile
// @access  Private
router.get("/me", auth, authController.getUserProfile);

module.exports = router;
