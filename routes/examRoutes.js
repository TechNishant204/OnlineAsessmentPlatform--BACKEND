const express = require("express");
const router = express.Router();
const { check } = require("express-validator"); // Ensure express-validator is installed
const {
  createExam,
  getAllExams,
  getAvailableExams,
  getExamById,
  updateExam,
  deleteExam,
  enrollInExam,
} = require("../controllers/examController");
const { auth, isAdmin, isStudent } = require("../middlewares/auth"); // Ensure auth.js exports isAdmin

// Validate that required functions are defined
if (typeof auth !== "function") {
  throw new Error("auth middleware is not a function");
}
if (typeof isAdmin !== "function") {
  throw new Error("isAdmin middleware is not a function");
}
if (typeof createExam !== "function") {
  throw new Error("createExam controller is not a function");
}

// @route POST /api/exam/createExam
// @desc Create a new Exam
// @access Private (Admin Only)
router.post(
  "/createExam",
  [auth, isAdmin],
  [
    check("title", "Title is required").notEmpty(),
    check("description", "Description is required").notEmpty(),
    check("duration", "Duration is required").isNumeric(),
    check("startTime", "Start time is required").notEmpty(),
    check("endTime", "End time is required").notEmpty(),
    check("totalMarks", "Total marks are required").isNumeric(),
    check("passingMarks", "Passing marks are required").isNumeric(),
  ],
  createExam
);

// @route   GET api/exams
// @desc    Get all exams
// @access  Private (Admin)
router.get("/all", [auth, isAdmin], getAllExams);

// @route GET api/exam/available
// @desc Get available exams for students
// @access Private
router.get("/available", [auth, isStudent], getAvailableExams);

// @route GET api/exams/:id
// @desc Get exam by id
// @access Private
router.get("/:id", auth, getExamById);

// @route PUT api/exam/:id
// @desc Update exam by id
// @access Private (Admin Only)
router.put("/:id", [auth, isAdmin], updateExam);

// @route DELETE api/exams/:id
// @desc Delete exam by id
// @access Private (Admin Only)
router.delete("/:id", [auth, isAdmin], deleteExam);

// @route   POST api/exams/:id/enroll
// @desc    Enroll in an exam
// @access  Private (Student only)
// Note: You might want to add isStudent middleware here if defined
router.post("/:id/enroll", [auth, isStudent], enrollInExam);

module.exports = router;
