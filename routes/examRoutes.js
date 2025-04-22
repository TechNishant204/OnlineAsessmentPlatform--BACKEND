const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { check } = require("express-validator"); // Ensure express-validator is installed
const examController = require("../controllers/examController");
const { auth, isAdmin, isStudent } = require("../middlewares/auth"); // Ensure auth.js exports isAdmin

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

// ####### Admin Routes ############# //
/**
 * @route GET /api/exam/admin/exams
 * @desc Get all exams (filtered by creator unless showAll=true is specified)
 * @access Private (Admin Only)
 */
router.get("/admin/exams", auth, isAdmin, examController.getAllExams);

/**
 * @route GET /api/exam/admin/my-exams
 * @desc Get all exams created by the current admin
 * @access Private (Admin Only)
 */
router.get("/admin/my-exams", auth, isAdmin, examController.getMyExams);

/**
 * @route GET /api/exam/admin/exams/:id
 * @desc Get a specific exam by ID with ownership verification
 * @access Private (Admin Only)
 */
router.get("/admin/exams/:id", auth, isAdmin, examController.getExamById);

/**
 * @route POST /api/exam/admin/exams
 * @desc Create a new exam
 * @access Private (Admin Only)
 */
router.post("/admin/exams", auth, isAdmin, examController.createExam);

/**
 * @route PUT /api/exam/admin/exams/:id
 * @desc Update an existing exam with ownership verification
 * @access Private (Admin Only)
 */
router.put("/admin/exams/:id", auth, isAdmin, examController.updateExam);

/**
 * @route DELETE /api/exam/admin/exams/:id
 * @desc Delete an exam with ownership verification
 * @access Private (Admin Only)
 */
router.delete("/admin/exams/:id", auth, isAdmin, examController.deleteExam);

/**
 * @route GET /api/exam/admin/analytics
 * @desc Get analytics for exams created by the current admin
 * @access Private (Admin Only)
 */
router.get(
  "/admin/analytics/:examId",
  auth,
  isAdmin,
  examController.getExamAnalytics
);

// ####### Student Routes ############# //
/**
 * @route POST /api/exam/enroll/:examId
 * @desc Enroll a student in an exam
 * @access Private (Student)
 */
router.post("/enroll/:examId", auth, examController.enrollInExam);
/**
 * @route GET /api/exam/available
 * @desc Get all available exams for students
 * @access Private (Student)
 */
router.get("/available", auth, examController.getAvailableExams);

/**
 * @route GET /api/exam/enrolled
 * @desc Get all exams the student is enrolled in
 * @access Private (Student)
 */
router.get("/enrolled", auth, examController.getEnrolledExams);

/**
 * @route GET /api/exam/completed
 * @desc Get all completed exams for the student
 * @access Private (Student)
 */
router.get("/completed", auth, examController.getCompletedExams);

/**
 * @route GET /api/exam/start/:id
 * @desc Start an exam session for a student
 * @access Private (Student)
 */
router.get("/start/:examId", auth, examController.startExam);

module.exports = router;
