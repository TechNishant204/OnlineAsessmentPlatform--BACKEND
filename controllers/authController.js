/**
 * Authentication Controller
 * Handles user registration, login, and password management
 */

const { validationResult } = require("express-validator");
const User = require("../models/user");
require("dotenv").config();

const crypto = require("crypto");
const Profile = require("../models/profile"); // Import the Profile model
const { createAccessToken } = require("../utils/jwtUtils");
const {
  sendSignupConfirmationEmail,
  sendPasswordResetEmail,
} = require("../utils/emailService");
const logger = require("../utils/loggerUtils"); // for logger utility

/**
 * User registration
 * @route POST /api/auth/register
 * @access Public
 */
exports.registerUser = async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { name, email, password, role, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create new user (password hashed via pre-save hook)
    const user = await User.create({
      name,
      email,
      password,
      role: role || "student", // Default to student if not specified
      phone,
    });

    // Create profile for new user
    await Profile.createProfileForUser(user._id);

    // Send welcome email
    try {
      await sendSignupConfirmationEmail(email, name);
    } catch (emailError) {
      logger.warn(
        `Failed to send welcome email to ${email}: ${emailError.message}`
      );
      // We continue despite email failure
    }

    // Remove password from response
    const userData = user.toObject(); // converting mongoose document to plain object
    delete userData.password;

    return res.status(201).json({
      status: "success",
      message: "User registered successfully",
      data: userData,
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    return res.status(500).json({
      status: "failure",
      message: "An error occurred during registration",
    });
  }
};

/**
 * User login
 * @route POST /api/auth/login
 * @access Public
 */
exports.loginUser = async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn("Validation failed during login", { errors: errors.array() });
      return res.status(400).json({
        status: "failure",
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Login attempt with non-existent email", { email });
      return res.status(401).json({
        status: "failure",
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      logger.warn("Login attempt with incorrect password", { email });
      return res.status(401).json({
        status: "failure",
        message: "Invalid credentials",
      });
    }

    // Log user details before token creation
    logger.info("User authenticated, preparing token", {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Generate access token with explicit string conversion
    const token = createAccessToken({
      id: user._id.toString(), // Convert ObjectId to string
      name: user.name,
      email: user.email,
      role: user.role,
    });

    // Update user's last login timestamp
    user.updatedAt = Date.now();
    await user.save();

    logger.info("User logged in successfully", { userId: user._id.toString() });

    // Return successful response
    return res.status(200).json({
      status: "success",
      message: "Authentication successful",
      token,
      user: {
        id: user._id.toString(), // Ensure string in response too
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error("Login error", { error: error.message, stack: error.stack });
    return res.status(500).json({
      status: "failure",
      message: "An error occurred during login",
    });
  }
};

/**
 * Password reset request
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "failure",
        message: "Email is required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        status: "success",
        message:
          "If your email is registered, you will receive a password reset link",
      });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Save the token in the user document for later verification
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 3600000; // 1 hour
    await user.save();

    // Create reset link
    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Check (utils -> email Service )send email to user via nodemailer - send(email,resetLink)
    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetLink);
    } catch (emailError) {
      logger.error(
        `Failed to send password reset email: ${emailError.message}`
      );
      return res.status(500).json({
        status: "failure",
        message: "Failed to send password reset email",
      });
    }

    return res.status(200).json({
      status: "success",
      message:
        "If your email is registered, you will receive a password reset link",
    });
  } catch (err) {
    logger.error(`Forgot password error: ${err.message}`);
    return res.status(500).json({
      status: "failure",
      message: "An error occurred while processing your request",
    });
  }
};

/**
 * Verify reset token
 * @route GET api/auth/reset-password/:token
 * @access Public
 */
exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        status: "failure",
        message: "Token is required",
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid or expired token",
      });
    }

    // Return response with user email
    return res.status(200).json({
      status: "success",
      message: "Token verified successfully",
      email: user.email,
    });
  } catch (error) {
    logger.error(`Token verification error: ${error.message}`);
    return res.status(500).json({
      status: "failure",
      message: "An error occurred while verifying the token",
    });
  }
};

/**
 * Reset password with token
 * @route POST /api/auth/reset-password
 * @access Public
 */
exports.resetPassword = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    // check if token is valid
    if (!token) {
      return res.status(403).json({
        status: "failure",
        message: "Token is required",
      });
    }
    const { password } = req.body;

    //validation
    if (!password) {
      return res.status(403).json({
        status: "failure",
        message: "Password is required",
      });
    }

    // Password strength validation
    const PASSWORD_REGEX = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/;
    if (password.length < 8 || !PASSWORD_REGEX.test(password)) {
      return res.status(400).json({
        status: "failure",
        message:
          "Password must be at least 8 characters long and contain letters, numbers, and special characters",
      });
    }

    // Find user with valid token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        status: "failure",
        message: "Invalid or expired token",
      });
    }

    //hashed the password using pre save hook in user model
    user.password = password;

    // reset the token and expiration time so that it can't be used again
    user.resetToken = undefined;
    user.resetTokenExpiration = undefined;
    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Password Updated Successfully",
    });
  } catch (err) {
    logger.error(`Password reset error: ${err.message}`);
    return res.status(500).json({
      status: "failure",
      message: "An error occurred while resetting your password",
    });
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 * @access Public
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    if (!refreshToken) {
      return res.status(400).json({
        status: "failure",
        message: "Refresh token is required",
      });
    }

    // Verify the refresh token
    let userId;
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      userId = decoded.sub;
    } catch (err) {
      return res.status(401).json({
        status: "failure",
        message: "Invalid refresh token",
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        status: "failure",
        message: "User not found",
      });
    }

    // Generate new access token
    const accessToken = createAccessToken(user);

    return res.status(200).json({
      status: "success",
      accessToken,
    });
  } catch (error) {
    logger.error(`Token refresh error: ${error.message}`);
    return res.status(500).json({
      status: "failure",
      message: "Failed to refresh access token",
    });
  }
};
