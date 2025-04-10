/**
 * @module examController
 * @requires express-validator
 * @requires ../models/exam
 * @requires ../services/emailService
 * @requires ../models/user
 */
const { validationResult } = require("express-validator");
const Exam = require("../models/exam");
const emailService = require("../services/emailService");
const User = require("../models/user");
const user = require("../models/user");

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

    // Create new exam
    const exam = new Exam({
      title,
      description,
      duration,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      questions,
      totalMarks,
      passingMarks,
      createdBy: req.user.id,
    });

    await exam.save();

    res.status(201).json({
      status: success,
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error) {
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
    const exams = await Exam.find()
      .populate("questions", "text type marks")
      .populate("createdBy", "name");

    if (!exams) {
      return res.status(404).json({
        status: "fail",
        message: "No exams found",
      });
    }
    res.status(200).json({
      status: "success",
      message: "Exams fetched successfully",
      data: exams,
    });
  } catch (err) {
    console.error(err);
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
    }).select("title description duration startTime endTime totalMarks");
    console.log(exams);
    if (!exams || exams.length === 0) {
      return res.status(404).json({
        status: "failed",
        message: "No available exams found",
      });
    }
    res.json({
      status: success,
      message: "Available exams fetched successfully",
      data: exams,
    });
  } catch (err) {
    console.error("Failed to fetch the exam", err.message);
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
    const exam = await Exam.findById(examId).populate(
      "questions",
      "text type options marks"
    );

    if (!exam) {
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }

    //If student is accessing, don't send the correct answer
    if (req.user.role === "student") {
      // Remove isCorrect field from options

      // converting a Mongoose (MongoDB) document object called exam
      //  into a plain JavaScript object by using the .toObject() method
      const sanitizedExam = exam.toObject();
      if (sanitizedExam.questions) {
        if (questions.options) {
          questions.options.forEach((option) => {
            delete option.isCorrect;
          });
        }
      }
    }

    // send the modified exam data back to the client
    res.status(200).json({
      status: "success",
      message: "Exam fetched successfully",
      data: sanitizedExam,
    });
  } catch (err) {
    console.error("Failed to fetch the exam", err.message);
    // Check if the error is due to an invalid ObjectId
    if (err.kind === "ObjectId") {
      res.status(400).json({
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
    let exam = await Exam.findById(req.params.id);
    if (!exam) {
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
      } else {
        updateFields[key] = value;
      }
    }

    exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json({
      status: "success",
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (err) {
    console.error("Failed to update the exam", err.message);
    // Check if the error is due to an invalid ObjectId
    if (err.kind === "ObjectId") {
      res.status(400).json({
        status: "failed",
        message: "Invalid exam ID",
      });
    }
    res.status(500).json({
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
    // fetch examId from req.params and then find exam by id
    const exam = await Exam.findById(req.params.id);

    // if exam is not found
    if (!exam) {
      return res.status(404).json({
        status: "failed",
        message: "Exam not found or already deleted",
      });
    }

    /* Remove exam from all users' exam lists
    The $pull operator removes a specific value (this._id) from the exams array for all matching users.
    If  exists in the  array of a user, it will be deleted.
    await User.updateMany({ exams: exam._id }, { $pull: { exams: exam._id } });
    */
    /* Delete submissions related to this exam
        if (global.Submission) {
         await global.Submission.deleteMany({ exam: exam._id });
     }
    */

    // Delete the exam
    await exam.deleteOne();

    res.status(200).json({
      status: "success",
      message: "Exam Removed Successfully",
    });
  } catch (err) {
    console.error("Failed To Delete The Exam", err.message);
    // Check if the error is due to an invalid ObjectId
    if (err.kind === "ObjectId") {
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

// check if user is already enrolled
/**
 * @description Finds a single user record by their ID in the database
 * @param {Object} newUser - The user object retrieved from the database
 * @property {string} newUser._id - The unique identifier of the user
 * @property {string} newUser.id - User ID from the request
 * @throws {Error} If user is not found or database error occurs
 * @returns {Promise<Object>} Promise that resolves to the user document
 */
exports.enrollInExam = async (req, res) => {
  try {
    // fetch exam details using req.params.id
    const exam = await Exam.findById(req.params.id);

    // Check if the exam exists
    if (!exam) {
      return res.status(404).json({
        status: "failed",
        message: "Exam not found",
      });
    }

    // check if exam is active
    if (!exam.isActive) {
      return res.status(400).json({
        status: "failed",
        message: "Exam is not active",
      });
    }

    // check if exam is already started
    if (exam.startTime < Date.now()) {
      return res.status(400).json({
        status: "failed",
        message: "Enrollment period has ended",
      });
    }

    // check if user is already enrolled
    const newUser = await User.findById(req.user.id); // need to recheck
    if (newUser.enrolledExams.includes(exam._id)) {
      return res.status(400).json({
        status: "failed",
        message: "You are already enrolled in this exam",
      });
    }

    // Add exam to user's enrolled exams array
    newUser.enrolledExams.push(exam._id);

    // After adding exam in enrolledExams Save user document
    await newUser.save();

    // Send email notification
    await emailService.sendExamEnrollmentEmail(
      newUser.email,
      newUser.name,
      exam.title,
      exam.duration,
      exam.startTime,
      exam.questions.length
    );

    res.status(200).json({
      status: "success",
      message: "Successfully Enrolled in exam",
      exam: exam._id,
    });
  } catch (error) {
    if (err.kind === "ObjectId") {
      return res.status(404).json({ msg: "Exam not found" });
    }
    res.status(500).send("Server error");
  }
};
