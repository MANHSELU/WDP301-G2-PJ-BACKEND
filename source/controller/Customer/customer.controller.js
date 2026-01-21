const User = require("../../model/Users");
const Role = require("../../model/Role");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../../util/jwt");
const cloudinary = require("../../config/cloudinaryConfig");
const streamifier = require("streamifier");

module.exports.register = async (req, res) => {
  try {
    const { name, phone, password, confirmPassword } = req.body;

    if (!name || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Input cannot be empty" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password not match" });
    }
    const passwordRegex = /^(?=.*[A-Z]).{9,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be longer than 8 characters and contain at least one uppercase letter",
      });
    }
    const existedUser = await User.findOne({ phone });
    if (existedUser) {
      return res.status(409).json({ message: "Phone already registered" });
    }
    const customerRole = await Role.findOne({ name: "CUSTOMER" });
    if (!customerRole) {
      return res.status(500).json({ message: "Customer role not found" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      role: customerRole._id,
      otp,
      otpExpiredAt: Date.now() + 5 * 60 * 1000,
    });
    await newUser.save();
    console.log("SEND OTP TO:", phone);
    console.log("OTP:", otp);
    return res.status(201).json({
      message: "Register successfully. Please enter OTP to verify",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

module.exports.verifyAccount = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const user = await User.findOne({
      phone,
      otp,
      otpExpiredAt: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    user.isVerified = true;
    user.otp = null;
    user.otpExpiredAt = null;
    await user.save();
    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Account already verified" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiredAt = Date.now() + 5 * 60 * 1000;
    await user.save();
    console.log("RESEND OTP TO:", phone);
    console.log("OTP:", otp);
    return res.status(200).json({ message: "OTP resent successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.loginController = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Password is not correct" });
    }
    const token = generateToken(user._id);
    return res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user.isVerified) {
      return res.status(400).json({ message: "Account not verified" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiredAt = Date.now() + 5 * 60 * 1000;
    await user.save();
    console.log("SEND OTP TO:", phone);
    console.log("OTP:", otp);
    return res.status(200).json({ message: "OTP send successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.resetPassword = async (req, res) => {
  try {
    const { phone, otp, password, confirmPassword } = req.body;

    if (!phone || !otp || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ phone });
    console.log(user);
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (!user.otp || !user.otpExpiredAt) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (String(user.otp) !== String(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (user.otpExpiredAt < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const passwordRegex = /^(?=.*[A-Z]).{9,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be longer than 8 characters and contain at least one uppercase letter",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.otp = null;
    user.otpExpiredAt = null;

    await user.save();
    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

module.exports.changePass = async (req, res) => {
  try {
    const userId = req.userId;
    const { oldPass, newPass, confirmNewPass } = req.body;
    if (!oldPass || !newPass || !confirmNewPass) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const user = await User.findById(userId);
    console.log(user);
    if (!user || !user.isVerified) {
      return res.status(400).json({ message: "Invalid request" });
    }
    const isMatch = await bcrypt.compare(oldPass, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is not correct" });
    }
    const passwordRegex = /^(?=.*[A-Z]).{9,}$/;
    if (!passwordRegex.test(newPass)) {
      return res.status(400).json({
        message:
          "Password must be longer than 8 characters and contain at least one uppercase letter",
      });
    }
    if (newPass !== confirmNewPass) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (oldPass === newPass) {
      return res.status(400).json({
        message: "New password must be different from old password",
      });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPass, salt);
    user.password = hashedPassword;
    await user.save();
    return res.status(200).json({ message: "Password change successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}
module.exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select(
      "name phone avatar role createdAt"
    ).populate("role", "name");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar?.url || null,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const name = req.body?.name;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (name) {
      user.name = name;
    }
    if (req.file) {
      if (user.avatar?.publicId) {
        await cloudinary.uploader.destroy(user.avatar.publicId);
      }
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "WDP301" },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
      user.avatar = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }
    await user.save();
    return res.status(200).json({
      message: "Update profile successfully",
      user: {
        id: user._id,
        name: user.name,
        avatar: user.avatar?.url || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};