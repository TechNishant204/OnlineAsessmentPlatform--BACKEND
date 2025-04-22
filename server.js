const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./config/database");
const logger = require("./utils/loggerUtils");
const helmet = require("helmet");
// const cookieParser = require("cookie-parser");

//Import Routes
const authRoutes = require("./routes/authRoutes");
const examRoutes = require("./routes/examRoutes");
const questionRoutes = require("./routes/questionRoutes");
const resultRoutes = require("./routes/resultRoutes");
const profileRoutes = require("./routes/profileRoutes");

//Load environment variables
dotenv.config();

//Initialize express app
const app = express();

//Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Origin", "Accept"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 600,
  })
);

app.use(express.json());
app.use(logger.middleware);
app.use(helmet());
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
  logger.info("Root endpoint accessed");
  res.send("EduAssess is Running");
});

app.use((err, _, res, _next) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
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
