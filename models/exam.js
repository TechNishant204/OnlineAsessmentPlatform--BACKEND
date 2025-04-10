const mongoose = require(mongoose);

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
      type: Number, //in minutes
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

examSchema.pre("remove", async function (next) {
  try {
    // Remove exam from all users' exam lists
    await this.model("User").updateMany(
      { exams: this._id },
      { $pull: { exams: this._id } }
    );

    await this.model("Submission").deleteMany({ exam: this._id });
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model("Exam", examSchema); // here we are creating a model called Exam and passing the schema to it
// This model will be used to interact with the exams collection in the database
