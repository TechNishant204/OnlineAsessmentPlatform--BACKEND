const mongoose = require("mongoose");

exports.connectDb = async () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB successfully..."))
    .catch((err) => {
      console.log("Failed Connection to MongoDB", err.message);
      process.exit(1);
    });
};
