const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      trim: true,
      default: "",
    },
    education: {
      institution: {
        type: String,
        default: "",
      },
      degree: {
        type: String,
        default: "",
      },
      fieldOfStudy: {
        type: String,
        default: "",
      },
      graduationYear: {
        type: Number,
      },
    },
    socialLinks: {
      website: {
        type: String,
        default: "",
      },
      linkedin: {
        type: String,
        default: "",
      },
      github: {
        type: String,
        default: "",
      },
    },
    // Fields for admins to track additional information
    adminInfo: {
      companyName: {
        type: String,
        default: "",
      },
      companySize: {
        type: String,
        enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+", null],
        default: "",
      },
      jobTitle: {
        type: String,
        default: "",
      },
      country: {
        type: String,
        default: "",
      },
      companyType: {
        type: String,
        enum: [
          "startup",
          "serviceBased",
          "productBased",
          "enterprise",
          "other",
          null,
        ],
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create profile automatically when user is created
profileSchema.statics.createProfileForUser = async function (userId) {
  try {
    const profile = await this.findOne({ user: userId });
    if (!profile) {
      await this.create({ user: userId });
    }
    return true;
  } catch (error) {
    console.error("Error creating profile:", error);
    return false;
  }
};

profileSchema.pre("validate", function (next) {
  if (this.adminInfo) {
    if (this.adminInfo.companySize === "") {
      this.adminInfo.companySize = undefined;
    }
    if (this.adminInfo.companyType === "") {
      this.adminInfo.companyType = undefined;
    }
  }
  next();
});

module.exports = mongoose.model("Profile", profileSchema);
