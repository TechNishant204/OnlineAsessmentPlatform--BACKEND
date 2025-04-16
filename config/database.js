const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

exports.connectDB = async () => {
  await mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB Successfully..."))
    .catch((err) => {
      console.log("Connection Failed to MongoDB:", err);
      process.exit(1);
    });
};
