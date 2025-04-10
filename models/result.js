const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ResultSchema = new Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    answers: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "question",
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

module.exports = Result = mongoose.model("result", ResultSchema);
