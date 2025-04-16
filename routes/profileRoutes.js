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
router.put(
  "/update",
  [
    auth,
    [
      // General profile fields
      check("bio", "Bio cannot be empty if provided").optional().notEmpty(),

      // Education fields
      check("education.institution", "Institution cannot be empty if provided")
        .optional()
        .notEmpty(),
      check("education.degree", "Degree cannot be empty if provided")
        .optional()
        .notEmpty(),
      check(
        "education.fieldOfStudy",
        "Field of study cannot be empty if provided"
      )
        .optional()
        .notEmpty(),
      check(
        "education.graduationYear",
        "Graduation year must be between 1900 and 2100"
      )
        .optional()
        .isInt({ min: 1900, max: 2100 }), // Enhanced validation

      // Admin-specific fields (based on your snippet)
      check("adminInfo.companyName", "Company name cannot be empty if provided")
        .optional()
        .notEmpty(),
      check("adminInfo.companySize", "Company size must be valid")
        .optional()
        .isIn(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]),
      check("adminInfo.jobTitle", "Job title cannot be empty if provided")
        .optional()
        .notEmpty(),
      check("adminInfo.country", "Country cannot be empty if provided")
        .optional()
        .notEmpty(),
      check("adminInfo.companyType", "Company type must be valid")
        .optional()
        .isIn([
          "startup",
          "serviceBased",
          "productBased",
          "enterprise",
          "other",
        ]),

      // Social links
      check("socialLinks.website", "Website must be a valid URL")
        .optional()
        .isURL({ require_protocol: true }), // Enhanced URL validation
      check("socialLinks.linkedin", "LinkedIn must be a valid URL")
        .optional()
        .isURL({ require_protocol: true }),
      check("socialLinks.github", "GitHub must be a valid URL")
        .optional()
        .isURL({ require_protocol: true }),
    ],
  ],
  updateProfileByUserId
);

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
