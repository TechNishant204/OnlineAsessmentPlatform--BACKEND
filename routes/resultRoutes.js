// src/routes/resultRoutes.js
const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const { auth, isStudent, isAdmin } = require("../middlewares/auth");
const mongoose = require("mongoose");
const {
  submitExam,
  getAllResultsByExamId,
  getResultByResultId,
  deleteResult,
} = require("../controllers/resultController");

const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      status: "failed",
      message: "Invalid exam ID",
      data: null,
    });
  }
  next();
};

// @route GET api/result/exam/:examId
// @desc Get all results for a specific exam by examId
// @access Private (Admin)
router.get(
  "/exam/:id",
  [auth, isAdmin],
  validateObjectId,
  getAllResultsByExamId
);
// @route   POST api/result/
// @desc    Create a new result
// @access  Private
router.post("/", auth, isStudent, submitExam);

// @route GET api/results/analytics
// @desc Get analytics for exams created by instructor
// @access Private
// router.get("/analytics", [auth, isAdmin], getExamAnalytics);

// @route GET api/result/:id
// @desc Get result by ID
// @access Private
router.get("/:id", auth, validateObjectId, getResultByResultId);

// @route DELETE api/results/:id
// @desc Delete a result
// @access Private (Admin)
router.delete("/:id", validateObjectId, [(auth, isAdmin)], deleteResult);

// @route GET api/results/student
// @desc Get results for the current student
// @access Private
// router.get("/student", [auth, isStudent], getStudentResults);

module.exports = router;

// @route GET api/results/me
// @desc Get all results for the logged-in student
// @access Private
// router.get("/my-result", [auth, isStudent], getMyResults);

// @route GET api/result
// @desc Get all results
// @access Private (Admin)
// router.get("/", [auth, isAdmin], getAllResults);
