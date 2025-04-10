const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const User = require("../models/user");

exports.signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password, role, phone } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({
        message: false,
        error: "User Already Exists..",
      });
    }

    // Create new user
    // hashed the password using pre save hook
    const savedUser = await User.create({ name, email, password, role, phone });
    console.log("savedUser", savedUser);

    return res.status(201).json({
      message: "User Registered Successfully",
      data: savedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: "false",
      error: "Internal Server Error",
    });
  }
};

//Login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  console.log(req.body);
  //Validation
  if (!email || !password) {
    res.status(400).json({
      message: "Email and Password are required",
    });
  }

  try {
    //Check if the user exists
    const user = await User.findOne({ email });
    console.log("UserDB", user);
    if (!user) {
      res.status(404).json({
        message: "User not found",
      });
    }

    //Check if the password is correct
    const isMatch = await comparePassword(password, user.password);
    console.log("Password_Match", isMatch);
    if (!isMatch) {
      res.status(400).json({
        message: "Invalid Credentials",
      });
    }

    //Create a token
    const token = createToken(user);
    console.log(token);
    res.status(200).json({
      message: "User logged in successfully",
      token: token,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
