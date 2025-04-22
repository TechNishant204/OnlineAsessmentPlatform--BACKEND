import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./config/database.js";
import logger from "./utils/loggerUtils.js";
import helmet from "helmet";
// const cookieParser = require("cookie-parser");

//Import Routes
const authRoutes = require("./routes/authRoutes.js");
const examRoutes = require("./routes/examRoutes.js");
const questionRoutes = require("./routes/questionRoutes.js");
const resultRoutes = require("./routes/resultRoutes.js");
const profileRoutes = require("./routes/profileRoutes.js");

//Load environment variables
dotenv.config();

//Initialize express app
const app = express();

//Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

app.use(express.json());
app.use(logger.middleware); // use the logger middleware
app.use(helmet()); // use helmet for security
app.use(express.urlencoded({ extended: true }));

//Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/result", resultRoutes);
app.use("/api/profile", profileRoutes);

// connect to mongoDB
db.connectDB();

app.get("/", (_, res) => {
  logger.info("Root endpoint accessed"); // Added logging for the root endpoint
  res.send("EduAssess is Running");
});


app.use((err, _, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});
});

// Handle 404 routes
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`, {
    stack: err.stack,
  });
  console.error("Unhandled Promise Rejection:", err);
});
