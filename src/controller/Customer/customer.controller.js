const User = require("../../model/Users");
const Role = require("../../model/Role");
const bcrypt = require("bcryptjs");
const { generateToken } = require("../../util/jwt");
const streamifier = require("streamifier");
const cloudinary = require("../../config/cloudinaryConfig");
const Route = require("../../model/Routers");
const Stop = require("../../model/Stops");
const RouteStop = require("../../model/route_stops");
const StopLocation = require("../../model/StopLocation");

module.exports.register = async (req, res) => {
  try {
    const { name, phone, password, confirmPassword } = req.body;
    if (!name || !phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Input cannot be empty" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Password not match" });
    }
    const existedUser = await User.findOne({ phone });
    if (existedUser) {
      return res.status(409).json({ message: "Phone already registered" });
    }
    const passwordRegex = /^(?=.*[A-Z]).{9,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be longer than 8 characters and contain at least one uppercase letter",
      });
    }

    const customerRole = await Role.findOne({ name: "CUSTOMER" });
    if (!customerRole) {
      return res.status(500).json({ message: "Customer role not found" });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({
      name,
      phone,
      password: hashedPassword,
      role: customerRole._id,
    });
    await newUser.save();
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
    console.log("phone là : ", phone);
    const user = await User.findOne({ phone });
    console.log("user là : ", user);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    console.log("password là : ", user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mật khẩu không chính xác" });
    }
    const token = generateToken(user._id);
    return res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
module.exports.checkphone = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone is required",
      });
    }

    const customer = await User.findOne({ phone });

    return res.status(200).json({
      exists: !!customer, // true | false
    });
  } catch (error) {
    console.error("Check phone error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
module.exports.getUser = async (req, res) => {
  console.log("đang vào profile");
  const response = {
    status: 200,
    message: "Success",
    data: res.locals.user,
  };
  res.status(response.status).json(response);
};
module.exports.changPassword = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const { oldPass, newPass, confirmNewPass } = req.body;
    if (!oldPass || !newPass || !confirmNewPass) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const user = await User.findById(userId);
    // if (!user || !user.isVerified) {
    //   return res.status(400).json({ message: "Invalid request" });
    // }
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
};
module.exports.updateProfile = async (req, res) => {
  try {
    const userId = res.locals.user.id;
    const name = req.body?.name;

    const user = await User.findById(userId);
    console.log("user là : ", user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (name) {
      user.name = name;
    }
    console.log("req file", req.file);
    if (req.file) {
      try {
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

        if (!result?.secure_url) {
          return res.status(400).json({ message: "Upload avatar failed" });
        }

        user.avatar = {
          url: result.secure_url,
          publicId: result.public_id,
        };
      } catch (err) {
        console.error("CLOUDINARY ERROR:", err);
        return res.status(500).json({ message: "Avatar upload error" });
      }
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
module.exports.resetPassword = async (req, res) => {
  try {
    const { phone, password, confirmPassword } = req.body;

    if (!phone || !password || !confirmPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ phone });
    console.log(user);
    if (!user) {
      return res.status(400).json({ message: "Invalid request" });
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

    await user.save();
    return res.json({ message: "Password reset successful" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ==================== BUS ROUTE FUNCTIONS (PUBLIC) ====================

// Lấy tất cả routes (có phân trang và tìm kiếm)
module.exports.getAllRoutes = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Lấy tất cả routes active
    const routes = await Route.find({ is_active: true })
      .populate("start_id", "name type")
      .populate("stop_id", "name type")
      .lean();

    // Filter by search nếu có
    let filteredRoutes = routes;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRoutes = routes.filter(
        (route) =>
          route.start_id?.name?.toLowerCase().includes(searchLower) ||
          route.stop_id?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Phân trang
    const total = filteredRoutes.length;
    const paginatedRoutes = filteredRoutes.slice(skip, skip + parseInt(limit));

    // Lấy thêm thông tin stops cho mỗi route
    const routesWithStops = await Promise.all(
      paginatedRoutes.map(async (route) => {
        const routeStops = await RouteStop.find({ route_id: route._id })
          .populate("stop_id", "name type")
          .sort({ stop_order: 1 })
          .lean();

        // Lấy locations cho mỗi route stop
        const stopsWithLocations = await Promise.all(
          routeStops.map(async (rs) => {
            const locations = await StopLocation.find({
              route_stop_id: rs._id,
              is_active: true,
            }).lean();

            return {
              order: rs.stop_order,
              stop: rs.stop_id,
              is_pickup: rs.is_pickup,
              locations: locations.map((loc) => ({
                _id: loc._id,
                name: loc.location_name,
                address: loc.address,
                type: loc.location_type,
              })),
            };
          })
        );

        return {
          _id: route._id,
          name: `${route.start_id?.name} - ${route.stop_id?.name}`,
          start: route.start_id,
          end: route.stop_id,
          distance_km: route.distance_km,
          stops: stopsWithLocations,
          total_stops: stopsWithLocations.length,
          is_active: route.is_active,
        };
      })
    );

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách tuyến đường thành công",
      data: {
        routes: routesWithStops,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all routes error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Lấy chi tiết một route
module.exports.getRouteById = async (req, res) => {
  try {
    const { id } = req.params;

    const route = await Route.findById(id)
      .populate("start_id", "name type latitude longitude")
      .populate("stop_id", "name type latitude longitude")
      .lean();

    if (!route) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy tuyến đường",
      });
    }

    // Lấy tất cả stops của route
    const routeStops = await RouteStop.find({ route_id: route._id })
      .populate("stop_id", "name type latitude longitude")
      .sort({ stop_order: 1 })
      .lean();

    // Lấy locations cho mỗi stop
    const stopsWithLocations = await Promise.all(
      routeStops.map(async (rs) => {
        const locations = await StopLocation.find({
          route_stop_id: rs._id,
          is_active: true,
        }).lean();

        return {
          _id: rs._id,
          order: rs.stop_order,
          stop: rs.stop_id,
          is_pickup: rs.is_pickup,
          locations: locations.map((loc) => ({
            _id: loc._id,
            name: loc.location_name,
            address: loc.address,
            latitude: loc.latitude,
            longitude: loc.longitude,
            type: loc.location_type,
          })),
        };
      })
    );

    const routeDetail = {
      _id: route._id,
      name: `${route.start_id?.name} - ${route.stop_id?.name}`,
      start: route.start_id,
      end: route.stop_id,
      distance_km: route.distance_km,
      stops: stopsWithLocations,
      total_stops: stopsWithLocations.length,
      is_active: route.is_active,
    };

    return res.status(200).json({
      status: 200,
      message: "Lấy chi tiết tuyến đường thành công",
      data: routeDetail,
    });
  } catch (error) {
    console.error("Get route by id error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Lấy tất cả điểm dừng (stops)
module.exports.getAllStops = async (req, res) => {
  try {
    const { type, search } = req.query;

    let query = { is_active: true };

    if (type) {
      query.type = type.toUpperCase();
    }

    let stops = await Stop.find(query).sort({ name: 1 }).lean();

    if (search) {
      const searchLower = search.toLowerCase();
      stops = stops.filter((stop) =>
        stop.name.toLowerCase().includes(searchLower)
      );
    }

    return res.status(200).json({
      status: 200,
      message: "Lấy danh sách điểm dừng thành công",
      data: stops,
    });
  } catch (error) {
    console.error("Get all stops error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

// Tìm kiếm routes theo điểm đi và điểm đến
module.exports.searchRoutes = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from && !to) {
      return res.status(400).json({
        status: 400,
        message: "Vui lòng cung cấp điểm đi hoặc điểm đến",
      });
    }

    let query = { is_active: true };

    if (from) {
      query.start_id = from;
    }

    if (to) {
      query.stop_id = to;
    }

    const routes = await Route.find(query)
      .populate("start_id", "name type")
      .populate("stop_id", "name type")
      .lean();

    // Lấy thêm thông tin stops cho mỗi route
    const routesWithStops = await Promise.all(
      routes.map(async (route) => {
        const routeStops = await RouteStop.find({ route_id: route._id })
          .populate("stop_id", "name type")
          .sort({ stop_order: 1 })
          .lean();

        const stopsWithLocations = await Promise.all(
          routeStops.map(async (rs) => {
            const locations = await StopLocation.find({
              route_stop_id: rs._id,
              is_active: true,
            }).lean();

            return {
              order: rs.stop_order,
              stop: rs.stop_id,
              is_pickup: rs.is_pickup,
              locations: locations.map((loc) => ({
                _id: loc._id,
                name: loc.location_name,
                address: loc.address,
                type: loc.location_type,
              })),
            };
          })
        );

        return {
          _id: route._id,
          name: `${route.start_id?.name} - ${route.stop_id?.name}`,
          start: route.start_id,
          end: route.stop_id,
          distance_km: route.distance_km,
          stops: stopsWithLocations,
          total_stops: stopsWithLocations.length,
          is_active: route.is_active,
        };
      })
    );

    return res.status(200).json({
      status: 200,
      message: "Tìm kiếm tuyến đường thành công",
      data: routesWithStops,
    });
  } catch (error) {
    console.error("Search routes error:", error);
    return res.status(500).json({
      status: 500,
      message: "Lỗi server",
      error: error.message,
    });
  }
};
