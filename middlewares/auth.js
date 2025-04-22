require("dotenv").config();
const { verifyToken } = require("../utils/jwtUtils");
const logger = require("../utils/loggerUtils");

// Authentication middleware
exports.auth = async (req, res, next) => {
  try {
    console.log("Auth middleware started");
    let token;

    // Extract token from Authorization header
    const authHeader = req.header("Authorization");
    // console.log("Auth header:", authHeader);

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
      // console.log("Token extracted from header");
    }

    // Fallback to cookies or body
    if (!token) {
      token = req.cookies.token || req.body.token;
      // console.log("Token from cookies/body:", token ? "found" : "not found");
    }

    // If no token is found, return error
    if (!token) {
      console.log("No token found in request");
      return res.status(401).json({
        status: "failure",
        message: "Authentication failed: Token is missing",
      });
    }

    // console.log("About to verify token");

    // Verify token using the utility function
    const decodedPayload = verifyToken(token);
    // console.log("Token verified, payload:", decodedPayload);

    // Ensure decoded payload has an id
    if (!decodedPayload.id) {
      console.log("No id in token payload:", decodedPayload);
      return res.status(401).json({
        status: "failure",
        message: "Authentication failed: Invalid token payload",
      });
    }

    // Attach user to request
    req.user = decodedPayload;
    console.log("User attached to request:", req.user);
    next();
  } catch (err) {
    console.error("Auth middleware error:", err.message);
    return res.status(401).json({
      status: "failure",
      message: "Authentication failed: Invalid or expired token",
    });
  }
};

// Middleware to check if user is admin
exports.isAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      logger.warn(
        `Access denied: Non-admin user ${req.user.id} attempted to access admin route`
      );
      return res.status(403).json({
        status: "failed",
        error: "Access denied. Admin only.",
      });
    }
    next();
  } catch (err) {
    console.log("error: ", err);
    return res.status(500).json({
      status: "failure",
      message: "User Role cannot be verified...",
    });
  }
};

// Middleware to check if user is student
exports.isStudent = async (req, res, next) => {
  try {
    if (req.user.role !== "student") {
      logger.warn(
        `Access denied: Non-student user ${req.user.id} attempted to access student route`
      );
      return res.status(403).json({
        status: "failed",
        error: "Access denied. Student only.",
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
