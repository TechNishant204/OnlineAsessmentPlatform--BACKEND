const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  createQuestion,
  getAllQuestions,
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

// @route   GET api/questions
// @desc    Get all questions
// @access  Public
router.get("/", [auth, isAdmin], getAllQuestions);

// @route   GET api/questions/:id
// @desc    Get question by ID
// @access  Public
router.get("/:id", [auth], getQuestionById);

// @route   PUT api/questions/:id
// @desc    Update a question
// @access  Private
router.put(
  "/:id",
  [
    [auth, isAdmin],
    [
      check("text", "Question text is required").optional().notEmpty(),
      check("type", "Question type is required")
        .optional()
        .isIn(["multiple-choice", "true-false"]),
      check("options", "Options are required").optional().isArray(),
      check("marks", "Marks are required").optional().isNumeric(),
      check("correctAnswer", "Correct answer is required")
        .optional()
        .notEmpty(),
      check("difficulty", "Difficulty level is required")
        .optional()
        .isIn(["easy", "medium", "hard"]),
    ],
  ],
  updateQuestion
);

// @route   DELETE api/questions/:id
// @desc    Delete a question
// @access  Private
router.delete("/:id", [auth, isAdmin], deleteQuestion);

// Implement the routes that needed help
// @route GET api/questions/difficulty/:level
// @desc Get questions by difficulty level
// @access Private
// router.get(
//   "/difficulty/:level",
//   auth,
//   QuestionController.getQuestionsByDifficulty
// );

// @route GET api/questions/type/:type
// @desc Get questions by type
// @access Private
// router.get("/type/:type", auth, QuestionController.getQuestionsByType);

module.exports = router;
