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
const emailService = require("../utils/emailService");
const User = require("../models/user");
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
    return res.status(400).json({ errors: errors.array() });
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

    // Validate questions array if provided (ask mentor)
    if (questions && !Array.isArray(questions)) {
      return res
        .status(400)
        .json({ status: "failed", message: "Questions must be an array" });
    }

    // Create new exam
    const exam = new Exam({
      title,
      description,
      duration,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
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
    // Get all exams
    const exams = await Exam.find()
      .populate("questions", "text type marks")
      .populate("createdBy", "name email");

    if (!exams || exams.length === 0) {
      logger.info("No exams found in database");
      return res
        .status(404)
        .json({ status: "fail", message: "No exams found" });
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
      status: "fail",
      message: "Server Error",
    });
  }
};

/**
 * Retrieves available exams for students
 * @async
 * @function getAvailableExams
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with available exams or error message
 */
exports.getAvailableExams = async (req, res) => {
  try {
    const now = new Date();

    // Get exams that are active and not yet ended
    const exams = await Exam.find({
      isActive: true,
      endTime: { $gt: now },
    })
      .select("title description duration startTime endTime totalMarks")
      .lean();

    logger.debug(`Found ${exams.length} available exams`);
    console.log(exams);

    if (!exams || exams.length === 0) {
      logger.info("No available exams found for students");
      return res.status(404).json({
        status: "success",
        message: "No available exams found",
      });
    }

    logger.info(`Retrieved ${exams.length} available exams successfully`);

    res.json({
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
    });
  }
};

/**
 * Retrieves exam by ID
 * @async
 * @function getExamById
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Exam ID
 * @param {Object} req.user - User object containing role information
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with exam data or error message
 */
exports.getExamById = async (req, res) => {
  try {
    const examId = req.params.id;
    logger.debug(`Fetching exam with ID: ${examId}`);

    // find exam by ID
    const exam = await Exam.findById(examId)
      .populate("questions", "text type options marks")
      .populate("createdBy", "name email");

    // Check if exam ID is valid
    if (!exam) {
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }

    //If student is accessing, don't send the correct answer
    let sanitizedExam = exam.toObject();
    if (req.user.role === "student") {
      sanitizedExam.questions.forEach((question) => {
        if (question.options) {
          question.options.forEach((option) => {
            delete option.isCorrect; // Assuming options might have isCorrect in the future
          });
        }
      });
    }

    logger.info(
      `Successfully retrieved exam: ${examId} for user: ${req.user.id}`
    );

    // send the modified exam data back to the client
    res.status(200).json({
      status: "success",
      message: "Exam fetched successfully",
      data: sanitizedExam,
    });
  } catch (error) {
    logger.error(`Failed to fetch exam: ${error.message}`, {
      stack: error.stack,
    });

    // Check if the error is due to an invalid ObjectId
    if (error.kind === "ObjectId") {
      logger.warn(`Invalid exam ID format: ${req.params.id}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid exam ID",
      });
    }
    return res.status(500).json({
      status: "failed",
      message: "Server Error",
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
 * @returns {Object} JSON response with updated exam data or error message
 */
exports.updateExam = async (req, res) => {
  try {
    // fetch exam Id from params
    const examId = req.params.id;
    logger.debug(`Attempting to update exam ID: ${examId}`);

    // find the exam by ID
    let exam = await Exam.findById(examId);
    if (!exam) {
      logger.info(`Update failed - Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }

    // Update exam fields
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

    logger.debug(
      `Updating exam with fields: ${JSON.stringify(Object.keys(updateFields))}`
    );

    // Update exam in database
    exam = await Exam.findByIdAndUpdate(
      examId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

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

    // Check if the error is due to an invalid ObjectId
    if (error.kind === "ObjectId") {
      logger.warn(`Invalid exam ID format for update: ${req.params.id}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid exam ID",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
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
 * @returns {Object} JSON response with success message or error message
 */
exports.deleteExam = async (req, res) => {
  try {
    const examId = req.params.id;
    logger.debug(`Attempting to delete exam ID: ${examId}`);

    // fetch examId from req.params and then find exam by id
    const exam = await Exam.findById(examId);

    // if exam is not found
    if (!exam) {
      logger.info(`Delete failed - Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found or already deleted",
      });
    }

    /* Remove exam from all users' exam lists
    The $pull operator removes a specific value (this._id) from the exams array for all matching users.
    If  exists in the  array of a user, it will be deleted.
    */
    await User.updateMany(
      { enrolledExams: examId },
      { $pull: { enrolledExams: examId } }
    );

    /* Delete submissions related to this exam
        if (global.Submission) {
         await global.Submission.deleteMany({ exam: exam._id });
     }
    */

    // Delete the exam
    await exam.deleteOne();

    logger.info(`Exam deleted successfully: ${examId} by user ${req.user.id}`);

    res.status(200).json({
      status: "success",
      message: "Exam Removed Successfully",
      RemovedExam: exam,
    });
  } catch (error) {
    logger.error(`Failed to delete exam: ${error.message}`, {
      stack: error.stack,
    });

    // Check if the error is due to an invalid ObjectId
    if (error.kind === "ObjectId") {
      logger.warn(`Invalid exam ID format for deletion: ${req.params.id}`);
      return res.status(400).json({
        status: "failed",
        message: "Invalid Exam ID",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
    });
  }
};

/**
 * Enrolls a user in an exam
 * @async
 * @function enrollInExam
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Exam ID
 * @param {Object} req.user - User object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with success message or error message
 */
exports.enrollInExam = async (req, res) => {
  try {
    const examId = req.params.id;
    const userId = req.user.id;

    logger.debug(`User ${userId} attempting to enroll in exam ${examId}`);

    // // Only allow students to enroll
    // if (userRole !== "student") {
    //   logger.info(
    //     `Enrollment failed - User ${userId} with role ${userRole} not authorized to enroll`
    //   );
    //   return res.status(403).json({
    //     status: "failed",
    //     message: "Only students can enroll in exams",
    //   });
    // }

    // fetch exam details using req.params.id
    const exam = await Exam.findById(examId);

    // Check if the exam exists
    if (!exam) {
      logger.info(`Enrollment failed - Exam not found with ID: ${examId}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }
    // check if exam is active
    if (!exam.isActive) {
      logger.info(`Enrollment failed - Exam ${examId} is not active`);
      return res.status(400).json({
        status: "failed",
        message: "Exam is not active",
      });
    }
    // check if exam is already started
    if (new Date(exam.startTime) < new Date()) {
      logger.info(
        `Enrollment failed - Enrollment period has ended for exam ${examId}`
      );
      return res
        .status(400)
        .json({ status: "failed", message: "Enrollment period has ended" });
    }

    // check if user is already enrolled
    const newUser = await User.findById(userId);
    if (newUser.enrolledExams.includes(examId)) {
      logger.info(`User ${userId} is already enrolled in exam ${examId}`);
      return res.status(400).json({
        status: "failed",
        message: "You are already enrolled in this exam",
      });
    }

    // Add exam to user's enrolled exams array
    newUser.enrolledExams.push(examId);

    // After adding exam in enrolledExams Save user document
    await newUser.save();

    logger.info(`User ${userId} successfully enrolled in exam ${examId}`);

    // Send email notification
    try {
      await emailService.sendExamEnrollmentEmail(
        newUser.email,
        newUser.name,
        exam.title,
        exam.duration,
        exam.startTime,
        exam.questions.length
      );
      logger.info(
        `Enrollment confirmation email sent to ${newUser.email} for exam ${examId}`
      );
    } catch (emailError) {
      logger.warn(
        `Failed to send enrollment email to ${newUser.email}: ${emailError.message}`
      );
      // Continue despite email failure
    }

    res.status(200).json({
      status: "success",
      message: "Successfully Enrolled in exam",
      exam: exam,
      student: {
        _id: newUser._id,
        name: newUser.name,
        enrolledExams: newUser.enrolledExams,
      },
    });
  } catch (error) {
    logger.error(`Failed to enroll in exam: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      logger.warn(`Invalid exam ID format for enrollment: ${req.params.id}`);
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server Error",
    });
  }
};
