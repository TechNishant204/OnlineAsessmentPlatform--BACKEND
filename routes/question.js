const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const QuestionController = require("../controllers/examController");
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

// @route   POST api/questions
// @desc    Create a question
// @access  Private (Admin only)
router.post(
  "/",
  [
    auth,
    isAdmin,
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
  QuestionController.createQuestion
);

// @route   GET api/questions
// @desc    Get all questions
// @access  Public
router.get("/", QuestionController.getAllQuestions);

// @route   GET api/questions/:id
// @desc    Get question by ID
// @access  Public
router.get("/:id", QuestionController.getQuestionById);

// @route   PUT api/questions/:id
// @desc    Update a question
// @access  Private
router.put(
  "/:id",
  [
    auth,
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
  QuestionController.updateQuestion
);

// @route   DELETE api/questions/:id
// @desc    Delete a question
// @access  Private
router.delete("/:id", auth, questionController.deleteQuestion);

/*
// @route GET api/questions/difficulty/:level
// @desc Get questions by difficulty level
// @access Private
router.get('/difficulty/:level', auth, questionController.getQuestionsByDifficulty);

// @route GET api/questions/type/:type
// @desc Get questions by type
// @access Private
router.get('/type/:type', auth, questionController.getQuestionsByType);

*/
module.exports = router;
