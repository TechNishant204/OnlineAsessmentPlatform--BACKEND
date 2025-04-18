const Profile = require("../models/profile");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const logger = require("../utils/loggerUtils");

/**
 * Get current user's profile
 * @async
 * @function getCurrentProfileByUserId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with user profile data
 */
exports.getCurrentProfileByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    logger.debug(
      `Fetching profile for user ${userId} with role ${req.user.role}`
    );

    // Find profile and populate with user data
    const profile = await Profile.findOne({ user: userId }).populate({
      path: "user",
      select: "-password -resetToken -resetTokenExpiration",
      populate: [
        {
          path: "enrolledExams",
          select: "title description subject startTime endTime duration",
        },
        {
          path: "completedExams.exam",
          select: "title subject duration",
        },
        {
          path: "completedExams.result",
          select: "score totalMarks submittedAt",
        },
      ],
    });

    // If no profile exists, create one
    if (!profile) {
      logger.info(`Profile not found for user ${userId}, creating new profile`);
      const newProfile = new Profile({ user: userId });
      await newProfile.save();

      // Fetch user data for the new profile
      const freshProfile = await Profile.findOne({ user: userId }).populate({
        path: "user",
        select: "-password -resetToken -resetTokenExpiration",
      });

      return res.status(200).json({
        status: "success",
        data: freshProfile,
      });
    }

    // Add role-specific statistics
    const responseProfile = profile.toObject();

    if (profile.user.role === "student") {
      responseProfile.statistics = {
        totalExamsEnrolled: profile.user.enrolledExams.length,
        totalExamsCompleted: profile.user.completedExams.length,
        // Calculate average score if there are completed exams with results
        averageScore:
          profile.user.completedExams.length > 0
            ? profile.user.completedExams.reduce((sum, exam) => {
                if (exam.result) {
                  return (
                    sum + (exam.result.score / exam.result.totalMarks) * 100
                  );
                }
                return sum;
              }, 0) /
                profile.user.completedExams.filter((exam) => exam.result)
                  .length || 0
            : 0,
      };
    }

    logger.info(`Profile successfully retrieved for user ${userId}`);

    return res.status(200).json({
      status: "success",
      data: responseProfile,
    });
  } catch (error) {
    logger.error(`Error fetching user profile: ${error.message}`, {
      stack: error.stack,
    });

    return res.status(500).json({
      status: "failed",
      message: "Server error while retrieving profile",
    });
  }
};

/**
 * Update user profile
 * @async
 * @function updateProfileByUserId
 * @param {Object} req - Express request object
 * @param {Object} req.body - Fields to update
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated profile
 */
exports.updateProfileByUserId = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(
      `Validation error in profile update: ${JSON.stringify(errors.array())}`
    );
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    logger.debug(`Attempting to update profile for user ${userId}`);

    const { bio, education, preferences, socialLinks, adminInfo } = req.body;

    // Build profile update object
    const profileFields = {};

    if (bio) profileFields.bio = bio;

    // Update education fields if provided
    if (education) {
      profileFields.education = {};
      if (education.institution)
        profileFields.education.institution = education.institution;
      if (education.degree) profileFields.education.degree = education.degree;
      if (education.fieldOfStudy)
        profileFields.education.fieldOfStudy = education.fieldOfStudy;
      if (education.graduationYear)
        profileFields.education.graduationYear = education.graduationYear;
    }

    // Update preferences if provided
    if (preferences) {
      profileFields.preferences = {};
      if (preferences.examNotifications !== undefined)
        profileFields.preferences.examNotifications =
          preferences.examNotifications;
      if (preferences.resultNotifications !== undefined)
        profileFields.preferences.resultNotifications =
          preferences.resultNotifications;
      if (preferences.theme)
        profileFields.preferences.theme = preferences.theme;
    }

    // Update social links if provided
    if (socialLinks) {
      profileFields.socialLinks = {};
      if (socialLinks.website)
        profileFields.socialLinks.website = socialLinks.website;
      if (socialLinks.linkedin)
        profileFields.socialLinks.linkedin = socialLinks.linkedin;
      if (socialLinks.github)
        profileFields.socialLinks.github = socialLinks.github;
    }

    // Only admins can update adminInfo
    if (req.user.role === "admin" && adminInfo) {
      profileFields.adminInfo = {};
      if (adminInfo.companyName)
        profileFields.adminInfo.companyName = adminInfo.companyName;
      if (adminInfo.companySize)
        profileFields.adminInfo.companySize = adminInfo.companySize;
      if (adminInfo.jobTitle)
        profileFields.adminInfo.jobTitle = adminInfo.jobTitle;
      if (adminInfo.country)
        profileFields.adminInfo.country = adminInfo.country;
      if (adminInfo.companyType)
        profileFields.adminInfo.companyType = adminInfo.companyType;
    }

    // Find and update profile
    let profile = await Profile.findOne({ user: userId });

    if (profile) {
      // Update existing profile
      profile = await Profile.findOneAndUpdate(
        { user: userId },
        { $set: profileFields },
        { new: true }
      );
    } else {
      // Create new profile
      profileFields.user = userId;
      profile = new Profile(profileFields);
      await profile.save();
    }

    // Fetch the user with populated enrolledExams and completedExams
    const user = await User.findById(userId)
      .select("-password -resetToken -resetTokenExpiration")
      .populate("enrolledExams completedExams");

    // Fetch the profile again to ensure it's populated with user data
    profile = await Profile.findOne({ user: userId }).populate({
      path: "user",
      select: "-password -resetToken -resetTokenExpiration",
      populate: [{ path: "enrolledExams" }, { path: "completedExams" }],
    });

    logger.info(`Profile successfully updated for user ${userId}`);

    // Construct the response data
    const responseData = {
      education: profile.education || {
        institution: "",
        degree: "",
        fieldOfStudy: "",
        graduationYear: "",
      },
      socialLinks: profile.socialLinks || {
        website: "",
        linkedin: "",
        github: "",
      },
      adminInfo: profile.adminInfo || {
        companySize: "",
        companyType: "",
        companyName: "",
        jobTitle: "",
        country: "",
      },
      _id: profile._id,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        enrolledExams: user.enrolledExams || [],
        completedExams: user.completedExams || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        __v: user.__v,
      },
      bio: profile.bio || "",
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      __v: profile.__v,
    };

    return res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: responseData,
    });
  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`, {
      stack: error.stack,
    });

    return res.status(500).json({
      status: "failed",
      message: "Server error while updating profile",
    });
  }
};
/**
 * Update user account information
 * @async
 * @function updateAccount
 * @param {Object} req - Express request object
 * @param {Object} req.body - Account fields to update
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with updated user account
 */
exports.updateAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(
      `Validation error in account update: ${JSON.stringify(errors.array())}`
    );
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    logger.debug(`Attempting to update account for user ${userId}`);

    // Fields that are allowed to be updated
    const { name, email, phone } = req.body;

    // Create update object with only allowed fields
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (phone) updateFields.phone = phone;

    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password -resetToken -resetTokenExpiration");

    if (!updatedUser) {
      logger.warn(`User not found for account update: ${userId}`);
      return res.status(404).json({
        status: "failed",
        message: "User not found",
      });
    }

    logger.info(`Account successfully updated for user ${userId}`);

    return res.status(200).json({
      status: "success",
      message: "Account updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    logger.error(`Error updating user account: ${error.message}`, {
      stack: error.stack,
    });

    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({
        status: "failed",
        message: "Email already in use",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server error while updating account",
    });
  }
};

/**
 * Get student profile by ID (Admin only)
 * @async
 * @function getStudentProfileByUserId
 * @param {Object} req - Express request object
 * @param {Object} req.params.id - Student ID
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with student profile
 */
exports.getStudentProfileByUserId = async (req, res) => {
  try {
    const studentId = req.params.id;
    logger.debug(`Admin ${req.user.id} accessing student profile ${studentId}`);

    // Verify student exists
    const student = await User.findById(studentId).select(
      "-password -resetToken -resetTokenExpiration"
    );

    if (!student) {
      logger.warn(`Student not found with ID: ${studentId}`);
      return res.status(404).json({
        status: "failed",
        message: "Student not found",
      });
    }

    if (student.role !== "student") {
      logger.warn(`User ${studentId} is not a student`);
      return res.status(400).json({
        status: "failed",
        message: "User is not a student",
      });
    }

    // Find profile and populate with user data
    const profile = await Profile.findOne({ user: studentId }).populate({
      path: "user",
      select: "-password -resetToken -resetTokenExpiration",
      populate: [
        {
          path: "enrolledExams",
          select: "title description subject startTime endTime duration",
        },
        {
          path: "completedExams.exam",
          select: "title subject duration",
        },
        {
          path: "completedExams.result",
          select: "score totalMarks submittedAt",
        },
      ],
    });

    if (!profile) {
      logger.info(`Profile not found for student ${studentId}, creating one`);
      await Profile.createProfileForUser(studentId);

      // Get the newly created profile
      const newProfile = await Profile.findOne({ user: studentId }).populate({
        path: "user",
        select: "-password -resetToken -resetTokenExpiration",
      });

      return res.status(200).json({
        status: "success",
        data: newProfile,
      });
    }

    // Add student statistics
    const responseProfile = profile.toObject();
    responseProfile.statistics = {
      totalExamsEnrolled: profile.user.enrolledExams.length,
      totalExamsCompleted: profile.user.completedExams.length,
      // Calculate average score if there are completed exams with results
      averageScore:
        profile.user.completedExams.length > 0
          ? profile.user.completedExams.reduce((sum, exam) => {
              if (exam.result) {
                return sum + (exam.result.score / exam.result.totalMarks) * 100;
              }
              return sum;
            }, 0) /
              profile.user.completedExams.filter((exam) => exam.result)
                .length || 0
          : 0,
    };

    logger.info(`Student profile retrieved successfully: ${studentId}`);

    return res.status(200).json({
      status: "success",
      data: responseProfile,
    });
  } catch (error) {
    logger.error(`Error fetching student profile: ${error.message}`, {
      stack: error.stack,
    });

    if (error.kind === "ObjectId") {
      return res.status(404).json({
        status: "failed",
        message: "Student not found",
      });
    }

    return res.status(500).json({
      status: "failed",
      message: "Server error while retrieving student profile",
    });
  }
};

/**
 * Get all student profiles (Admin only)
 * @async
 * @function getAllStudentProfiles
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with all student profiles
 */
exports.getAllStudentProfiles = async (req, res) => {
  try {
    logger.debug(`Admin ${req.user.id} retrieving all student profiles`);

    // Find all users with student role
    const students = await User.find({ role: "student" })
      .select("-password -resetToken -resetTokenExpiration")
      .lean();

    // Get student IDs
    const studentIds = students.map((student) => student._id);

    // Find profiles for all students
    const profiles = await Profile.find({ user: { $in: studentIds } }).populate(
      {
        path: "user",
        select: "-password -resetToken -resetTokenExpiration",
      }
    );

    logger.info(`Retrieved ${profiles.length} student profiles`);

    return res.status(200).json({
      status: "success",
      count: profiles.length,
      data: profiles,
    });
  } catch (error) {
    logger.error(`Error fetching student profiles: ${error.message}`, {
      stack: error.stack,
    });

    return res.status(500).json({
      status: "failed",
      message: "Server error while retrieving student profiles",
    });
  }
};

module.exports = exports;
