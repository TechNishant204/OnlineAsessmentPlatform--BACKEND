/**
 * @module examController
 * @requires express-validator
 * @requires ../models/exam
 * @requires ../services/emailService
 * @requires ../models/user
 * @requires ../utils/logger
 */
const { validationResult } = require("express-validator");
const Exam = require("../models/exam");
const Result = require("../models/result");
const emailService = require("../utils/emailService");
const User = require("../models/user");
const mongoose = require("mongoose");
const logger = require("../utils/loggerUtils");

/**
 * Creates a new exam (admin only)
 * @async
 * @function createExam
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing exam details
 * @param {string} req.body.title - Title of the exam
 * @param {string} req.body.description - Description of the exam
 * @param {number} req.body.duration - Duration of the exam
 * @param {Date} req.body.startTime - Start time of the exam
 * @param {Date} req.body.endTime - End time of the exam
 * @param {Array} req.body.questions - Array of question objects
 * @param {number} req.body.totalMarks - Total marks for the exam
 * @param {number} req.body.passingMarks - Passing marks for the exam
 * @param {Object} req.user - Logged in user details
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with exam data or error message
 */
exports.createExam = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(
      `Validation error in exam creation: ${JSON.stringify(errors.array())}`
    );
    return res.status(400).json({
      status: "failed",
      message: "Validation errors",
      data: errors.array(),
    });
  }

  try {
    const {
      title,
      description,
      duration,
      startTime,
      endTime,
      questions,
      totalMarks,
      passingMarks,
    } = req.body;

    // Validate questions array
    if (questions && !Array.isArray(questions)) {
      return res.status(400).json({
        status: "failed",
        message: "Questions must be an array",
        data: null,
      });
    }

    // Validate dates
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) {
      return res.status(400).json({
        status: "failed",
        message: "End time must be after start time",
        data: null,
      });
    }

    // Create new exam
    const exam = new Exam({
      title,
      description,
      duration,
      startTime: start,
      endTime: end,
      questions: questions || [],
      totalMarks,
      passingMarks,
      createdBy: req.user.id,
    });

    await exam.save();
    logger.info(
      `Exam created successfully: ${exam._id} by user ${req.user.id}`
    );

    res.status(201).json({
      status: "success",
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error) {
    logger.error(`Error while creating exam: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Retrieves all exams (admin only)
 * @async
 * @function getAllExams
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with all exams data or error message
 */
exports.getAllExams = async (req, res) => {
  try {
    // Create the filter - if showAll query parameter is not true, filter by current admin
    const filter = {};
    if (req.user.role === "admin" && req.query.showAll !== "true") {
      filter.createdBy = req.user.id;
      logger.debug(`Filtering exams by creator: ${req.user.id}`);
    }
    const exams = await Exam.find(filter)
      .populate("questions", "text type marks")
      .populate("createdBy", "name email");

    if (!exams || exams.length === 0) {
      logger.info("No exams found in database");
      return res.status(200).json({
        status: "success",
        message: "No exams found",
        data: [],
      });
    }

    logger.info(`Retrieved ${exams.length} exams successfully`);
    res.status(200).json({
      status: "success",
      message: "Exams fetched successfully",
      data: exams,
    });
  } catch (error) {
    logger.error(`All Exam retrieval error: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * @route GET /api/exam/admin/my-exams
 * @desc Get all exams created by the current admin
 * @access Private (Admin Only)
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with exams created by the admin
 */
exports.getMyExams = async (req, res) => {
  try {
    const adminId = req.user.id;
    logger.debug(`Fetching exams created by admin: ${adminId}`);

    const exams = await Exam.find({ createdBy: adminId })
      .populate("questions")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 }); // Sort by newest first

    if (!exams || exams.length === 0) {
      logger.info(`No exams found created by admin: ${adminId}`);
      return res.status(200).json({
        status: "success",
        message: "No exams found",
        data: [],
      });
    }

    logger.info(`Retrieved ${exams.length} exams created by admin: ${adminId}`);
    res.status(200).json({
      status: "success",
      message: "Your exams fetched successfully",
      data: exams,
    });
  } catch (error) {
    logger.error(`Error fetching admin's exams: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Retrieves available exams for students
 * @async
 * @function getAvailableExams
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with available exams
 */
exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();

    const exams = await Exam.find({
      isActive: true,
      endTime: { $gt: now },
    })
      .select("title description duration startTime endTime totalMarks")
      .lean();

    logger.debug(`Found ${exams.length} available exams`);

    if (!exams || exams.length === 0) {
      logger.info("No available exams found for students");
      return res.status(200).json({
        status: "success",
        message: "No available exams found",
        data: [],
      });
    }

    logger.info(`Retrieved ${exams.length} available exams successfully`);
    res.status(200).json({
      status: "success",
      message: "Available exams fetched successfully",
      data: exams,
    });
  } catch (error) {
    logger.error(`Failed to fetch available exams: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Retrieves exam by ID
 * @async
 * @function getExamById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Exam ID
 * @param {Object} req.user - User object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with exam data
 */
exports.getExamById = async (req, res) => {
  try {
    const examId = req.params.id;
    logger.debug(`Fetching exam with ID: ${examId}`);

    const exam = await Exam.findById(examId)
      .populate("questions", "text type options marks")
      .populate("createdBy", "name email");

    if (!exam) {
      logger.warn(`Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
        data: null,
      });
    }

    let sanitizedExam = exam.toObject();
    if (req.user.role === "student") {
      sanitizedExam.questions.forEach((question) => {
        if (question.options) {
          question.options.forEach((option) => {
            delete option.isCorrect;
          });
        }
      });
    }

    logger.info(
      `Successfully retrieved exam: ${examId} for user: ${req.user.id}`
    );
    res.status(200).json({
      status: "success",
      message: "Exam fetched successfully",
      data: sanitizedExam,
    });
  } catch (error) {
    logger.error(`Failed to fetch exam: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(`Invalid exam ID format: ${req.params.id}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid exam ID",
        data: null,
      });
    }
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Updates exam fields (admin only)
 * @async
 * @function updateExam
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Exam ID
 * @param {Object} req.body - Updated exam fields
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated exam data
 */
exports.updateExam = async (req, res) => {
  try {
    const examId = req.params.id;
    logger.debug(`Attempting to update exam ID: ${examId}`);

    let exam = await Exam.findById(examId);
    if (!exam) {
      logger.info(`Update failed - Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
        data: null,
      });
    }

    const updateFields = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (key === "startTime" || key === "endTime") {
        updateFields[key] = new Date(value);
      } else if (key === "questions" && Array.isArray(value)) {
        updateFields[key] = value;
      } else {
        updateFields[key] = value;
      }
    }

    if (updateFields.startTime || updateFields.endTime) {
      const start = updateFields.startTime || exam.startTime;
      const end = updateFields.endTime || exam.endTime;
      if (start >= end) {
        return res.status(400).json({
          status: "failed",
          message: "End time must be after start time",
          data: null,
        });
      }
    }

    logger.debug(
      `Updating exam with fields: ${JSON.stringify(Object.keys(updateFields))}`
    );

    exam = await Exam.findByIdAndUpdate(
      examId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate("questions", "text type marks");

    logger.info(`Exam updated successfully: ${examId} by user ${req.user.id}`);
    res.status(200).json({
      status: "success",
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error) {
    logger.error(`Failed to update exam: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(`Invalid exam ID format for update: ${req.params.id}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid exam ID",
        data: null,
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Deletes an exam (admin only)
 * @async
 * @function deleteExam
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Exam ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message
 */
exports.deleteExam = async (req, res) => {
  try {
    const examId = req.params.id;
    logger.debug(`Attempting to delete exam ID: ${examId}`);

    const exam = await Exam.findById(examId);

    if (!exam) {
      logger.info(`Delete failed - Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found or already deleted",
        data: null,
      });
    }

    await User.updateMany(
      { enrolledExams: examId },
      { $pull: { enrolledExams: examId } }
    );

    await exam.deleteOne();

    logger.info(`Exam deleted successfully: ${examId} by user ${req.user.id}`);
    res.status(200).json({
      status: "success",
      message: "Exam Removed Successfully",
      data: { removedExam: exam },
    });
  } catch (error) {
    logger.error(`Failed to delete exam: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(`Invalid exam ID format for deletion: ${req.params.id}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid Exam ID",
        data: null,
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

// Enroll a user in the exam
/**
 * Enrolls a user in an exam
 * @async
 * @function enrollInExam
 * @param {Object} req - Express request object
 * @param {string} req.params.examId - Exam ID
 * @param {Object} req.user - User object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with enrollment details
 */
exports.enrollInExam = async (req, res) => {
  try {
    const examId = req.params.examId;
    const userId = req.user.id;

    // Validate examId
    if (examId && !mongoose.Types.ObjectId.isValid(examId)) {
      logger.warn(`Invalid exam ID format: ${examId}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid exam ID",
      });
    }

    logger.debug(`User ${userId} attempting to enroll in exam ${examId}`);

    const exam = await Exam.findById(examId);

    if (!exam) {
      logger.info(`Enrollment failed - Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
        data: null,
      });
    }

    if (!exam.isActive) {
      logger.info(`Enrollment failed - Exam ${examId} is not active`);
      return res.status(400).json({
        status: "failed",
        message: "Exam is not active",
        data: null,
        active: false,
      });
    }

    // Check if exam enrollment period has ended
    const now = new Date();
    if (now > exam.endTime) {
      logger.info(
        `Enrollment failed - Enrollment period has ended for exam ${examId}`
      );
      return res.status(400).json({
        status: "failed",
        message: "Enrollment period has ended",
        data: null,
        active: false,
      });
    }

    const user = await User.findById(userId);
    if (user.enrolledExams.includes(examId)) {
      logger.info(`User ${userId} is already enrolled in exam ${examId}`);
      return res.status(200).json({
        status: "ok",
        message: "You are already enrolled in this exam",
        data: null,
        enrolled: true,
      });
    }

    // update user enrolledExams array
    user.enrolledExams.push(examId);
    await user.save();

    logger.info(`User ${userId} successfully enrolled in exam ${examId}`);

    try {
      await emailService.sendExamEnrollmentEmail(
        user.email,
        user.name,
        exam.title,
        exam.duration,
        exam.startTime,
        exam.questions.length
      );
      logger.info(
        `Enrollment confirmation email sent to ${user.email} for exam ${examId}`
      );
    } catch (emailError) {
      logger.warn(
        `Failed to send enrollment email to ${user.email}: ${emailError.message}`
      );
    }

    res.status(200).json({
      status: "success",
      message: "Successfully Enrolled in exam",
      data: {
        exam,
        student: {
          _id: user._id,
          name: user.name,
          enrolledExams: user.enrolledExams,
        },
      },
      valid: true,
    });
  } catch (error) {
    logger.error(`Failed to enroll in exam: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(
        `Invalid exam ID format for enrollment: ${req.params.examId}`
      );
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
        data: null,
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Retrieves enrolled exams for the authenticated user
 * @async
 * @function getEnrolledExams
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with enrolled exams
 */
exports.getEnrolledExams = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.debug(`Fetching enrolled exams for user ${userId}`);

    const user = await User.findById(userId).populate({
      path: "enrolledExams",
      select:
        "title description duration startTime endTime totalMarks passingMarks",
    });

    if (!user.enrolledExams || user.enrolledExams.length === 0) {
      logger.info(`No enrolled exams found for user ${userId}`);
      return res.status(200).json({
        status: "success",
        message: "No enrolled exams found",
        data: [],
      });
    }

    logger.info(
      `Retrieved ${user.enrolledExams.length} enrolled exams for user ${userId}`
    );
    res.status(200).json({
      status: "success",
      message: "Enrolled exams fetched successfully",
      data: user.enrolledExams,
    });
  } catch (error) {
    logger.error(`Failed to fetch enrolled exams: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Retrieves completed exams for the authenticated user
 * @async
 * @function getCompletedExams
 * @param {Object} req - Express request object
 * @param {Object} req.user - User object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with completed exams
 */
exports.getCompletedExams = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.debug(`Fetching completed exams for user ${userId}`);

    const user = await User.findById(userId)
      .populate({
        path: "completedExams.exam",
        select: "title description duration startTime endTime totalMarks",
      })
      .populate({
        path: "completedExams.result",
        select: "totalScore percentage isPassed submittedAt",
      });

    if (!user.completedExams || user.completedExams.length === 0) {
      logger.info(`No completed exams found for user ${userId}`);
      return res.status(200).json({
        status: "success",
        message: "No completed exams found",
        data: [],
      });
    }

    const completedExams = user.completedExams.map((ce) => ({
      exam: ce.exam,
      result: ce.result,
    }));

    logger.info(
      `Retrieved ${completedExams.length} completed exams for user ${userId}`
    );
    res.status(200).json({
      status: "success",
      message: "Completed exams fetched successfully",
      data: completedExams,
    });
  } catch (error) {
    logger.error(`Failed to fetch completed exams: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};

/**
 * Starts an exam session for the authenticated user
 * @async
 * @function startExam
 * @param {Object} req - Express request object
 * @param {string} req.params.examId - Exam ID
 * @param {Object} req.user - User object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with exam session details
 */
exports.startExam = async (req, res) => {
  console.log("start exam pe aa gaya");
  try {
    const examId = req.params.examId;
    logger.debug(`Starting exam ${examId} for user ${req.user.id}`);

    const exam = await Exam.findById(examId).populate(
      "questions",
      "text type options marks"
    );
    if (!exam) {
      logger.warn(`Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
        data: null,
      });
    }

    if (!exam.isActive || new Date() > exam.endTime) {
      logger.warn(`Exam ${examId} is not active or has ended`);
      return res.status(400).json({
        status: "failed",
        message: "Exam is not active or has ended",
        data: null,
      });
    }

    // Check if user is enrolled
    const user = await User.findById(req.user.id).populate({
      path: "completedExams.exam",
      select: "_id",
    });
    if (!user.enrolledExams.includes(examId)) {
      logger.warn(`User ${req.user.id} is not enrolled in exam ${examId}`);
      return res.status(403).json({
        status: "failed",
        message: "User is not enrolled in this exam",
        data: null,
      });
    }

    // Check if the user has already completed the exam
    const existingResult = await Result.findOne({
      student: req.user.id,
      exam: examId,
    });

    const hasCompletedExam = existingResult !== null;

    // Return exam details along with the "alreadyGiven" field
    res.status(200).json({
      status: "success",
      message: "Exam started successfully",
      data: {
        examId: exam._id,
        title: exam.title,
        duration: exam.duration,
        questions: exam.questions,
        startTime: new Date(),
        totalMarks: exam.totalMarks,
        alreadyGiven: hasCompletedExam, // Indicates if the user has already given the exam
      },
    });
  } catch (error) {
    logger.error(`Failed to start exam: ${error.message}`, {
      stack: error.stack,
    });
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
      data: null,
    });
  }
};
// Generates analytics for exams created by the instructor or ExamId
/**
 * Generates analytics for exams created by the instructor
 * @route GET /api/exam/analytics
 * @access Private (Instructors only)
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user information
 * @param {Object} res - Express response object
 * @returns {Object} Response containing analytics data for instructor's exams
 */
exports.getExamAnalytics = async (req, res) => {
  if (req.user.role !== "admin") {
    logger.warn(
      `Unauthorized attempt to access admin exam analytics by non-admin user ${req.user.id}`
    );
    return res.status(403).json({
      status: "failed",
      message: "Only admins can access exam analytics",
    });
  }

  try {
    const userId = req.user.id;
    const examId = req.params.examId;

    // Validate examId
    if (examId && !mongoose.Types.ObjectId.isValid(examId)) {
      logger.warn(`Invalid exam ID format: ${examId}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid exam ID",
      });
    }

    logger.debug(
      `Fetching analytics for exams created by admin ${userId}${
        examId ? ` for exam ${examId}` : ""
      }`
    );

    // Build query object
    const query = { createdBy: userId };
    if (examId) {
      query._id = examId;
    }

    // Fetch exams based on query
    const exams = await Exam.find(query)
      .select("title _id duration startTime endTime totalMarks")
      .populate("questions");

    if (exams.length === 0) {
      logger.info(
        `No exams found for user ${userId}${
          examId ? ` and exam ${examId}` : ""
        }`
      );
      return res.status(404).json({
        status: "failed",
        message: "No exams found",
        data: [],
      });
    }

    logger.info(
      `Found ${exams.length} exams created by user ${userId} for analytics`
    );

    const analytics = [];

    for (const exam of exams) {
      const results = await Result.find({ exam: exam._id })
        .populate("student", "name email")
        .lean();

      if (results.length === 0) {
        analytics.push({
          examId: exam._id,
          examTitle: exam.title,
          totalStudents: 0,
          passedStudents: 0,
          passRate: 0,
          averageScore: 0,
          lowScore: 0,
          highScore: 0,
          duration: exam.duration,
          startTime: exam.startTime,
          endTime: exam.endTime,
          totalMarks: exam.totalMarks,
        });
        continue;
      }

      const totalStudents = results.length;
      const passedStudents = results.filter((result) => result.isPassed).length; // Count of students who passed
      const passRate = (passedStudents / totalStudents) * 100 || 0; // Pass rate in percentage
      
      
      const totalScore = results.reduce(
        (acc, result) => acc + result.totalScore,
        0
      );
      const averageScore = totalScore / totalStudents || 0; // Average score

      const scores = results.map((result) => result.totalScore);
      const lowScore = Math.min(...scores) || 0;
      const highScore = Math.max(...scores) || 0;

      analytics.push({
        examId: exam._id,
        examTitle: exam.title,
        totalStudents,
        passedStudents,
        passRate: Number(passRate.toFixed(2)),
        averageScore: Number(averageScore.toFixed(2)),
        lowScore,
        highScore,
        duration: exam.duration,
        startTime: exam.startTime,
        endTime: exam.endTime,
        totalMarks: exam.totalMarks,
        detailedResults: results.map((result) => ({
          studentName: result.student.name,
          studentEmail: result.student.email,
          score: result.totalScore,
          percentage: result.percentage,
          isPassed: result.isPassed,
          submittedAt: result.submittedAt,
        })),
      });
    }

    logger.info(
      `Analytics generated for ${analytics.length} exams by admin ${userId}`
    );

    res.status(200).json({
      status: "success",
      message: "Exam analytics fetched successfully",
      data: analytics,
    });
  } catch (error) {
    logger.error(
      `Error in getExamAnalytics for admin ${req.user.id}: ${error.message}`,
      { stack: error.stack }
    );
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
};
