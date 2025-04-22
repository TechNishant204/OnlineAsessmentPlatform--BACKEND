const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { auth, isAdmin, isStudent } = require("../middlewares/auth");
// const logger = require("../utils/loggerUtils");
const {
  getCurrentProfileByUserId,
  updateProfileByUserId,
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





module.exports = router;
