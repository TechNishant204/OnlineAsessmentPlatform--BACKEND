const express = require("express");
const router = express.Router();
const { check } = require("express-validators");
const examController = require("../controllers/examController");
const auth = require("../middlewares/auth");

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      status: "failed",
      error: "Access denied. Admin only.",
    });
  }
  next();
};

// @route POST api/exams
// @desc Create a new Exam
// @access Private (Admin Only)

router.post(
  "/",
  auth,
  isAdmin,
  [
    check("title", "Title is required").notEmpty(),
    check("description", "Description is required").notEmpty(),
    check("duration", "Duration is required").isNumeric(),
    check("startTime", "Start time is required").notEmpty(),
    check("endTime", "End time is required").notEmpty(),
    check("questions", "Questions are required").isArray(),
    check("totalMarks", "Total marks are required").isNumeric(),
    check("passingMarks", "Passing marks are required").isNumeric(),
  ],
  examController.createExam
);

// @route   GET api/exams
// @desc    Get all exams
// @access  Private (Admin)
router.get("/all", [auth, isAdmin], examController.getAllExams);

// @route GET api/exams/available
// @desc Get available exams for students
// @access Private
router.get("/available", auth, examController.getAvailableExams);

// @route GET api/exams/:id
// @desc Get exam by id
// @access Private
router.get("/:id", auth, examController.getExamById);

// @route PUT api/exams/:id
// @desc Update exam by id
// @access Private (Admin Only)
router.put("/:id", [auth, isAdmin], examController.updateExam);

// @route DELETE api/exams/:id
// @desc Delete exam by id
// @access Private (Admin Only)
router.delete("/:id", [auth, isAdmin], examController.deleteExam);

// @route   POST api/exams/:id/enroll
// @desc    Enroll in an exam
// @access  Private (Student only)
router.post("/:id/enroll", auth, examController.enrollInExam);

module.exports = router;
