const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  createQuestion,
  getAllQuestionsByExamId,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  addQuestionsToExam, // Add the new controller method
} = require("../controllers/questionController");
const { auth, isAdmin, isStudent } = require("../middlewares/auth");
const logger = require("../utils/loggerUtils");

/**
 // Create question controller
 * @route   POST api/question/
 * @desc    Create a question
 * @access  Private (Admin only)
 */
router.post(
  "/",
  [
    [auth, isAdmin],
    [
      check("text", "Question text is required").notEmpty(),
      check("type", "Question type is required").isIn([
        "multiple-choice",
        "true-false",
        "short-answer", // Added support for short-answer type
      ]),
      check("options", "Options are required for multiple-choice")
        .if((value, { req }) => req.body.type === "multiple-choice")
        .isArray(),
      check("marks", "Marks are required").isNumeric(),
      check("correctAnswer", "Correct answer is required").notEmpty(),
      check("difficulty", "Difficulty level is required").isIn([
        "easy",
        "medium",
        "hard",
      ]),
    ],
  ],
  createQuestion
);

/** Add question To Exam by Exam Id
 * @route   POST api/question/exam/:examId
 * @desc    Add multiple questions to an exam
 * @access  Private (Admin only)
 */
router.post("/exam/:examId", [auth, isAdmin], addQuestionsToExam);

/**
 * @route   GET api/question/:examId
 * @desc    Get all questions by exam ID
 * @access  Public
 */
router.get("/exam/:examId", getAllQuestionsByExamId);

/**
 * @route   GET api/question/:id
 * @desc    Get question by ID
 * @access  Private
 */
router.get("/:id", [auth], getQuestionById);

/**
 * @route   PUT api/question/:id
 * @desc    Update a question
 * @access  Private (Admin only)
 */
router.put("/:id", [auth, isAdmin], updateQuestion);

/**
 * @route   DELETE api/question/:id
 * @desc    Delete a question
 * @access  Private (Admin only)
 */
router.delete("/:id", [auth, isAdmin], deleteQuestion);

module.exports = router;
