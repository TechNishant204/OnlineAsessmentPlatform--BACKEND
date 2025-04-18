const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { auth, isAdmin, isStudent } = require("../middlewares/auth");
// const logger = require("../utils/loggerUtils");
const {
  getCurrentProfileByUserId,
  updateProfileByUserId,
  updateAccount,
  getStudentProfileByUserId,
  getAllStudentProfiles,
} = require("../controllers/profileController");

// @route   GET api/profile/me
// @desc    Get current user's profile
// @access  Private
router.get("/me", auth, getCurrentProfileByUserId);

// @route   PUT api/profile
// @desc    Update or create user profile
// @access  Private
router.put("/update", auth, updateProfileByUserId);

// @route   PUT api/profile/account
// @desc    Update user account information
// @access  Private
router.put(
  "/account",
  [
    auth,
    [
      check("name", "Name cannot be empty if provided").optional().notEmpty(),
      check("email", "Please include a valid email").optional().isEmail(),
      check("phone", "Phone must be a valid number").optional().isNumeric(),
    ],
  ],
  updateAccount
);

// @route   GET api/profile/student/:id
// @desc    Get student profile by ID
// @access  Private (Admin only)
router.get("/student/:id", [auth, isAdmin], getStudentProfileByUserId);

// @route   GET api/profile/students
// @desc    Get all student profiles
// @access  Private (Admin only)
router.get("/students", [auth, isAdmin], getAllStudentProfiles);

module.exports = router;
