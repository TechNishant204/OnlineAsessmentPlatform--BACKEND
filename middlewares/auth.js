const jwt = require("jsonwebtoken");
require("dotenv").config(); // use:to fetch the environment variables from .env file
const User = require("../models/user");

// authentication middleware
exports.auth = async (req, res, next) => {
  try {
    // Extract token from various possible locations
    let token;

    // Check Authorization header (note the correct spelling "Authorization")
    const authHeader = req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }

    // If not in header, check cookies or body
    if (!token) {
      token = req.cookies.token || req.body.token;
    }

    // If token is still not found, return error
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Token is missing",
      });
    }

    // Verify the token
    try {
      const decodedPayload = jwt.verify(token, process.env.SECRET_KEY);
      console.log(decodedPayload);
      req.user = decodedPayload;
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid or expired token",
      });
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/*
//IsAdmin
exports.isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(400).json({
        success: false,
        message: "This is a protected route for Admin only",
      });
    }
    next();
  } catch (err) {
    console.log("error: ", err);
    return res.status(500).json({
      success: false,
      message: "User Role cannot be verified...",
    });
  }
};

//IsStudent
exports.isStudent = async (req, res, next) => {
  try {
    if (req.user.role !== "Student") {
      return res.status(400).json({
        success: false,
        message: "This is a protected route for Students only",
      });
    }
    next();
  } catch (err) {
    console.log("error: ", err);
    return res.status(500).json({
      success: false,
      message: "User Role cannot be verified",
    });
  }
};
*/
