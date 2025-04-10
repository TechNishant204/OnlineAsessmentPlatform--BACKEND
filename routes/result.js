const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const auth = require("../middlewares/auth");
const resultController = require("../controllers/resultController");

// @route   POST api/results
// @desc    Create a new result
// @access  Private

router.post(
  "/",
  [
    auth,
    [
      check("exam", "Exam ID is required").not().isEmpty(),
      check("answer", "Answers are required").isArray(),
      check("startTime", "Start time is required").not().isEmpty(),
    ],
  ],
  resultController.createResult
);

// @route GET api/results
// @desc Get all results
// @access Private(Admin)
router.get("/", auth, resultController.getAllResults);

// @route GET api/results/exam/:exam_id
// @desc Get all results for a specific exam by examID
// @access Private(Admin)
router.get("/exam/:exam_id", auth, resultController.getResultsByExam);

// @route GET api/results/student/:student_id
// @desc Get results by studentID
// @access private (admin only)
router.get("/student/:student_id", auth, resultController.getResultsByStudent);

// @route GET api/results/me
// @desc Get all result for the logged-in student
// @access Private
router.get("/me", auth, resultController.getMyResults);

// @route   DELETE api/results/:id
// @desc    Delete a result
// @access  Private (Admin)
router.delete("/:id", auth, resultController.deleteResult);

//@route GET api/result/
// @desc get analytics
router.get("/result/analytics", auth, resultController.getExamAnalytics);
module.exports = router;
