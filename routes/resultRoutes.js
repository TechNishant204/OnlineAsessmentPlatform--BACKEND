// src/routes/resultRoutes.js
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { auth, isStudent, isAdmin } = require("../middlewares/auth");
const {
  createResult,
  getAllResults,
  getExamAnalytics,
  getMyResults,
  // getStudentResults,
  getExamResultsByExamId,
  getResultByResultId,
  deleteResult,
} = require("../controllers/resultController");

// @route   POST api/results
// @desc    Create a new result
// @access  Private
router.post(
  "/",
  [
    auth,
    isStudent,
    check("examId", "Exam ID is required").not().isEmpty(),
    check("answers", "Answers are required").isArray({ min: 1 }),
    check("startTime", "Start time is required").not().isEmpty(),
    check("proctorFlags", "Proctor flags must be an array")
      .optional()
      .isArray(),
  ],
  createResult
);

// @route GET api/results/analytics
// @desc Get analytics for exams created by instructor
// @access Private
router.get("/analytics", [auth, isAdmin], getExamAnalytics);
// @route GET api/result
// @desc Get all results
// @access Private (Admin)
router.get("/", [auth, isAdmin], getAllResults);

// @route GET api/results/me
// @desc Get all results for the logged-in student
// @access Private
router.get("/my-result", [auth, isStudent], getMyResults);

// @route GET api/result/:id
// @desc Get result by ID
// @access Private
router.get("/:id", auth, getResultByResultId);

// @route GET api/result/exam/:examId
// @desc Get all results for a specific exam by examId
// @access Private (Admin)
router.get("/exam/:examId", [auth, isAdmin], getExamResultsByExamId);

// @route DELETE api/results/:id
// @desc Delete a result
// @access Private (Admin)
router.delete("/:id", [auth, isAdmin], deleteResult);

// @route GET api/results/student
// @desc Get results for the current student
// @access Private
// router.get("/student", [auth, isStudent], getStudentResults);

module.exports = router;
