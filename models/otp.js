const mongoose = require("mongoose");

const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Automatically expire documents after 10 minutes (600 seconds)
  },
});

module.exports = mongoose.model("OTP", OTPSchema);
