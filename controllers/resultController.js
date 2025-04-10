const Result = require("../models/result");
const Exam = require("../models/exam");
const User = require("../models/user");
const Question = require("../models/question");
const result = require("../models/result");

// create new Results
/**
 * Creates a new Result instance with exam details and student performance
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.examId - The ID of the exam taken
 * @param {Array} req.body.answers - Array of student answers
 * @param {string} req.body.startTime - The time when the exam started
 * @param {Array} req.body.proctorFlags - Array of proctor flags
 * @param {Object} res - Express response object
 * @returns {Object} Response containing result details
 */
exports.createResult = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { examId, answers, startTime, proctorFlags } = req.body;

    // Get the exam to calculate score
    const examData = await Exam.findById(examId).populate("questions");
    if (!examData) {
      return res.status(404).json({
        status: failure,
        message: "Exam not found",
      });
    }

    // Check if the exam exists
    if (!examData) {
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }

    // Calculate Score
    let totalScore = 0;
    let totalMarks = 0;
    let answerWithCorrectness = [];

    // process each answer
    for (const answer of answers) {
      const question = examData.questions.find((q) =>
        q._id.toString().equals(answer.question.toString())
      );

      if (question) {
        const isCorrect = question.correctAnswer === answer.selectedOption;

        answerWithCorrectness.push({
          question: answer.question,
          selectedOption: answer.selectedOption,
          isCorrect: isCorrect,
        });

        if (isCorrect) {
          totalScore += question.marks;
        }
        totalMarks += question.marks;
      }
    }

    const percentage = (totalScore / totalMarks) * 100;
    const isPassed = percentage >= examData.passingPercentage;

    // create a new result
    const newResult = await Result.create({
      exam: examId,
      student: req.user.id,
      answer: answerWithCorrectness,
      totalScore,
      percentage,
      isPassed,
      startTime: new Date(startTime),
      submittedAt: newDate(),
      proctorFlags: proctorFlags || [],
    });

    // return a response
    res.status(201).json({
      status: "success",
      message: "Exam submitted successfully",
      result: newResult,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};

// Get all results
exports.getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate("exam", ["title", "description", "duration"])
      .populate("student", ["name", "email"])
      .exec();

    res.status(200).json({
      status: "success",
      message: "All Results retrieved successfully",
      results: results,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      status: failed,
      message: "Internal Server Error",
    });
  }
};

// Get Result by ResultId (admin only)
/**
 * Retrieves a result record by ID with populated exam and question details
 * @param {Object} result - The found result document
 * @param {Object} result.exam - The populated exam document containing title, totalMarks and passingMarks
 * @param {Object[]} result.answers - Array of answer objects
 * @param {Object} result.answers[].question - The populated question document containing text, options, type and marks
 * @returns {Object} Mongoose document containing the result with populated exam and question fields
 */
exports.getResultById = async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate("exam", "title totalMarks passingMarks")
      .populate("student", ["name", "email"])
      .populate({
        path: "answers.question",
        select: "text options type marks difficulty",
      });

    // Check if result exists
    if (!result) {
      return res.status(404).json({
        status: "error",
        message: "Result not found",
      });
    }

    // Check if user is authorized to view this result
    if (
      req.user.role === "student" &&
      result.student.toString() !== req.user.id
    ) {
      return res.status(403).json({
        status: "failed",
        error: "You are not authorized to view this result",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Result fetched successfully",
      result: result,
    });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Result not found" });
    }
    res.status(500).send("Server error");
  }
};

// get all result for an exam (admin only)
/**
 * Retrieves exam results for a specific exam ID
 * @typedef {Object} ExamResult
 * @property {Object} student - Student details
 * @property {string} student.name - Student's name
 * @property {string} student.email - Student's email
 * @property {number} totalScore - Total score achieved
 * @property {number} percentage - Percentage scored
 * @property {boolean} isPassed - Whether student passed the exam
 * @property {Date} submittedAt - Timestamp when exam was submitted
 * @property {Array} proctorFlags - Array of proctor flags/violations
 * @returns {Promise<ExamResult[]>} Array of exam results
 */
exports.getExamResults = async (req, res) => {
  try {
    const results = await Result.find({ exam: req.params.examId })
      .populate("student", "name email")
      .select("totalScore percentage isPassed submittedAt proctorFlags");

    res.status(200).json({
      status: "success",
      message: "Exam results fetched successfully",
      results: results,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// get all results for a student
exports.getStudentResults = async (req, res) => {
  try {
    const results = await Result.find({
      student: req.user.id,
    })
      .populate("exam", "title totalMarks")
      .select("totalScore percentage isPassed submittedAt");

    res.status(200).json({
      status: "success",
      message: "Student results fetched successfully",
      results: results,
    });
  } catch (err) {
    console.error("Error while fetching student result", err.message);
    res.status(500).send("Server error");
  }
};

/**
 * Retrieves and calculates analytics for all exams created by the instructor
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Analytics data including:
 * - examId: Exam identifier
 * - examTitle: Name of the exam
 * - totalStudents: Number of students who took the exam
 * - passedStudents: Number of students who passed
 * - passRate: Percentage of students who passed
 * - averageScore: Mean score of all students
 * - lowScores: Minimum score achieved
 * - highScores: Maximum score achieved
 */
// get analytics for all exams
exports.getExamAnalytics = async (req, res) => {
  try {
    const exams = await Exam.find({ createdBy: req.user.id }).select("title");

    const analytics = [];

    for (const exam of exams) {
      const results = await Result.find({
        exam: exam._id,
      });

      if (results.length === 0) {
        continue;
      }

      // Calculate statistics
      const totalStudents = result.length;
      const passedStudents = results.filter((result) => result.isPassed).length;
      const passRate = (passedStudents / totalStudents) * 100;

      // calculate average Score

      const totalScore = result.reduce(
        (acc, result) => acc + result.totalScore,
        0
      );
      const averageScore = totalScore / totalStudents;

      //Get high and low Scores
      const lowScores = Math.min(...result.map((result) => result.totalScore));
      const highScores = Math.max(...result.map((result) => result.totalScore));

      analytics.push({
        examId: exam._id,
        examTitle: exam.title,
        totalStudents,
        passedStudents,
        passRate,
        averageScore,
        lowScores,
        highScores,
      });
    }
    res.status(200).json({
      status: success,
      message: "Analytics created and fetched successfully",
      data: analytics,
    });
  } catch (error) {
    console.error("Error while fetching analytics", error);
    res.status(500).json({
      status: failure,
      message: error.message,
    });
  }
};

// Get my results (for authenticated student)
exports.getMyResults = async (req, res) => {
  try {
    const results = await Result.find({ student: req.user.id })
      .populate("exam", ["title", "description", "duration"])
      .exec();

    res.status(200).json({
      status: success,
      message: "Results fetched successfully",
      data: results,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

// Delete a result
exports.deleteResult = async (req, res) => {
  try {
    // Get the result ID from the request params and delete
    const result = await Result.findByIdAndDelete(req.params.id);

    // Check if result exists
    if (!result) {
      return res.status(404).json({
        status: failure,
        message: "Result not found or already deleted",
      });
    }

    // check if user has permission to delete result
    // code pending

    await result.deleteOne();

    // Return success message
    res.status(200).json({
      status: success,
      message: "Result deleted successfully",
    });
  } catch (err) {
    console.error("Error while deleting result", err);
    res.status(500).json({
      status: failure,
      message: err.message,
    });
  }
};
