// utils/jwtUtils.js
const jwt = require("jsonwebtoken");
const logger = require("../utils/loggerUtils");

const JWT_CONFIG = {
  SECRET: process.env.JWT_SECRET || "default-secret",
  ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || "1h",
  ALGORITHM: "HS256",
};

if (!JWT_CONFIG.SECRET) {
  logger.error("JWT_SECRET environment variable is not set!");
  throw new Error("JWT_SECRET environment variable is not set!");
}

const createAccessToken = (user) => {
  if (!user || !user.id || typeof user.id !== "string") {
    logger.warn("Invalid user object for access token creation", { user });
    throw new Error("Invalid user object: id is required and must be a string");
  }

  const payload = {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    role: user.role || "user",
  };

  logger.info("Creating access token for user", {
    userId: user.id,
    role: user.role,
  });
  return jwt.sign(payload, JWT_CONFIG.SECRET, {
    algorithm: JWT_CONFIG.ALGORITHM,
    expiresIn: JWT_CONFIG.ACCESS_EXPIRY,
  });
};

const verifyToken = (token) => {
  if (!token || typeof token !== "string") {
    logger.warn("Token verification attempted with invalid input", { token });
    throw new Error("Token is required and must be a string");
  }

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET, {
      algorithms: [JWT_CONFIG.ALGORITHM],
    });
    logger.info("Token verified successfully", { userId: decoded.id });
    return decoded;
  } catch (error) {
    logger.error("Token verification failed", { error: error.message });
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }
};

module.exports = { createAccessToken, verifyToken };
