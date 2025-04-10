const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./config/database.js");

//Import Routes
const authRoutes = require("./routes/authRoutes.js");
const examRoutes = require("./routes/exam.js");
const questionRoutes = require("./routes/question.js");
const resultRoutes = require("./routes/auth");
const { default: helmet } = require("helmet");

//Load environment variables
dotenv.config();

//Initialize express app
const app = express();

//Middleware
app.use(cors());
app.use(express.json());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));

//Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/exam", examRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/results", resultRoutes);

// connect to mongoDB
db.connectDb();

// Test route
app.get("/", (req, res) => {
  res.send("EduAssess is Running");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
