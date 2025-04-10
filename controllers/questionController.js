const Question = require("../models/question");
const { validationResult } = require("express-validator");

//create new question
/**
 * Creates a new question in the database
 * @param {string} text - The text content of the question
 * @param {string} type - The type of question (e.g., multiple choice, essay)
 * @param {Array} options - Array of possible answers for the question
 * @param {number} marks - The marks/points assigned to the question
 * @param {string} req.user.id - The ID of the user creating the question
 * @returns {Promise<Question>} The created question object
 */
exports.createQuestion = async (req, res) => {
  // Validate the request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    // fetch the data from the request body
    const { text, type, options, correctAnswer, marks, difficulty } = req.body;

    // Verify the correctAnswer is within the options array
    if (!options.includes(correctAnswer)) {
      return res.status(400).json({
        status: "failed",
        error: "Correct answer must be one of the provided options",
      });
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
    });

    // Return the created question as a response
    res.status(201).json({
      status: "success",
      message: "Questions created successfully",
      data: question,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: "failed",
      message: "Failed to create question",
    });
  }
};

// Get all questions
exports.getAllQuestions = async (req, res) => {
  try {
    // Fetch all questions from the database
    const questions = await Question.find()
      .sort({ created: -1 })
      .populate("createdBy", "name email")
      .exec(); // sort by created date in descending order

    // Return the questions as a response
    res.status(200).json({
      status: "success",
      data: questions,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch questions",
    });
  }
};

// Get question by Id
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate("createdBy", "name email")
      .exec();

    // check if question exists
    if (!question) {
      return res.status(404).json({
        status: "failed",
        message: "Question not found",
      });
    }

    // Return the question as a response
    res.status(200).json({
      status: "success",
      message: " Question fetched successfully",
      result: question,
    });
  } catch (error) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Question not found" });
    }
    res.status(500).send("Server Error");
  }
};

// Find the question to update
/**
 * Finds a question in the database by its ID
 * @param {Object} req - The request object containing the question ID in params
 * @param {string} req.params.id - The ID of the question to find
 * @returns {Promise<Object>} A promise that resolves to the found question document
 * @throws {Error} If the question is not found or if there's a database error
 */
// Update a question
exports.updateQuestion = async (req, res) => {
  // validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // fetch the details from the request body
    const { text, type, options, correctAnswer, marks, difficulty } = req.body;

    // check if question exists
    let question = await Question.findById(req.params.id);

    // Check if question exists
    if (!question) {
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
        return res
          .status(400)
          .json({ msg: "Correct answer must be one of the provided options" });
      }
      question.correctAnswer = correctAnswer;
    }
    if (marks) question.marks = marks;
    if (difficulty) question.difficulty = difficulty;

    // Save the updated question
    await question.save();

    // Return the updated question
    res.status(200).json({
      status: "success",
      message: " Question updated successfully",
      data: question,
    });
  } catch (err) {
    console.error("Error while updating the question", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Question not found" });
    }
    res.status(500).send("Server error");
  }
};

// Delete a question
/**
 * Delete a question from the database by its ID
 * @async
 * @param {Object} req - Express request object containing the question ID in params
 * @param {string} req.params.id - The ID of the question to find
 * @returns {Promise<Question>} A promise that resolves to the found question document
 * @throws {Error} If question is not found or database error occurs
 */
exports.deleteQuestion = async (req, res) => {
  try {
    // Find the question by its ID
    const question = await Question.findById(req.params.id);

    // Check if question exists
    if (!question) {
      return res.status(404).json({
        status: "failed",
        message: "Question not found",
      });
    }

    // Delete the question
    await question.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Question removed successfully",
    });
  } catch (err) {
    console.error("Error while deleting the question", err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({
        status: failed,
        msg: "Question not found",
      });
    }
    res.status(500).send("Server error");
  }
};
