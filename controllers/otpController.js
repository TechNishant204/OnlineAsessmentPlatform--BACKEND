const User = require("../models/user");
const OTP = require("../models/otp");

const { generateOTP, sendOTPEmail, verifyOTP } = require("../utils/otpUtils");

/**
 * Send OTP to user email
 * @param {Object} req - Express request object with email in body
 * @param {Object} res - Express response object
 */

exports.sendOTP = async (req, res) => async (req, res) => {
  try {
    // Fetch email from request body
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user already exists
    const checkUserPresent = await User.findOne({ email: email });

    //If user already exists, return a response
    if (checkUserPresent) {
      return res.status(401).json({
        success: false,
        message: "User is already registered",
      });
    }

    const otp = await generateOTP(OTP);
    console.log("OTP generated:", otp);

    // create otp record in database
    const otpPayload = { email, otp };
    const otpBody = await OTP.create(otpPayload);
    console.log("OTP created: ", otpBody);

    //send OTP via email
    sendOTPEmail(email, otp);

    // return response
    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: otp, // for development only
    });
  } catch (err) {
    console.error("Error in sending otp", err);
    return res.status(500).json({
      success: false,
      message: "Error generating OTP",
    });
  }
};
