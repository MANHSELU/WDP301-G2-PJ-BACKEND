const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      match: /^[0-9]{9,11}$/,
    },

    password: {
      type: String,
      required: true,
      select: false, // không trả password khi query
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    avatar: {
      type: String,
      default:
        "https://static.vecteezy.com/system/resources/previews/036/280/651/original/default-avatar-profile-icon-social-media-user-image-gray-avatar-icon-blank-profile-silhouette-illustration-vector.jpg",
    },

    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "banned"],
      default: "active",
    },
    otp: {
      type: String,
      select: true,
    },

    otpExpiredAt: {
      type: Date,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);
module.exports = User;
