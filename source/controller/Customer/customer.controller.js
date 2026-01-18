const User = require("../../model/Users");
const Role = require("../../model/Role");
const bcrypt = require("bcryptjs");

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
      return res.status(400).json({message:"Password must be longer than 8 characters and contain at least one uppercase letter"});
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
      return res.status(400).json({message: "Invalid or expired OTP",});
    }
    user.isVerified = true;
    user.otp = null;
    user.otpExpiredAt = null;
    await user.save();
    return res.status(200).json({message: "OTP verified successfully",});
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
      return res.status(400).json({ message: "Account already verified" });}
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiredAt = Date.now() + 5 * 60 * 1000; 
    await user.save();
    console.log("RESEND OTP TO:", phone);
    console.log("OTP:", otp);
    return res.status(200).json({message: "OTP resent successfully"});
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
