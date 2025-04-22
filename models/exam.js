const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question", // Reference to the Question model
      },
    ],
    totalMarks: {
      type: Number,
      required: true,
    },
    passingMarks: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for performance
// creates an ascending index on the createdBy field. It will speed up queries that:
// Search for exams by creator
// Sort exams by creator
// Use createdBy in where clauses
// examSchema.index({ createdBy: 1 });

// This creates an ascending index on the questions field. It optimizes queries that:
// Search for exams based on questions
// Sort exams by questions
// Use questions in where clauses
// examSchema.index({ questions: 1 });

module.exports = mongoose.model("Exam", examSchema);
