const Profile = require("../models/profile");
const User = require("../models/user");
const { validationResult } = require("express-validator");
const logger = require("../utils/loggerUtils");


// profile created inside user model when the user is created
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

      // Initialize statistics for new profile
      const responseProfile = freshProfile.toObject();
      responseProfile.statistics = {
        totalExamsEnrolled: 0,
        totalExamsCompleted: 0,
        averageScore: 0,
      };

      // Return the new profile with statistics
      return res.status(200).json({
        status: "success",
        data: responseProfile,
      });
    }

    // Add statistics for all user types
    const responseProfile = profile.toObject(); // converting to plain object

    // Add statistics to the response profile
    responseProfile.statistics = {
      totalExamsEnrolled: profile.user.enrolledExams
        ? profile.user.enrolledExams.length
        : 0,
      totalExamsCompleted: profile.user.completedExams
        ? profile.user.completedExams.length
        : 0,
    };

    logger.info(`Profile successfully retrieved for user ${userId}`);

    // return the response with profile & statistics
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
        { $set: profileFields }, // Used $set to update only the fields that have changed
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

    // Construct the response data with statistics included
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
      statistics: {
        totalExamsEnrolled: user.enrolledExams ? user.enrolledExams.length : 0,
        totalExamsCompleted: user.completedExams
          ? user.completedExams.length
          : 0,
        averageScore:
          user.completedExams && user.completedExams.length > 0
            ? user.completedExams.reduce((sum, exam) => {
                if (exam.result) {
                  return (
                    sum + (exam.result.score / exam.result.totalMarks) * 100
                  );
                }
                return sum;
              }, 0) /
                user.completedExams.filter((exam) => exam.result).length || 0
            : 0,
      },
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


module.exports = exports;
