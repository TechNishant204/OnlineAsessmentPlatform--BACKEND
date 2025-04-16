const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // Import bcrypt for password hashing

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
      required: true,
    },
    phone: {
      type: Number,
      required: true,
    },
    enrolledExams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exam", // Reference to the Exam model
      },
    ],
    completedExams: [
      {
        exam: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Exam",
        },
        result: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Result",
        },
      },
    ],
    resetToken: {
      type: String,
    },
    resetTokenExpiration: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Hash the password before saving the user
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare the provided password with the hashed password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error(err);
  }
};

module.exports = mongoose.model("User", userSchema); // here we are creating a model called User and passing the schema to it
