const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { check } = require("express-validator"); // Ensure express-validator is installed
const {
  createExam,
  getAllExams,
  getAvailableExams,
  getExamById,
  updateExam,
  deleteExam,
  enrollInExam,
  getEnrolledExams,
  getCompletedExams,
  getExamAnalytics,
  startExam,
} = require("../controllers/examController");
const { auth, isAdmin, isStudent } = require("../middlewares/auth"); // Ensure auth.js exports isAdmin

// Validate that required functions are defined
if (typeof auth !== "function") {
  throw new Error("auth middleware is not a function");
}
if (typeof isAdmin !== "function") {
  throw new Error("isAdmin middleware is not a function");
}
if (typeof isStudent !== "function") {
  throw new Error("isStudent middleware is not a function");
}
if (typeof createExam !== "function") {
  throw new Error("createExam controller is not a function");
}
if (typeof getAllExams !== "function") {
  throw new Error("getAllExams controller is not a function");
}
if (typeof getAvailableExams !== "function") {
  throw new Error("getAvailableExams controller is not a function");
}
if (typeof getExamById !== "function") {
  throw new Error("getExamById controller is not a function");
}
if (typeof updateExam !== "function") {
  throw new Error("updateExam controller is not a function");
}
if (typeof deleteExam !== "function") {
  throw new Error("deleteExam controller is not a function");
}
if (typeof enrollInExam !== "function") {
  throw new Error("enrollInExam controller is not a function");
}
if (typeof getEnrolledExams !== "function") {
  throw new Error("getEnrolledExams controller is not a function");
}
if (typeof getCompletedExams !== "function") {
  throw new Error("getCompletedExams controller is not a function");
}
if (typeof startExam !== "function") {
  throw new Error("startExam controller is not a function");
}

const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid exam ID",
      data: null,
    });
  }
  next();
};

// @route POST /api/exam/createExam
// @desc Create a new Exam
// @access Private (Admin Only)
router.post("/createExam", [auth, isAdmin], createExam);

// @route GET api/exam/analytics
// @desc Get analytics for exams created by instructor
// @access Private
router.get("/analytics/:id", [auth, isAdmin], getExamAnalytics);

// @route   GET api/exam/enrolled
// @desc    Get enrolled exams for authenticated user
// @access  Private (Student only)
router.get("/enrolled", [auth, isStudent], getEnrolledExams);

// @route   GET api/exam/completed
// @desc    Get completed exams for authenticated user
// @access  Private (Student only)
router.get("/completed", [auth, isStudent], getCompletedExams);

// @route   GET api/exams
// @desc    Get all exams
// @access  Private (Admin)
router.get("/all", [auth, isAdmin], getAllExams);

// @route GET api/exam/available
// @desc Get available exams for students
// @access Private (Student Only)
router.get("/available", [auth, isStudent], getAvailableExams);

// @route GET api/exams/:id
// @desc Get exam by id
// @access Private
router.get("/:id", auth, validateObjectId, getExamById);

// @route PUT api/exam/:id
// @desc Update exam by id
// @access Private (Admin Only)
router.put("/:id", validateObjectId, [auth, isAdmin], updateExam);

// @route DELETE api/exams/:id
// @desc Delete exam by id
// @access Private (Admin Only)
router.delete("/:id", validateObjectId, [auth, isAdmin], deleteExam);

// @route   POST api/exam/:id/enroll
// @desc    Enroll in an exam
// @access  Private (Student only)
router.post("/:id/enroll", validateObjectId, [auth, isStudent], enrollInExam);

// @route   POST api/exam/:examId/start
// @desc    Start an exam session
// @access  Private (Student only)
router.post("/:id/start", validateObjectId, [auth, isStudent], startExam);

module.exports = router;
