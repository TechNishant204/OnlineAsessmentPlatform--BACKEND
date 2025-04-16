const Question = require("../models/question");
const { validationResult } = require("express-validator");
const logger = require("../utils/loggerUtils");
const Exam = require("../models/exam");

/**
 * Creates a new question in the database
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing question details
 * @param {string} req.body.text - The text content of the question
 * @param {string} req.body.type - The type of question (e.g., multiple choice, essay)
 * @param {Array} req.body.options - Array of possible answers for the question
 * @param {string} req.body.correctAnswer - The correct answer from options
 * @param {number} req.body.marks - The marks/points assigned to the question
 * @param {string} req.body.difficulty - The difficulty level of the question
 * @param {Object} req.user - Logged in user details
 * @param {string} req.user.id - The ID of the user creating the question
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with question data or error message
 */
exports.createQuestion = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(
      `Validation error in question creation: ${JSON.stringify(errors.array())}`
    );
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    // Fetch the data from the request body
    const { text, type, options, correctAnswer, marks, difficulty, exam } =
      req.body;

    logger.debug(
      `Attempting to create new ${type} question by user ${req.user.id}`
    );

    // Verify the correctAnswer is within the options array
    if (!options.includes(correctAnswer)) {
      logger.warn(
        `Question creation failed: correct answer "${correctAnswer}" not in options`
      );
      return res.status(400).json({
        status: "failed",
        error: "Correct answer must be one of the provided options",
      });
    }

    // Validate exam ID if provided
    let examId = null;
    if (exam) {
      const existingExam = await Exam.findById(exam);
      if (!existingExam) {
        return res
          .status(400)
          .json({ status: "failed", message: "Invalid exam ID" });
      }
      examId = exam;
    }

    // Create a new question
    const question = await Question.create({
      text,
      type,
      options,
      correctAnswer,
      marks,
      difficulty,
      createdBy: req.user.id,
      exam: examId,
    });

    // Update the exam with the new question ID if an exam is associated
    if (examId) {
      const updatedExam = await Exam.findByIdAndUpdate(
        examId,
        { $addToSet: { questions: question._id } }, // $addToSet prevents duplicates
        { new: true, runValidators: true }
      ).populate("questions", "text type marks");

      if (!updatedExam) {
        logger.warn(`Exam ${examId} not found after question creation`);
        return res.status(404).json({
          status: "failed",
          message: "Exam not found after question creation",
        });
      }

      logger.info(
        `Exam ${examId} updated with question ${question._id} by user ${req.user.id}`
      );
    }

    logger.info(
      `Question created successfully: ${question._id} by user ${req.user.id}`
    );

    if (examId) {
      const updatedExam = await Exam.findByIdAndUpdate(
        examId,
        { $addToSet: { questions: question._id } },
        { new: true, runValidators: true }
      ).populate("questions", "marks");
      const newTotalMarks = updatedExam.questions.reduce(
        (sum, q) => sum + q.marks,
        0
      );
      await Exam.findByIdAndUpdate(examId, { totalMarks: newTotalMarks });
    }

    // Return the created question as a response
    res.status(201).json({
      status: "success",
      message: "Question created successfully",
      data: question,
    });
  } catch (error) {
    logger.error(`Error creating question: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      status: "failed",
      message: "Failed to create question",
    });
  }
};

/**
 * Gets all questions from the database
 * @async
 * @function getAllQuestions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with all questions or error message
 */
exports.getAllQuestions = async (req, res) => {
  try {
    logger.debug("Fetching all questions from database");

    // Fetch all questions from the database
    // sort by created date in descending order
    const questions = await Question.find()
      .sort({ created: -1 })
      .populate("createdBy", "name email")
      .populate("exam", "title")
      .exec();

    logger.info(`Retrieved ${questions.length} questions successfully`);

    // Return the questions as a response
    res.status(200).json({
      status: "success",
      data: questions,
    });
  } catch (error) {
    logger.error(`Error fetching questions: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch questions",
    });
  }
};

/**
 * Gets a question by ID
 * @async
 * @function getQuestionById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - The ID of the question to retrieve
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with question data or error message
 */
exports.getQuestionById = async (req, res) => {
  try {
    const questionId = req.params.id;
    logger.debug(`Fetching question with ID: ${questionId}`);

    const question = await Question.findById(questionId)
      .populate("createdBy", "name email")
      .populate("exam", "title")
      .exec();

    // check if question exists
    if (!question) {
      logger.info(`Question not found with ID: ${questionId}`);
      return res.status(404).json({
        status: "failed",
        message: "Question not found",
      });
    }

    logger.info(`Question fetched successfully: ${questionId}`);

    // Return the question as a response
    res.status(200).json({
      status: "success",
      message: " Question fetched successfully",
      data: question,
    });
  } catch (error) {
    logger.error(`Error fetching question: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(`Invalid question ID format: ${req.params.id}`);
      return res.status(404).json({
        status: "failed",
        message: "Question not found",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
    });
  }
};

// Find the question to update
/**
 * Updates a question by ID
 * @async
 * @function updateQuestion
 * @param {Object} req - Express request object
 * @param {string} req.params.id - The ID of the question to update
 * @param {Object} req.body - The updated question data
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated question or error message
 */
exports.updateQuestion = async (req, res) => {
  // validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(
      `Validation error in question update: ${JSON.stringify(errors.array())}`
    );
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const questionId = req.params.id;
    logger.debug(`Attempting to update question with ID: ${questionId}`);

    // fetch the details from the request body
    const { text, type, options, correctAnswer, marks, difficulty, exam } =
      req.body;

    // check if question exists
    let question = await Question.findById(questionId);

    // Check if question exists
    if (!question) {
      logger.info(`Update failed - Question not found with ID: ${questionId}`);
      return res.status(404).json({
        status: "failed",
        message: "Question not found",
      });
    }

    // Update fields (recheck)
    if (text) question.text = text;
    if (type) question.type = type;
    if (options) question.options = options;
    if (correctAnswer) {
      // If options were also updated, verify correctAnswer is in the new options
      const optionsToCheck = options || question.options;
      if (!optionsToCheck.includes(correctAnswer)) {
        logger.warn(
          `Question update failed: correct answer "${correctAnswer}" not in options`
        );
        return res.status(400).json({
          status: "failed",
          message: "Correct answer must be one of the provided options",
        });
      }
      question.correctAnswer = correctAnswer;
    }
    if (marks) question.marks = marks;
    if (difficulty) question.difficulty = difficulty;
    if (exam) {
      const existingExam = await Exam.findById(exam);
      if (!existingExam) {
        return res
          .status(400)
          .json({ status: "failed", message: "Invalid exam ID" });
      }
      question.exam = exam;
    }

    logger.debug(`Saving updated question ${questionId}`);

    // Save the updated question
    await question.save();
    logger.info(
      `Question updated successfully: ${questionId} by user ${req.user.id}`
    );

    // Return the updated question
    res.status(200).json({
      status: "success",
      message: " Question updated successfully",
      data: question,
    });
  } catch (error) {
    logger.error(`Error updating question: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(`Invalid question ID format for update: ${req.params.id}`);
      return res.status(404).json({
        status: "failed",
        message: "Question not found",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
    });
  }
};

/**
 * Deletes a question by ID
 * @async
 * @function deleteQuestion
 * @param {Object} req - Express request object
 * @param {string} req.params.id - The ID of the question to delete
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;
    logger.debug(`Attempting to delete question with ID: ${questionId}`);

    // Find the question by its ID
    const question = await Question.findById(questionId);

    // Check if question exists
    if (!question) {
      logger.info(`Delete failed - Question not found with ID: ${questionId}`);
      return res.status(404).json({
        status: "failed",
        message: "Question not found",
      });
    }

    // Remove question from any associated exams
    if (question.exam) {
      await Exam.updateMany(
        { questions: questionId },
        { $pull: { questions: questionId } }
      );
    }

    // Delete the question
    await question.deleteOne();

    logger.info(
      `Question deleted successfully: ${questionId} by user ${
        req.user ? req.user.id : "unknown"
      }`
    );

    res.status(200).json({
      status: "success",
      message: "Question removed successfully",
      RemovedData: question,
    });
  } catch (error) {
    logger.error(`Error deleting question: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(`Invalid question ID format for deletion: ${req.params.id}`);
      return res.status(404).json({
        status: "failed", // Fixed: String literal
        message: "Question not found",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
    });
  }
};

/*
// @desc    Get questions by difficulty level
// @access  Private
exports.getQuestionsByDifficulty = async (req, res) => {
    try {
      const questions = await Question.find({ difficulty: req.params.level })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email');
      
      res.json(questions);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };
  
  // @desc    Get questions by type
  // @access  Private
  exports.getQuestionsByType = async (req, res) => {
    try {
      const questions = await Question.find({ type: req.params.type })
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name email');
      
      res.json(questions);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  };
  */
