const Question = require("../models/question");
const { validationResult } = require("express-validator");
const logger = require("../utils/loggerUtils");
const Exam = require("../models/exam");

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

    // Validate based on question type
    if (type === "multiple-choice") {
      // Multiple choice questions must have options
      if (!Array.isArray(options) || options.length < 2) {
        logger.warn(
          `Question creation failed: multiple-choice questions require at least 2 options`
        );
        return res.status(400).json({
          status: "failed",
          error: "Multiple-choice questions require at least 2 options",
        });
      }

      // Check for empty options
      if (options.some((opt) => !opt || !opt.trim())) {
        logger.warn(`Question creation failed: all options must have content`);
        return res.status(400).json({
          status: "failed",
          error: "All options must have content",
        });
      }

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
    } else if (type === "true-false") {
      // True/False questions must have correctAnswer as either "true" or "false"
      if (correctAnswer !== "true" && correctAnswer !== "false") {
        logger.warn(
          `Question creation failed: true-false questions require correctAnswer to be "true" or "false"`
        );
        return res.status(400).json({
          status: "failed",
          error:
            'True/False questions require correct answer to be "true" or "false"',
        });
      }
    } else if (type === "short-answer") {
      // Short answer questions must have a non-empty correctAnswer
      if (!correctAnswer || !correctAnswer.trim()) {
        logger.warn(
          `Question creation failed: short-answer questions require a non-empty correctAnswer`
        );
        return res.status(400).json({
          status: "failed",
          error: "Short answer questions require a non-empty correct answer",
        });
      }
    } else {
      // Invalid question type
      logger.warn(`Question creation failed: invalid question type "${type}"`);
      return res.status(400).json({
        status: "failed",
        error:
          "Invalid question type. Supported types are: multiple-choice, true-false, short-answer",
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

    // Prepare options based on question type
    const questionOptions = type === "multiple-choice" ? options : [];

    // Create a new question
    const question = await Question.create({
      text,
      type,
      options: questionOptions,
      correctAnswer,
      marks: parseInt(marks, 10) || 1, // Ensure marks is a number, default to 1
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

      // Calculate and update total marks for the exam
      const newTotalMarks = updatedExam.questions.reduce(
        (sum, q) => sum + (parseInt(q.marks, 10) || 0),
        0
      );
      await Exam.findByIdAndUpdate(examId, { totalMarks: newTotalMarks });
    }

    logger.info(
      `Question created successfully: ${question._id} by user ${req.user.id}`
    );

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

// Add this method to add multiple questions from the QuestionFormModal
exports.addQuestionsToExam = async (req, res) => {
  try {
    // fetch the examId from the request parameters
    // and the questions from the request body
    const { examId } = req.params;
    const questions = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        status: "failed",
        message:
          "Questions must be provided as an array with at least one question",
      });
    }

    // Verify exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }

    // Verify user has permission to modify this exam
    if (
      exam.createdBy.toString() !== req.user.id &&
      !req.user.roles.includes("admin")
    ) {
      return res.status(403).json({
        status: "failed",
        message: "You don't have permission to modify this exam",
      });
    }

    const createdQuestions = [];
    let totalNewMarks = 0;

    // Process each question
    for (const questionData of questions) {
      const { text, type, options, correctAnswer, marks, difficulty } =
        questionData;

      // Skip validation here as we'll do type-specific validation below
      let questionOptions = [];
      let validatedCorrectAnswer = correctAnswer;

      // Validate based on question type
      if (type === "multiple-choice") {
        // Ensure options is an array with content
        if (!Array.isArray(options) || options.length < 2) {
          continue; // Skip this question
        }

        // Filter out empty options
        questionOptions = options.filter((opt) => opt && opt.trim());

        // Skip if we don't have enough options after filtering
        if (questionOptions.length < 2) {
          continue;
        }

        // Check if correctAnswer is in the options
        if (!questionOptions.includes(correctAnswer)) {
          continue; // Skip this question
        }
      } else if (type === "true-false") {
        // For true-false, ensure correctAnswer is valid
        if (correctAnswer !== "true" && correctAnswer !== "false") {
          continue; // Skip this question
        }
      } else if (type === "short-answer") {
        // For short answer, ensure correctAnswer is not empty
        if (!correctAnswer || !correctAnswer.trim()) {
          continue; // Skip this question
        }
      } else {
        // Invalid question type
        continue; // Skip this question
      }

      // All validation passed, create the question
      const parsedMarks = parseInt(marks, 10) || 1; // Default to 1 if marks is invalid

      const question = await Question.create({
        text,
        type,
        options: type === "multiple-choice" ? questionOptions : [],
        correctAnswer: validatedCorrectAnswer,
        marks: parsedMarks,
        difficulty: ["easy", "medium", "hard"].includes(difficulty)
          ? difficulty
          : "medium",
        createdBy: req.user.id,
        exam: examId,
      });

      createdQuestions.push(question);
      totalNewMarks += parsedMarks;

      // Update exam with the new question ID
      await Exam.findByIdAndUpdate(examId, {
        $addToSet: { questions: question._id },
      });
    }

    if (createdQuestions.length === 0) {
      return res.status(400).json({
        status: "failed",
        message: "No valid questions were provided",
      });
    }

    // Update exam's total marks
    const updatedExam = await Exam.findById(examId).populate(
      "questions",
      "marks"
    );
    const newTotalMarks = updatedExam.questions.reduce(
      (sum, q) => sum + (parseInt(q.marks, 10) || 0),
      0
    );
    await Exam.findByIdAndUpdate(examId, { totalMarks: newTotalMarks });

    logger.info(
      `${createdQuestions.length} questions added to exam ${examId} by user ${req.user.id}`
    );

    res.status(201).json({
      status: "success",
      message: `${createdQuestions.length} questions added successfully`,
      data: {
        questions: createdQuestions,
        examId,
        totalQuestions: updatedExam.questions.length,
        totalMarks: newTotalMarks,
      },
    });
  } catch (error) {
    logger.error(`Error adding questions to exam: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      status: "failed",
      message: "Failed to add questions to exam",
    });
  }
};
// Fetch questions for the specific examId, sorted by created date in descending order
/**
 * Fetches questions associated with a specific exam ID.
 * @async
 * @param {string} examId - The ID of the exam to fetch questions for
 * @returns {Promise<Array>} Array of question documents
 * - Each question is populated with:
 *   - createdBy: Author's name and email
 *   - exam: Exam title
 * - Questions are sorted by creation date in descending order
 */
exports.getAllQuestionsByExamId = async (req, res) => {
  try {
    const { examId } = req.params; // Extract examId from URL parameters
    logger.debug(`Fetching questions for examId: ${examId} from database`);

    // Validate examId
    if (!examId) {
      return res.status(400).json({
        status: "failed",
        message: "examId is required",
      });
    }

    const questions = await Question.find({ exam: examId })
      .sort({ created: -1 })
      .populate("createdBy", "name email")
      .populate("exam", "title")
      .exec();

    logger.info(
      `Retrieved ${questions.length} questions for examId: ${examId} successfully`
    );

    // Return the questions as a response
    res.status(200).json({
      status: "success",
      message: "All Questions fetched successfully",
      data: questions,
    });
  } catch (error) {
    logger.error(
      `Error fetching questions for examId ${examId}: ${error.message}`,
      {
        stack: error.stack,
      }
    );
    res.status(500).json({
      status: "failed",
      message: "Failed to fetch questions",
    });
  }
};

// Gets a question by ID
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
// Updates a question by ID
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
