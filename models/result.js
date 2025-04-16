const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ResultSchema = new Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    answers: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
        selectedOption: {
          type: String,
        },
        isCorrect: {
          type: Boolean,
        },
      },
    ],
    totalScore: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    isPassed: {
      type: Boolean,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    submittedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    proctorFlags: [
      {
        type: {
          type: String,
          enum: ["tab-switch", "full-screen-exit", "copy-paste", "other"],
        },
        description: String,
        timestamp: Date,
      },
    ],
  },
  { timestamps: true }
);

// Index for frequent queries
// ResultSchema.index({ exam: 1, student: 1 }); // explain

module.exports = mongoose.model("Result", ResultSchema);
