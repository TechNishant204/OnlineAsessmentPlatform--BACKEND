const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  createQuestion,
  getAllQuestionsByExamId,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
} = require("../controllers/questionController");
const { auth, isAdmin, isStudent } = require("../middlewares/auth");
const logger = require("../utils/loggerUtils"); // Added logger import

// @route   POST api/question/
// @desc    Create a question
// @access  Private (Admin only)
router.post(
  "/",
  [
    [auth, isAdmin],
    [
      check("text", "Question text is required").notEmpty(),
      check("type", "Question type is required").isIn([
        "multiple-choice",
        "true-false",
      ]),
      check("options", "Options are required").isArray(),
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

// @route   GET api/question
// @desc    Get all question
// @access  Public
router.get("/:examId", getAllQuestionsByExamId);

// @route   GET api/questions/:id
// @desc    Get question by ID
// @access  Public
router.get("/:id", [auth], getQuestionById);

// @route   PUT api/questions/:id
// @desc    Update a question
// @access  Private
router.put("/:id", [auth, isAdmin], updateQuestion);

// @route   DELETE api/questions/:id
// @desc    Delete a question
// @access  Private
router.delete("/:id", [auth, isAdmin], deleteQuestion);

module.exports = router;
