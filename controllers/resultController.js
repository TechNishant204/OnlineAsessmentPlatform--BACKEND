// src/controllers/resultController.js
const Result = require("../models/result");
const Exam = require("../models/exam");
const User = require("../models/user");

const { validationResult } = require("express-validator");
const logger = require("../utils/loggerUtils");

// Creates a new Result instance with exam details and student performance
/**
 * Creates a new Result instance with exam details and student performance
 * @route POST /api/results
 * @access Private (Students only)
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.examId - The ID of the exam taken
 * @param {Array} req.body.answers - Array of student answers
 * @param {string} req.body.startTime - The time when the exam started
 * @param {Object} res - Express response object
 * @returns {Object} Response containing result details
 */
exports.submitExam = async (req, res) => {
  try {
    // Extract request data
    const { examId, answers, startTime } = req.body;
    const studentId = req.user.id;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Answers must be a non-empty array",
      });
    }

    // Find the exam with its questions
    const examData = await Exam.findById(examId).populate("questions");

    if (!examData) {
      logger.error(`Exam not found for ID: ${examId}`);
      return res.status(404).json({
        status: "error",
        message: "Exam not found",
      });
    }

    // Process answers and calculate score
    let totalScore = 0;
    const totalMarks = examData.totalMarks;
    const processedAnswers = [];

    // Map through answers and check correctness
    for (const answer of answers) {
      const question = examData.questions.find(
        (q) => q._id.toString() === answer.question.toString()
      );

      if (question) {
        // Convert values for more reliable comparison
        const correctAnswer = String(question.correctAnswer).trim();
        const selectedOption = String(answer.selectedOption).trim();

        // Enhanced debugging
        console.log("Correct Answer:", correctAnswer);
        console.log("Selected Option:", selectedOption);
        console.log(
          "Correct Answer (code points):",
          [...correctAnswer].map((c) => c.charCodeAt(0))
        );
        console.log(
          "Selected Option (code points):",
          [...selectedOption].map((c) => c.charCodeAt(0))
        );

        // More robust comparison - normalize to handle potential encoding issues
        const isCorrect =
          correctAnswer.normalize() === selectedOption.normalize();

        processedAnswers.push({
          question: answer.question,
          selectedOption: answer.selectedOption,
          isCorrect,
        });

        if (isCorrect) {
          totalScore += question.marks;
        }
      }
    }

    // Calculate percentage and passing status
    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;
    const isPassed =
      percentage >= (examData.passingMarks / examData.totalMarks) * 100;

    // Create a new result
    const newResult = await Result.create({
      exam: examId,
      student: studentId,
      answers: processedAnswers,
      totalScore,
      percentage,
      isPassed,
      startTime: new Date(startTime || Date.now()),
      submittedAt: new Date(),
    });

    // Update user's completedExams field with both exam and result IDs
    await User.findByIdAndUpdate(
      studentId,
      {
        $push: {
          completedExams: {
            exam: examId,
            result: newResult._id,
          },
        },
      },
      { new: true }
    );

    logger.info(
      `Result created successfully for exam: ${examId}, student: ${req.user.id}, and completedExams updated`
    );

    res.status(201).json({
      status: "success",
      message: "Exam submitted successfully",
      result: {
        id: newResult._id,
        score: totalScore,
        totalMarks,
        percentage,
        isPassed,
      },
    });
  } catch (error) {
    logger.error(`Error in createResult: ${error.message}`, {
      stack: error.stack,
    });
    res.status(500).json({
      status: "error",
      message: "Failed to submit exam",
    });
  }
};

// Retrieves a specific result by its ID
/**
 * Retrieves a specific result by its ID
 * @route GET /api/results/:id
 * @access Private (Admin or the student who owns the result)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Result ID
 * @param {Object} res - Express response object
 * @returns {Object} Response containing detailed result information
 */
exports.getResultByResultId = async (req, res) => {
  try {
    const resultId = req.params.id;
    const result = await Result.findById(resultId)
      .populate("exam", "title totalMarks passingMarks")
      .populate("student", ["name", "email"])
      .populate({
        path: "answers.question",
        select: "text options type marks difficulty",
      });

    if (!result) {
      logger.warn(`Result not found for ID: ${resultId}`);
      return res.status(404).json({
        status: "error",
        message: "Result not found",
      });
    }

    // if (
    //   req.user.role === "student" &&
    //   result.student.toString() !== req.user.id
    // ) {
    //   logger.warn(
    //     `Unauthorized access attempt for result ${resultId} by user ${req.user.id}`
    //   );
    //   return res.status(403).json({
    //     status: "error",
    //     message: "You are not authorized to view this result",
    //   });
    // }

    logger.info(
      `Result ${resultId} retrieved successfully by user ${req.user.id}`
    );
    res.status(200).json({
      status: "success",
      message: "Result fetched successfully",
      data: result,
    });
  } catch (err) {
    if (err.kind === "ObjectId") {
      logger.warn(`Invalid result ID format: ${req.params.id}`);
      return res
        .status(404)
        .json({ status: "error", message: "Result not found" });
    }
    logger.error(`Error in getResultById: ${err.message}`, {
      stack: err.stack,
    });
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

// Retrieves all results for a specific exam
/**
 * Retrieves all results for a specific exam
 * @route GET /api/results/exam/:examId
 * @access Private (Admin only)
 * @param {Object} req - Express request object
 * @param {string} req.params.examId - Exam ID
 * @param {Object} res - Express response object
 * @returns {Object} Response containing results for the specified exam
 */
exports.getAllResultsByExamId = async (req, res) => {
  try {
    const examId = req.params.id;
    console.log("Exam ID:", examId);
    const results = await Result.find({ exam: examId })
      .populate("student", "name email")
      .select("totalScore percentage isPassed submittedAt ");

    console.log("Results from getAllResultsByExamId:", results);

    logger.info(`Retrieved ${results.length} results for exam ${examId}`);
    res.status(200).json({
      status: "success",
      message: "Exam results fetched successfully",
      data: results,
    });
  } catch (err) {
    logger.error(
      `Error in getExamResults for exam ${req.params.examId}: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({
      status: "error",
      message: "Server error",
    });
  }
};

//Retrieves all results for the currently logged-in student
/**
 * Retrieves all results for the currently logged-in student
 * @route GET /api/results/me
 * @access Private (Students only)
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information
 * @param {Object} res - Express response object
 * @returns {Object} Response containing all results for the authenticated student
 */
exports.getMyResults = async (req, res) => {
  try {
    const studentId = req.user.id;
    console.log("studentId", studentId);
    const results = await Result.find({ student: studentId })
      .populate("exam", ["title", "description", "duration"])
      .exec();

    logger.info(
      `Retrieved ${results.length} personal results for student ${studentId}`
    );
    res.status(200).json({
      status: "success",
      message: "Results fetched successfully",
      data: results,
    });
  } catch (err) {
    logger.error(
      `Error in getMyResults for user ${req.user.id}: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({
      status: "error",
      message: "Server Error",
    });
  }
};

//Deletes a specific result by ID
/**
 * Deletes a specific result by ID
 * @route DELETE /api/results/:id
 * @access Private (Admin only)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Result ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} Response indicating success or failure of deletion
 */
exports.deleteResult = async (req, res) => {
  try {
    const resultId = req.params.id;
    const result = await Result.findById(resultId);

    if (!result) {
      logger.warn(`Attempt to delete non-existent result with ID: ${resultId}`);
      return res.status(404).json({
        status: "error",
        message: "Result not found or already deleted",
      });
    }

    await result.deleteOne();
    logger.info(
      `Result ${resultId} deleted successfully by user ${req.user.id}`
    );

    res.status(200).json({
      status: "success",
      message: "Result deleted successfully",
      DeletedData: result,
    });
  } catch (err) {
    logger.error(
      `Error while deleting result ${req.params.id}: ${err.message}`,
      { stack: err.stack }
    );
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};
