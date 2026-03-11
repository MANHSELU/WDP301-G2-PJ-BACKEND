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
const Trip = require("./../../model/Trip")
const RouteSegmentPrices = require("./../../model/RouteSegmentPrice");
const mongoose = require("mongoose");
const BookingOrder = require("./../../model/BookingOrder")
const BookingPayment = require("./../../model/BookingPayment")
const Parcel = require("../../model/Parcel")
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
// son làm 
module.exports.getSearch = async (req, res) => {
  try {
    console.log("chạy vào search")
    const { nodeId_start, nodeId_end, date } = req.body;
    console.log("date là: ", date)
    console.log("nodeid start là : ", nodeId_start)
    if (!nodeId_start || !nodeId_end) {
      return res.status(400).json({
        message: "Thiếu nodeId_start hoặc nodeId_end",
      });
    }
    console.log("1")
    // 1️⃣ Tìm tất cả routeStop của start node
    const startStops = await RouteStop.find({
      stop_id: nodeId_start,
      is_pickup: true,
    });

    if (!startStops.length) {
      return res.json([]);
    }

    const results = [];

    // 2️⃣ Với mỗi start, kiểm tra có end trong cùng route không
    for (const start of startStops) {
      const endStop = await RouteStop.findOne({
        route_id: start.route_id,
        stop_id: nodeId_end,
        stop_order: { $gt: start.stop_order }, // đảm bảo đúng chiều
      });
      if (endStop) {
        results.push(endStop);
      }
    }
    // check date 
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    console.log(" ngày bắt đầu và kết thúc là : ", startOfDay, endOfDay)
    const arr = []
    const checkList = []
    for (const route of results) {
      const node = await Route.findOne({
        _id: route.route_id,
        is_active: true
      })
        .populate({
          path: "start_id",
          select: "province"
        })
        .populate({
          path: "stop_id",
          select: "province"
        })
        ;
      console.log("3")

      const checknode = await Trip.findOne({
        route_id: route.route_id,
        departure_time: {
          $gte: startOfDay,
          $lte: endOfDay,
        }
      })
      console.log("nodecheck là: ", checknode)
      if (!checknode) {
        // chuyển qua vòng for tiếp theo
        continue
      }
      checkList.push(checknode)
      // if (!checknode) {
      //   console.log("rơi vào không có ")
      //   return res.json({
      //     arr
      //   })
      // }
      // const node = await Trip.findOne({
      //   route_id: route.route_id,
      // })
      //   .populate({
      //     path: "route_id",
      //     populate: [
      //       {
      //         path: "start_id",
      //         select: "province",
      //       },
      //       {
      //         path: "stop_id",
      //         select: "province",
      //       },
      //     ],
      //   })
      //   .populate({
      //     path: "bus_id",
      //     populate: {
      //       path: "bus_type_id"
      //     },
      //     select: "-seat_layout"
      //   })
      //   .select("-drivers -assistant_id")
      console.log("4")
      if (node) {
        arr.push(node)
      }
    }
    if (checkList.length == 0) {
      return res.json([]);
    }
    return res.json(arr);
  } catch (err) {
    console.log("Lỗi của chương trình là:", err);
    return res.status(500).json({
      message: "Lỗi server",
    });
  }
};
module.exports.viewTripBus = async (req, res) => {
  try {
    const { route_id } = req.body
    console.log("id là : ", route_id)
    if (!route_id) {
      return res.status(404).json({
        "message": "Not Found"
      })
    }
    const node = await Trip.find({
      route_id: route_id,
      status: "SCHEDULED"
    })
      .populate({
        path: "route_id",
        populate: [
          {
            path: "start_id",
            select: "province name",
          },
          {
            path: "stop_id",
            select: "province name",
          },
        ],
      })
      .populate({
        path: "bus_id",
        populate: {
          path: "bus_type_id"
        },
        select: "-seat_layout"
      })
      .select("-drivers -assistant_id")
    const routeStop = await RouteStop.find({
      route_id: route_id,

      is_pickup: true
    }).populate("stop_id")
    const arr = node.map(trip => ({
      ...trip.toObject(),
      time: routeStop
    }))
    return res.status(201).json({
      "message": "Success",
      data: arr
    })
  } catch (err) {
    console.log("lỗi trong chương trình là : ", err)
    return res.status(404).json({
      "message": "Not Found"
    })
  }
}
module.exports.diagramBus = async (req, res) => {
  try {
    const { route_id } = req.body
    if (!route_id) {
      return res.status(404).json({
        message: "Not found"
      })
    }
    const trip = await Trip.findOne({
      route_id: route_id
    })
      .populate({
        path: "bus_id",
        populate: {
          path: "bus_type_id"
        }
      })
      .populate({
        path: "route_id",
        populate: [
          { path: "start_id" },
          { path: "stop_id" }
        ]
      })
    return res.status(200).json({
      mesage: "Success",
      data: trip
    })

  } catch (err) {
    console.log("lỗi trong chương trình là : ", err)
    return res.status(404).json({
      message: "Not found"
    })
  }
}
module.exports.endPoint = async (req, res) => {
  console.log("chạy vào endpoint")
  try {
    const { start_id, route_id, bus_type_id } = req.body
    console.log("start_id và router id là: ", start_id, route_id, bus_type_id)
    if (!start_id || !route_id) {
      return res.status(404).json({
        message: "Not found"
      })
    }
    const routeSegmentprices = await RouteSegmentPrices.find({
      start_id: start_id,
      route_id: route_id,
      bus_type_id: bus_type_id
      // is_active: true
    })
    console.log("routeSegmentprices là : ", routeSegmentprices)
    const arr = []
    for (const router of routeSegmentprices) {
      const routeStop = await RouteStop.findOne({
        stop_id: router.end_id,
        is_pickup: true
      })
        .populate("stop_id")
      if (routeStop) {
        arr.push(routeStop)
      }
    }
    return res.status(201).json({
      message: "Success",
      data: arr
    })
  } catch (err) {
    console.log("lỗi trong chương trình trên là : ", err)
    return res.status(500).json({
      message: "Server Error"
    })
  }
}
module.exports.startPoint = async (req, res) => {
  try {
    const { route_id } = req.body;
    const routerStop = await RouteStop.find({
      route_id: route_id,
      is_pickup: true
    }).populate("stop_id")
    return res.status(200).json({
      message: "Success",
      data: routerStop
    })
  } catch (err) {
    console.log("lỗi trong chương trình là: ", err)
    return res.status(500).json({
      message: "Server Error",
    })
  }
}
module.exports.locationPoint = async (req, res) => {
  try {
    const { stop_id, route_id } = req.body
    console.log("stop_id và route_id là: ", stop_id, " va", route_id)
    const routestops = await RouteStop.findOne({
      route_id: route_id,
      stop_id: stop_id,
      is_pickup: true
    })
    if (!routestops) {
      return res.status(404).json({
        message: "Not Found",
      })
    }
    if (routestops.stop_order == 1) {
      const route = await Route.findOne({
        _id: route_id,
        is_active: true
      })
      const stop_start = await Stop.findOne({
        _id: route.start_id
      })
      const stop_end = await Stop.findOne({
        _id: route.stop_id
      })
      const start = stop_start.location.coordinates
      const end = stop_end.location.coordinates
      const startLat = start[1]
      const endLat = end[1]
      const locations = await StopLocation.find({
        stop_id: routestops.stop_id,
        is_active: true
      })
      const arr = []
      const location = {
        location_name: stop_start.name,
        is_active: true,
        status: true
      }
      arr.push(location)
      console.log("location là : ", locations)
      for (const location of locations) {
        // chỉ check kinh độ 
        const lat = location.location.coordinates[1]
        // xe đi về phía nam
        if (endLat < startLat) {
          console.log("xe đi từ bắc sang nam")
          if (lat < startLat) {
            arr.push(location)
          }
        }
        // xe đi về phía bắc
        else if (endLat > startLat) {
          console.log("xe đi từ nam sang bắc")
          if (lat > startLat) {
            arr.push(location)
          }
        }
      }
      console.log("arr khi chọn được điểm là : ", arr)
      return res.status(200).json({
        message: "Success",
        data: arr
      })
    }
    const routestopsMaxStopOrder = await RouteStop.find({
      route_id: route_id,
    })
    const Arr_stop_order = []
    for (const router of routestopsMaxStopOrder) {
      Arr_stop_order.push(router.stop_order)
    }
    console.log("array là : ", Arr_stop_order)
    console.log(" a= ", routestops.stop_order)
    console.log(" b = ", Math.max(...Arr_stop_order))
    if (routestops.stop_order == Math.max(...Arr_stop_order)) {
      console.log("chạy vào order _max")
      const route = await Route.findOne({
        _id: route_id,
        is_active: true
      })
      const stop_start = await Stop.findOne({
        _id: route.start_id
      })
      const stop_end = await Stop.findOne({
        _id: route.stop_id
      })
      const start = stop_start.location.coordinates
      const end = stop_end.location.coordinates
      const startLat = start[1]

      const endLat = end[1]
      console.log("điểm bắt đầu và điểm kết thúc là : ", start, "và", end)
      console.log("stops_id là : ", routestops.stop_id)
      const locations = await StopLocation.find({
        stop_id: routestops.stop_id,
        is_active: true
      })
      console.log("location là : ", locations)
      const arr = []
      const location = {
        location_name: stop_end.name,
        is_active: true,
        status: true
      }
      arr.push(location)
      for (const location of locations) {
        // chỉ check kinh độ 
        const lat = location.location.coordinates[1] // độ của đểm chi tiết vị trí
        console.log("kinh độ của từng location là : ", lat)
        // xe đi về phía nam
        if (endLat < startLat) {
          console.log("xe đang đi từ bắc sang nam")
          if (lat > endLat) {
            arr.push(location)
          }
        }
        // xe đi về phía bắc
        else if (endLat > startLat) {
          console.log("xe đang đi từ nam ra bắc")
          if (lat > startLat) {
            arr.push(location)
          }
        }
      }
      return res.status(200).json({
        message: "Success",
        data: arr
      })
    } else {
      console.log("chạy vào giữ order")
      const locations = await StopLocation.find({
        stop_id: routestops.stop_id,
        is_active: true
      })
      return res.status(200).json({
        message: "Success",
        data: locations
      })
    }
  } catch (err) {
    console.log("lỗi trong chương trình là : ", err)
  }
}
module.exports.getPrice = async (req, res) => {
  try {
    const { route_id, start_id, end_id, bus_type_id } = req.body
    const routesegmentprices = await RouteSegmentPrices.findOne({
      route_id: route_id,
      start_id: start_id,
      end_id: end_id,
      bus_type_id: bus_type_id
    })
    if (!routesegmentprices) {
      res.status(404).json({
        message: "Not Found"
      })
    }
    const price = routesegmentprices.base_price;
    console.log("price là : ", routesegmentprices)
    res.status(200).json({
      message: "Success",
      data: price
    })
  } catch (err) {
    console.log("lỗi trong chương trình trên là:  ", err)
    res.status(500).json({
      message: "Server error"
    })
  }
}

module.exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      user_id,
      trip_id,
      start_id,
      end_id,
      seat_labels,      // string[] — ["A1", "A2"]
      ticket_price,
      payment_method = "CASH_ON_BOARD",
      passenger_name,
      passenger_phone,
      passenger_email,
    } = req.body;

    /* ════════════════════════════════════
       1. Validate input
    ════════════════════════════════════ */
    if (!user_id || !trip_id || !start_id || !end_id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "Thiếu thông tin bắt buộc (user_id, trip_id, start_id, end_id)",
      });
    }
    if (!Array.isArray(seat_labels) || seat_labels.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Vui lòng chọn ít nhất 1 ghế" });
    }
    if (!passenger_name?.trim() || !passenger_phone?.trim()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Thiếu họ tên hoặc số điện thoại hành khách" });
    }
    if (!ticket_price || Number(ticket_price) <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Giá vé không hợp lệ" });
    }
    if (!["ONLINE", "CASH_ON_BOARD"].includes(payment_method)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    /* ════════════════════════════════════
       2. Kiểm tra chuyến xe
    ════════════════════════════════════ */
    const trip = await Trip.findById(trip_id).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Không tìm thấy chuyến xe" });
    }
    if (trip.status !== "SCHEDULED") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Chuyến xe không còn nhận đặt vé" });
    }

    /* ════════════════════════════════════
       3. Kiểm tra ghế đã được đặt chưa
       → query BookingOrder theo trip_id + seat_id
       (BookingOrder không có seat_id trực tiếp nên
        ta check qua các order đã tồn tại của cùng trip)
    ════════════════════════════════════ */

    // Lấy tất cả order của trip này còn active (không bị CANCELLED)
    const existingOrders = await BookingOrder.find({
      trip_id,
      order_status: { $ne: "CANCELLED" },
    })
      .select("seat_labels")
      .session(session);

    // Gom tất cả ghế đã đặt thành 1 mảng phẳng
    const bookedSeats = existingOrders.flatMap((o) => o.seat_labels || []);

    // Tìm ghế bị trùng
    const conflictSeats = seat_labels.filter((s) => bookedSeats.includes(s));
    if (conflictSeats.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        message: `Ghế ${conflictSeats.join(", ")} đã được đặt. Vui lòng chọn ghế khác.`,
      });
    }

    /* ════════════════════════════════════
       4. Tính tổng tiền
    ════════════════════════════════════ */
    const price = Number(ticket_price);
    const total_price = seat_labels.length * price;

    /* ════════════════════════════════════
       5. Tạo BookingOrder
    ════════════════════════════════════ */
    const [order] = await BookingOrder.create(
      [
        {
          user_id,
          trip_id,
          start_id,
          end_id,
          seat_labels,           // lưu danh sách ghế vào order
          order_status: "CREATED",
          total_price,
          passenger_name: passenger_name.trim(),
          passenger_phone: passenger_phone.trim(),
          passenger_email: passenger_email?.trim() || null,
        },
      ],
      { session }
    );

    /* ════════════════════════════════════
       6. Tạo BookingPayment
    ════════════════════════════════════ */
    const [payment] = await BookingPayment.create(
      [
        {
          order_id: order._id,
          payment_method,
          amount: total_price,
          payment_status: "PENDING",
        },
      ],
      { session }
    );

    /* ════════════════════════════════════
       7. Commit
    ════════════════════════════════════ */
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Đặt vé thành công",
      data: {
        order: {
          _id: order._id,
          order_status: order.order_status,
          total_price: order.total_price,
          seat_labels: order.seat_labels,
          created_at: order.created_at,
        },
        payment: {
          _id: payment._id,
          payment_method: payment.payment_method,
          amount: payment.amount,
          payment_status: payment.payment_status,
        },
        summary: {
          total_seats: seat_labels.length,
          total_price,
          passenger_name: passenger_name.trim(),
          passenger_phone: passenger_phone.trim(),
        },
      },
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) { }
    session.endSession();
    console.error("[createBooking] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
}
module.exports.getBookedSeats = async (req, res) => {
  try {
    const { trip_id } = req.body;

    if (!trip_id) {
      return res.status(400).json({ message: "Thiếu trip_id" });
    }

    // Lấy tất cả order của trip này chưa bị huỷ
    const orders = await BookingOrder.find({
      trip_id,
      order_status: { $ne: "CANCELLED" },
    }).select("seat_labels");

    // Gom tất cả seat_labels thành 1 mảng phẳng, bỏ duplicate
    const bookedSeats = [
      ...new Set(orders.flatMap((o) => o.seat_labels || [])),
    ];

    return res.status(200).json({
      message: "Lấy danh sách ghế đã đặt thành công",
      data: bookedSeats, // ["A1", "A3", "A7", ...]
    });
  } catch (err) {
    console.error("[getBookedSeats] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
}
module.exports.getOrderHistory = async (req, res) => {
  try {
    // user_id lấy từ middleware auth (req.user._id)
    const user_id = res.locals.user.id;
    if (!user_id) {
      return res.status(401).json({ message: "Không xác định được tài khoản" });
    }

    const page = Math.max(1, parseInt(req.body.page) || 1);
    const limit = Math.max(1, parseInt(req.body.limit) || 10);
    const skip = (page - 1) * limit;

    // Tổng số đơn
    const total = await BookingOrder.countDocuments({ user_id });
    const totalPages = Math.ceil(total / limit);

    // Lấy danh sách đơn, populate trip + route
    const orders = await BookingOrder.find({ user_id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status bus_id route_id",
        populate: [
          {
            path: "route_id",
            select: "start_id stop_id",
            populate: [
              { path: "start_id", select: "name province" },
              { path: "stop_id", select: "name province" },
            ],
          },
          {
            path: "bus_id",
            select: "bus_type_id",
            populate: { path: "bus_type_id", select: "name" },
          },
        ],
      })
      .populate("start_id", "stop_id stop_order")
      .populate("end_id", "stop_id stop_order")
      .lean();

    // Lấy payment tương ứng cho từng order
    const orderIds = orders.map((o) => o._id);
    const payments = await BookingPayment.find({
      order_id: { $in: orderIds },
    })
      .select("order_id payment_method payment_status amount paid_at")
      .lean();

    const paymentMap = {};
    payments.forEach((p) => {
      paymentMap[p.order_id.toString()] = p;
    });

    // Format response
    const data = orders.map((order) => {
      const trip = order.trip_id;
      const payment = paymentMap[order._id.toString()] || null;

      return {
        _id: order._id,
        order_status: order.order_status,
        total_price: order.total_price,
        seat_labels: order.seat_labels || [],
        passenger_name: order.passenger_name,
        passenger_phone: order.passenger_phone,
        created_at: order.created_at,

        trip: trip
          ? {
              _id: trip._id,
              departure_time: trip.departure_time,
              arrival_time: trip.arrival_time,
              status: trip.status,
              bus_type_name: trip.bus_id?.bus_type_id?.name || null,
              route: {
                from: {
                  name: trip.route_id?.start_id?.name || null,
                  province: trip.route_id?.start_id?.province || null,
                },
                to: {
                  name: trip.route_id?.stop_id?.name || null,
                  province: trip.route_id?.stop_id?.province || null,
                },
              },
            }
          : null,

        payment: payment
          ? {
              payment_method: payment.payment_method,
              payment_status: payment.payment_status,
              amount: payment.amount,
              paid_at: payment.paid_at,
            }
          : null,
      };
    });

    return res.status(200).json({
      message: "Lấy lịch sử đặt vé thành công",
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[getOrderHistory] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};

          // ----------------------------------------------
          //          Parcel / Delivery Orders
          // ----------------------------------------------

const PARCEL_STATUS = {
  RECEIVED: "RECEIVED",
  ON_BUS: "ON_BUS",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

const APPROVAL_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

async function getUsedWeight(trip_id) {
  const parcels = await Parcel.find({
    trip_id,
    approval_status: APPROVAL_STATUS.APPROVED,
    status: { $nin: [PARCEL_STATUS.CANCELLED, PARCEL_STATUS.DELIVERED] },
  }).select("weight_kg");

  return parcels.reduce((sum, p) => sum + (p.weight_kg || 0), 0);
}

function generateParcelCode() {
  return `P${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;
}

module.exports.createParcel = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      trip_id,
      receiver_name,
      receiver_phone,
      start_id,
      end_id,
      pickup_location_id,
      dropoff_location_id,
      weight_kg,
      parcel_type,
      total_price,
      payment_method = "CASH_ON_BOARD",
    } = req.body;

    const sender_id = res.locals.user.id;

    if (!trip_id || !receiver_name?.trim() || !receiver_phone?.trim() || !start_id || !end_id) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
    }

    const weight = Number(weight_kg);
    if (!weight || weight <= 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Khối lượng không hợp lệ" });
    }

    const price = Number(total_price);
    if (isNaN(price) || price < 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Giá không hợp lệ" });
    }

    if (!["ONLINE", "CASH_ON_BOARD"].includes(payment_method)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
    }

    const trip = await Trip.findById(trip_id).session(session);
    if (!trip) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Không tìm thấy chuyến" });
    }

    if (trip.status !== "SCHEDULED") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Chuyến không còn nhận hàng" });
    }

    const maxWeight = trip.max_weight_kg;
    let isAccepted = true;
    let remainingWeight = null;

    if (typeof maxWeight === "number" && maxWeight > 0) {
      const usedWeight = await getUsedWeight(trip_id);
      remainingWeight = maxWeight - usedWeight;
      if (weight > remainingWeight) {
        isAccepted = false;
      }
    }

    const code = generateParcelCode();

    const [parcel] = await Parcel.create(
      [
        {
          code,
          trip_id,
          sender_id,
          receiver_name: receiver_name.trim(),
          receiver_phone: receiver_phone.trim(),
          start_id,
          end_id,
          pickup_location_id: pickup_location_id || null,
          dropoff_location_id: dropoff_location_id || null,
          weight_kg: weight,
          parcel_type: parcel_type?.trim() || null,
          total_price: price,
          payment_method,
          payment_status: isAccepted ? "PENDING" : "REFUNDED",
          approval_status: isAccepted ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED,
          status: isAccepted ? "RECEIVED" : "CANCELLED",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const responseMessage = isAccepted
      ? "Tạo đơn gửi hàng thành công"
      : "Đơn bị từ chối vì quá khối lượng của chuyến";

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: responseMessage,
      data: {
        parcel: {
          _id: parcel._id,
          code: parcel.code,
          status: parcel.status,
          approval_status: parcel.approval_status,
          total_price: parcel.total_price,
          weight_kg: parcel.weight_kg,
          created_at: parcel.created_at,
        },
        payment: {
          amount: parcel.total_price,
          payment_method: parcel.payment_method,
          payment_status: parcel.payment_status,
        },
        paymentPayload: {
          orderId: parcel._id,
          amount: parcel.total_price,
          currency: "VND",
          description: `Thanh toán đơn gửi hàng ${parcel.code}`,
        },
        ...(isAccepted
          ? {}
          : { remaining_weight_kg: remainingWeight ?? null }),
      },
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) {}
    session.endSession();
    console.error("[createParcel] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};

module.exports.getMyParcels = async (req, res) => {
  try {
    const user_id = res.locals.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const filter = { sender_id: user_id };

    if (req.query.status) {
      filter.status = req.query.status.toUpperCase();
    }
    if (req.query.approval_status) {
      filter.approval_status = req.query.approval_status.toUpperCase();
    }

    const total = await Parcel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const parcels = await Parcel.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status route_id",
        populate: {
          path: "route_id",
          select: "start_id stop_id",
          populate: [
            { path: "start_id", select: "name province" },
            { path: "stop_id", select: "name province" },
          ],
        },
      })
      .populate({
        path: "start_id",
        select: "stop_id stop_order",
      })
      .populate({
        path: "end_id",
        select: "stop_id stop_order",
      })
      .populate({
        path: "pickup_location_id",
        select: "location_name address latitude longitude",
      })
      .populate({
        path: "dropoff_location_id",
        select: "location_name address latitude longitude",
      })
      .lean();

    return res.status(200).json({
      message: "Lấy danh sách đơn gửi hàng thành công",
      data: parcels,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("[getMyParcels] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};

module.exports.getParcelDetail = async (req, res) => {
  try {
    const user_id = res.locals.user.id;
    const parcelId = req.params.id;

    const parcel = await Parcel.findOne({ _id: parcelId, sender_id: user_id })
      .populate({
        path: "trip_id",
        select: "departure_time arrival_time status route_id",
        populate: {
          path: "route_id",
          select: "start_id stop_id",
          populate: [
            { path: "start_id", select: "name province" },
            { path: "stop_id", select: "name province" },
          ],
        },
      })
      .populate({ path: "start_id", select: "stop_id stop_order" })
      .populate({ path: "end_id", select: "stop_id stop_order" })
      .populate({
        path: "pickup_location_id",
        select: "location_name address latitude longitude",
      })
      .populate({
        path: "dropoff_location_id",
        select: "location_name address latitude longitude",
      })
      .lean();

    if (!parcel) {
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }

    return res.status(200).json({ message: "OK", data: parcel });
  } catch (err) {
    console.error("[getParcelDetail] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};

module.exports.cancelParcel = async (req, res) => {
  try {
    const user_id = res.locals.user.id;
    const parcelId = req.params.id;

    const parcel = await Parcel.findById(parcelId);
    if (!parcel) {
      return res.status(404).json({ message: "Không tìm thấy đơn" });
    }
    if (parcel.sender_id.toString() !== user_id.toString()) {
      return res.status(403).json({ message: "Không có quyền hủy đơn này" });
    }

    if ([
      PARCEL_STATUS.ON_BUS,
      PARCEL_STATUS.IN_TRANSIT,
      PARCEL_STATUS.DELIVERED,
      PARCEL_STATUS.CANCELLED,
    ].includes(parcel.status)) {
      return res.status(400).json({ message: "Không thể hủy đơn ở trạng thái hiện tại" });
    }

    parcel.status = PARCEL_STATUS.CANCELLED;
    if (parcel.payment_status === "PAID") {
      parcel.payment_status = "REFUNDED";
    } else if (parcel.payment_status === "PENDING") {
      parcel.payment_status = "CANCELLED";
    }
    await parcel.save();

    return res.status(200).json({ message: "Hủy đơn gửi hàng thành công", data: { parcelId: parcel._id } });
  } catch (err) {
    console.error("[cancelParcel] Error:", err);
    return res.status(500).json({ message: "Lỗi server. Vui lòng thử lại sau." });
  }
};