const User = require("../../model/Users");
const Role = require("../../model/Role");
const Bus = require("../../model/Bus");
const BusType = require("../../model/BusType");
const Route = require("../../model/Routers");
const Stop = require("../../model/Stops");
const RouteStop = require("../../model/route_stops");
const StopLocation = require("../../model/StopLocation");
const RouteSegmentPrice = require("../../model/RouteSegmentPrice");

const { getStartToEndDuration } = require("../../util/ApiDistanceStartToEnd");
const {
  getRouteDistanceAndDuration,
} = require("../../util/getRouteDistanceAndDuration");
const { geocodeVietnamese } = require("../../util/MapGeo");
const mongoose = require("mongoose");
const {
  isValidObjectId,
  // isAdmin,
  isValidBusStatus,
  validateSeatLayout,
  isValidAccountStatus,
  validatePagination,
} = require("../../validation/validations");
const Route_Stop = require("../../model/route_stops");
const Stops = require("../../model/Stops");
const Trip = require("../../model/Trip");
const { haversine, pointToLineDistance } = require("../../util/geoUtil");
//get all acccount
module.exports.getAllAccounts = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    // return res.status(403).json({
    //   success: false,
    //   message: "Access denied. Admin privileges required.",
    // });
    // }

    const {
      search = "",
      role = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    const { page, limit } = validatePagination(req.query.page, req.query.limit);
    const skip = (page - 1) * limit;

    // Build filter query
    const filterQuery = { deletedAt: null };

    if (search) {
      filterQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (status && isValidAccountStatus(status)) {
      filterQuery.status = status;
    }

    if (role) {
      const roleDoc = await Role.findOne({
        name: { $regex: role, $options: "i" },
        deletedAt: null,
      });
      if (roleDoc) {
        filterQuery.role = roleDoc._id;
      }
    }

    // Build sort options
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Execute query
    const [accounts, totalAccounts] = await Promise.all([
      User.find(filterQuery)
        .select("-password -refreshToken -otp -otpExpiredAt")
        .populate("role", "name description")
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filterQuery),
    ]);

    const totalPages = Math.ceil(totalAccounts / limit);

    return res.status(200).json({
      success: true,
      message: "Accounts retrieved successfully",
      data: {
        accounts,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalAccounts,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getAllAccounts:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//get account by id
module.exports.getAccountById = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID format",
      });
    }

    const account = await User.findOne({ _id: id, deletedAt: null })
      .select("-password -refreshToken -otp -otpExpiredAt")
      .populate("role", "name description")
      .lean();

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account retrieved successfully",
      data: account,
    });
  } catch (error) {
    console.error("❌ Error in getAccountById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//get bus
module.exports.getBusById = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID format",
      });
    }

    const bus = await Bus.findById(id).populate(
      "bus_type_id",
      "name category description amenities isActive"
    );

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bus retrieved successfully",
      data: bus,
    });
  } catch (error) {
    console.error("❌ Error in getBusById:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//update bus
module.exports.updateBus = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID format",
      });
    }

    const existingBus = await Bus.findById(id);
    if (!existingBus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    const { license_plate, bus_type_id, status, seat_layout } = req.body;

    // Validate license_plate
    if (license_plate && license_plate !== existingBus.license_plate) {
      const duplicatePlate = await Bus.findOne({
        license_plate: license_plate,
        _id: { $ne: id },
      });
      if (duplicatePlate) {
        return res.status(400).json({
          success: false,
          message: "License plate already exists",
        });
      }
    }

    // Validate bus_type_id
    if (bus_type_id) {
      if (!isValidObjectId(bus_type_id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid bus type ID format",
        });
      }
      const busType = await BusType.findById(bus_type_id);
      if (!busType || !busType.isActive) {
        return res.status(400).json({
          success: false,
          message: "Bus type not found or inactive",
        });
      }
    }

    // Validate status
    if (status && !isValidBusStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be ACTIVE or MAINTENANCE",
      });
    }

    // Validate seat_layout
    if (seat_layout) {
      const layoutError = validateSeatLayout(seat_layout);
      if (layoutError) {
        return res.status(400).json({
          success: false,
          message: layoutError,
        });
      }
    }

    // Build update object
    const updateData = {};
    if (license_plate) updateData.license_plate = license_plate.trim();
    if (bus_type_id) updateData.bus_type_id = bus_type_id;
    if (status) updateData.status = status;
    if (seat_layout) updateData.seat_layout = seat_layout;

    const updatedBus = await Bus.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("bus_type_id", "name category description amenities");

    return res.status(200).json({
      success: true,
      message: "Bus updated successfully",
      data: updatedBus,
    });
  } catch (error) {
    console.error("❌ Error in updateBus:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//update bus status, active hay maintainance
module.exports.updateBusStatus = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID format",
      });
    }

    if (!status || !isValidBusStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be ACTIVE or MAINTENANCE",
      });
    }

    const updatedBus = await Bus.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    ).populate("bus_type_id", "name category description amenities");

    if (!updatedBus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Bus status updated to ${status}`,
      data: updatedBus,
    });
  } catch (error) {
    console.error("❌ Error in updateBusStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//update chỗ ngồi xe buýt
module.exports.updateBusSeatLayout = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;
    const { seat_layout } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bus ID format",
      });
    }

    const layoutError = validateSeatLayout(seat_layout);
    if (layoutError) {
      return res.status(400).json({
        success: false,
        message: layoutError,
      });
    }

    const updatedBus = await Bus.findByIdAndUpdate(
      id,
      { $set: { seat_layout } },
      { new: true, runValidators: true }
    ).populate("bus_type_id", "name category description amenities");

    if (!updatedBus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Bus seat layout updated successfully",
      data: updatedBus,
    });
  } catch (error) {
    console.error("❌ Error in updateBusSeatLayout:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map((e) => e.message),
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//help function to build route response with stops and locations
const buildRouteResponse = async (route) => {
  const routeStops = await RouteStop.find({ route_id: route._id })
    .populate("stop_id", "name type latitude longitude")
    .sort({ stop_order: 1 })
    .lean();

  const routeStopIds = routeStops.map((rs) => rs._id);

  const allLocations = await StopLocation.find({
    route_stop_id: { $in: routeStopIds },
  }).lean();

  const locationsMap = {};
  allLocations.forEach((loc) => {
    const key = loc.route_stop_id.toString();
    if (!locationsMap[key]) locationsMap[key] = [];
    locationsMap[key].push({
      _id: loc._id,
      name: loc.location_name,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      type: loc.location_type,
      is_active: loc.is_active,
    });
  });

  const stopsWithLocations = routeStops.map((rs) => ({
    _id: rs._id,
    order: rs.stop_order,
    stop: rs.stop_id,
    is_pickup: rs.is_pickup,
    locations: locationsMap[rs._id.toString()] || [],
  }));

  return {
    _id: route._id,
    name: `${route.start_id?.name || "N/A"} - ${route.stop_id?.name || "N/A"}`,
    start: route.start_id,
    end: route.stop_id,
    distance_km: route.distance_km,
    is_active: route.is_active,
    stops: stopsWithLocations,
    total_stops: stopsWithLocations.length,
    created_at: route.created_at,
  };
};

//get all route
module.exports.getAllRoutesAdmin = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { search, is_active, page = 1, limit = 10 } = req.query;
    const { page: validPage, limit: validLimit } = validatePagination(
      page,
      limit
    );
    const skip = (validPage - 1) * validLimit;

    let query = {};

    if (is_active !== undefined) {
      query.is_active = is_active === "true";
    }

    if (search && search.trim()) {
      const matchedStops = await Stop.find({
        name: { $regex: search.trim(), $options: "i" },
      })
        .select("_id")
        .lean();

      const stopIds = matchedStops.map((s) => s._id);
      query.$or = [
        { start_id: { $in: stopIds } },
        { stop_id: { $in: stopIds } },
      ];
    }

    const [routes, total] = await Promise.all([
      Route.find(query)
        .populate("start_id", "name type")
        .populate("stop_id", "name type")
        .skip(skip)
        .limit(validLimit)
        .sort({ created_at: -1 })
        .lean(),
      Route.countDocuments(query),
    ]);

    const routesWithStops = await Promise.all(
      routes.map((route) => buildRouteResponse(route))
    );

    return res.status(200).json({
      success: true,
      message: "Routes retrieved successfully",
      data: {
        routes: routesWithStops,
        pagination: {
          currentPage: validPage,
          totalPages: Math.ceil(total / validLimit),
          totalItems: total,
          itemsPerPage: validLimit,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getAllRoutesAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//lấy chi tiết route
module.exports.getRouteByIdAdmin = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid route ID format",
      });
    }

    const route = await Route.findById(id)
      .populate("start_id", "name type latitude longitude")
      .populate("stop_id", "name type latitude longitude")
      .lean();

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    const routeDetail = await buildRouteResponse(route);

    return res.status(200).json({
      success: true,
      message: "Route retrieved successfully",
      data: routeDetail,
    });
  } catch (error) {
    console.error("❌ Error in getRouteByIdAdmin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//UPdate route info
module.exports.updateRoute = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid route ID format",
      });
    }

    const existingRoute = await Route.findById(id);
    if (!existingRoute) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    const { distance_km, is_active } = req.body;

    // Build update data
    const updateData = {};

    // Validate distance
    if (distance_km !== undefined) {
      if (distance_km !== null && (isNaN(distance_km) || distance_km <= 0)) {
        return res.status(400).json({
          success: false,
          message: "Distance must be a positive number",
        });
      }
      updateData.distance_km = distance_km;
    }

    // Update is_active
    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    // Update route
    await Route.findByIdAndUpdate(id, { $set: updateData });

    // Fetch updated route
    const updatedRoute = await Route.findById(id)
      .populate("start_id", "name type")
      .populate("stop_id", "name type")
      .lean();

    const routeResponse = await buildRouteResponse(updatedRoute);

    return res.status(200).json({
      success: true,
      message: "Route updated successfully",
      data: routeResponse,
    });
  } catch (error) {
    console.error("❌ Error in updateRoute:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//update bật tắt cập nhật trạng thái route
module.exports.updateRouteStatus = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;
    const { is_active } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid route ID format",
      });
    }

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: "is_active field is required",
      });
    }

    const updatedRoute = await Route.findByIdAndUpdate(
      id,
      { $set: { is_active: Boolean(is_active) } },
      { new: true }
    )
      .populate("start_id", "name type")
      .populate("stop_id", "name type")
      .lean();

    if (!updatedRoute) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Route ${is_active ? "activated" : "deactivated"} successfully`,
      data: {
        _id: updatedRoute._id,
        name: `${updatedRoute.start_id?.name} - ${updatedRoute.stop_id?.name}`,
        is_active: updatedRoute.is_active,
      },
    });
  } catch (error) {
    console.error("❌ Error in updateRouteStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//update thứ tự điểm dừng (stop) trong route
module.exports.updateRouteStopOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { routeId, stopId } = req.params;
    const { new_order } = req.body;

    if (!isValidObjectId(routeId) || !isValidObjectId(stopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    if (!new_order || isNaN(new_order) || new_order < 1) {
      return res.status(400).json({
        success: false,
        message: "new_order must be a positive number",
      });
    }

    // Find route stop
    const routeStop = await RouteStop.findOne({
      route_id: routeId,
      _id: stopId,
    });

    if (!routeStop) {
      return res.status(404).json({
        success: false,
        message: "Route stop not found",
      });
    }

    const oldOrder = routeStop.stop_order;
    const newOrder = parseInt(new_order);

    if (oldOrder === newOrder) {
      return res.status(400).json({
        success: false,
        message: "New order is same as current order",
      });
    }

    // Check max order
    const maxOrderStop = await RouteStop.findOne({ route_id: routeId })
      .sort({ stop_order: -1 })
      .lean();

    const maxOrder = maxOrderStop ? maxOrderStop.stop_order : 0;

    if (newOrder > maxOrder) {
      return res.status(400).json({
        success: false,
        message: `New order cannot exceed ${maxOrder}`,
      });
    }

    // Reorder stops
    if (newOrder > oldOrder) {
      // Moving down: decrement orders between old and new
      await RouteStop.updateMany(
        {
          route_id: routeId,
          stop_order: { $gt: oldOrder, $lte: newOrder },
        },
        { $inc: { stop_order: -1 } },
        { session }
      );
    } else {
      // Moving up: increment orders between new and old
      await RouteStop.updateMany(
        {
          route_id: routeId,
          stop_order: { $gte: newOrder, $lt: oldOrder },
        },
        { $inc: { stop_order: 1 } },
        { session }
      );
    }

    // Update the target stop
    await RouteStop.findByIdAndUpdate(
      stopId,
      { $set: { stop_order: newOrder } },
      { session }
    );

    await session.commitTransaction();

    // Fetch updated route
    const updatedRoute = await Route.findById(routeId)
      .populate("start_id", "name type")
      .populate("stop_id", "name type")
      .lean();

    const routeResponse = await buildRouteResponse(updatedRoute);

    return res.status(200).json({
      success: true,
      message: "Stop order updated successfully",
      data: routeResponse,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error in updateRouteStopOrder:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

// (update status) bật/tắt chức năng đón khách tại một điểm dừng trên tuyến
module.exports.updateStopPickupStatus = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { routeId, stopId } = req.params;
    const { is_pickup } = req.body;

    if (!isValidObjectId(routeId) || !isValidObjectId(stopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    if (is_pickup === undefined) {
      return res.status(400).json({
        success: false,
        message: "is_pickup field is required",
      });
    }

    const updatedRouteStop = await RouteStop.findOneAndUpdate(
      { route_id: routeId, _id: stopId },
      { $set: { is_pickup: Boolean(is_pickup) } },
      { new: true }
    ).populate("stop_id", "name type");

    if (!updatedRouteStop) {
      return res.status(404).json({
        success: false,
        message: "Route stop not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Stop pickup status updated to ${is_pickup}`,
      data: {
        _id: updatedRouteStop._id,
        stop: updatedRouteStop.stop_id,
        stop_order: updatedRouteStop.stop_order,
        is_pickup: updatedRouteStop.is_pickup,
      },
    });
  } catch (error) {
    console.error("❌ Error in updateStopPickupStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//cập nhật location
module.exports.updateLocation = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;
    const { name, address, latitude, longitude, type, is_active } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location ID format",
      });
    }

    const location = await StopLocation.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Build update data
    const updateData = {};

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Location name cannot be empty",
        });
      }
      updateData.location_name = name.trim();
    }

    if (address !== undefined) updateData.address = address;
    if (latitude !== undefined) updateData.latitude = latitude;
    if (longitude !== undefined) updateData.longitude = longitude;

    if (type !== undefined) {
      const validTypes = ["PICKUP", "DROPOFF", "BOTH"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Invalid location type. Must be one of: ${validTypes.join(
            ", "
          )}`,
        });
      }
      updateData.location_type = type;
    }

    if (is_active !== undefined) {
      updateData.is_active = Boolean(is_active);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const updatedLocation = await StopLocation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Location updated successfully",
      data: {
        _id: updatedLocation._id,
        name: updatedLocation.location_name,
        address: updatedLocation.address,
        latitude: updatedLocation.latitude,
        longitude: updatedLocation.longitude,
        type: updatedLocation.location_type,
        is_active: updatedLocation.is_active,
      },
    });
  } catch (error) {
    console.error("❌ Error in updateLocation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//update, bật tắt trạng thái location
module.exports.updateLocationStatus = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;
    const { is_active } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location ID format",
      });
    }

    if (is_active === undefined) {
      return res.status(400).json({
        success: false,
        message: "is_active field is required",
      });
    }

    const updatedLocation = await StopLocation.findByIdAndUpdate(
      id,
      { $set: { is_active: Boolean(is_active) } },
      { new: true }
    );

    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Location ${is_active ? "activated" : "deactivated"
        } successfully`,
      data: {
        _id: updatedLocation._id,
        name: updatedLocation.location_name,
        is_active: updatedLocation.is_active,
      },
    });
  } catch (error) {
    console.error("❌ Error in updateLocationStatus:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//thêm stop mới vào route
module.exports.addStopToRoute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { routeId } = req.params;
    const { stop_id, stop_order, is_pickup = true } = req.body;

    // Validate IDs
    if (!isValidObjectId(routeId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid route ID format",
      });
    }

    if (!stop_id || !isValidObjectId(stop_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing stop_id",
      });
    }

    // Check route exists
    const route = await Route.findById(routeId);
    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Check stop exists in Stops collection
    const stop = await Stop.findById(stop_id);
    if (!stop || !stop.is_active) {
      return res.status(404).json({
        success: false,
        message: "Stop not found or inactive",
      });
    }

    // Check if stop already exists in this route
    const existingRouteStop = await RouteStop.findOne({
      route_id: routeId,
      stop_id: stop_id,
    });

    if (existingRouteStop) {
      return res.status(400).json({
        success: false,
        message: "This stop already exists in the route",
      });
    }

    // Get current max order
    const maxOrderStop = await RouteStop.findOne({ route_id: routeId })
      .sort({ stop_order: -1 })
      .lean();

    const maxOrder = maxOrderStop ? maxOrderStop.stop_order : 0;

    // Determine new order
    let newOrder;
    if (stop_order && !isNaN(stop_order) && stop_order >= 1) {
      newOrder = parseInt(stop_order);

      if (newOrder > maxOrder + 1) {
        return res.status(400).json({
          success: false,
          message: `stop_order cannot exceed ${maxOrder + 1}`,
        });
      }

      // Shift existing stops if inserting in middle
      if (newOrder <= maxOrder) {
        await RouteStop.updateMany(
          {
            route_id: routeId,
            stop_order: { $gte: newOrder },
          },
          { $inc: { stop_order: 1 } },
          { session }
        );
      }
    } else {
      newOrder = maxOrder + 1;
    }

    // Create new route stop
    const newRouteStop = await RouteStop.create(
      [
        {
          route_id: routeId,
          stop_id: stop_id,
          stop_order: newOrder,
          is_pickup: Boolean(is_pickup),
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Populate and return
    const populatedRouteStop = await RouteStop.findById(newRouteStop[0]._id)
      .populate("stop_id", "name type latitude longitude")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Stop added to route successfully",
      data: {
        _id: populatedRouteStop._id,
        order: populatedRouteStop.stop_order,
        stop: populatedRouteStop.stop_id,
        is_pickup: populatedRouteStop.is_pickup,
        locations: [],
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error in addStopToRoute:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

//xóa stop khỏi route
module.exports.removeStopFromRoute = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { routeId, stopId } = req.params;

    if (!isValidObjectId(routeId) || !isValidObjectId(stopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    // Find route stop
    const routeStop = await RouteStop.findOne({
      route_id: routeId,
      _id: stopId,
    });

    if (!routeStop) {
      return res.status(404).json({
        success: false,
        message: "Route stop not found",
      });
    }

    // Check minimum stops (at least 2 stops required for a route)
    const stopCount = await RouteStop.countDocuments({ route_id: routeId });
    if (stopCount <= 2) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove stop. Route must have at least 2 stops.",
      });
    }

    const deletedOrder = routeStop.stop_order;

    // Delete associated locations first
    await StopLocation.deleteMany({ route_stop_id: stopId }, { session });

    // Delete route stop
    await RouteStop.findByIdAndDelete(stopId, { session });

    // Reorder remaining stops
    await RouteStop.updateMany(
      {
        route_id: routeId,
        stop_order: { $gt: deletedOrder },
      },
      { $inc: { stop_order: -1 } },
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Stop removed from route successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error in removeStopFromRoute:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  } finally {
    session.endSession();
  }
};

//Thêm location mới cho route stop
module.exports.addLocationToStop = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { routeId, stopId } = req.params;
    const { name, address, latitude, longitude, type = "BOTH" } = req.body;

    // Validate IDs
    if (!isValidObjectId(routeId) || !isValidObjectId(stopId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      });
    }

    // Check route stop exists
    const routeStop = await RouteStop.findOne({
      route_id: routeId,
      _id: stopId,
    });

    if (!routeStop) {
      return res.status(404).json({
        success: false,
        message: "Route stop not found",
      });
    }

    // Validate name
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Location name is required",
      });
    }

    // Validate type
    const validTypes = ["PICKUP", "DROPOFF", "BOTH"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid location type. Must be one of: ${validTypes.join(
          ", "
        )}`,
      });
    }

    // Create location
    const newLocation = await StopLocation.create({
      route_stop_id: stopId,
      location_name: name.trim(),
      address: address || null,
      latitude: latitude || null,
      longitude: longitude || null,
      location_type: type,
      is_active: true,
    });

    return res.status(201).json({
      success: true,
      message: "Location added successfully",
      data: {
        _id: newLocation._id,
        name: newLocation.location_name,
        address: newLocation.address,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        type: newLocation.location_type,
        is_active: newLocation.is_active,
      },
    });
  } catch (error) {
    console.error("❌ Error in addLocationToStop:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Xóa location
module.exports.deleteLocation = async (req, res) => {
  try {
    const currentUser = res.locals.user;

    // if (!isAdmin(currentUser)) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin privileges required.",
    //   });
    // }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid location ID format",
      });
    }

    const location = await StopLocation.findById(id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: "Location not found",
      });
    }

    // Check if this is the last active location of the stop
    const activeLocationCount = await StopLocation.countDocuments({
      route_stop_id: location.route_stop_id,
      is_active: true,
    });

    if (activeLocationCount <= 1 && location.is_active) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete. Each stop must have at least 1 active location. Deactivate instead.",
      });
    }

    await StopLocation.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error in deleteLocation:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//Hàm lấy tất cả cái loại xe bustype ra
module.exports.getAllBusType = async (req, res) => {
  try {
    const busType = await BusType.find().select("name");
    return res.status(200).json(busType);
  } catch (error) {
    return res.status(404).json({ message: "Không tìm thấy loại xe" });
  }
};
// Hàm tạo xe
module.exports.createBus = async (req, res) => {
  try {
    const { license_plate, bus_type_id, seat_layout } = req.body;
    if (!license_plate || !bus_type_id || !seat_layout) {
      return res.status(404).json({ message: "Các trường là bắt buộc" });
    }
    const bus = await Bus.findOne({ license_plate });
    if (bus) {
      return res.status(409).json({ message: "Biến số xe là bắt buộc" });
    }
    const newBus = await Bus.create({
      license_plate,
      bus_type_id,
      seat_layout,
    });
    await newBus.save();
    return res.status(201).json({ message: "Tạo xe thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
// Hàm lấy tất cả các điểm stop
module.exports.getAllStops = async (req, res) => {
  try {
    const searchStops = await Stops.find().select("name province");
    return res.status(200).json(searchStops);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
// Hàm tính khoảng cách và thời gian của các trạm thủ công với điểm bắt đầu
module.exports.getDurationOfHandicraft = async (req, res) => {
  try {
    const { start_id, stop_id } = req.query;
    if (!start_id || !stop_id) {
      return res.status(404).json({ message: "Các trường là bắt buộc" });
    }
    const start = await Stop.findById(start_id);
    const stop = await Stop.findById(stop_id);
    const [startLng, startLat] = start.location.coordinates;
    const [stopLng, stopLat] = stop.location.coordinates;
    const distanceAndDurationOfHandicraft = await getStartToEndDuration(
      startLng,
      startLat,
      stopLng,
      stopLat
    );
    const estimated_distance_km = distanceAndDurationOfHandicraft.distance_km;
    const estimated_duration = distanceAndDurationOfHandicraft.duration_hour;
    return res.status(200).json({ estimated_duration, estimated_distance_km });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
// Hàm lấy ra những stop ở giữa điểm bắt đầu và kết thúc và sort theo order
module.exports.getSuggestStops = async (req, res) => {
  try {
    const { start_id, stop_id } = req.query;
    const start = await Stops.findById(start_id);
    const end = await Stops.findById(stop_id);
    if (!start || !end) {
      return res.status(404).json({ message: "Không tìm thấy điểm" });
    }
    const [lng1, lat1] = start.location.coordinates;
    const [lng2, lat2] = end.location.coordinates;
    const stops = await Stops.find({
      _id: { $nin: [start_id, stop_id] },
    }).select("name province location");
    const ABx = lng2 - lng1;
    const ABy = lat2 - lat1;
    const AB_squared = ABx * ABx + ABy * ABy;
    const resultStops = stops
      .map((stop) => {
        const [lng, lat] = stop.location.coordinates;
        const ASx = lng - lng1;
        const ASy = lat - lat1;
        const t = (ASx * ABx + ASy * ABy) / AB_squared;
        const distanceToLine = pointToLineDistance(
          lat,
          lng,
          lat1,
          lng1,
          lat2,
          lng2
        );
        const distance_from_start = haversine(lat1, lng1, lat, lng);
        return {
          ...stop.toObject(),
          t,
          distanceToLine,
          distance_from_start,
        };
      })
      .filter((stop) => stop.t >= 0 && stop.t <= 1 && stop.distanceToLine < 1)
      .sort((a, b) => a.distance_from_start - b.distance_from_start);
    const validStops = resultStops.filter(
      (s) =>
        s.location &&
        s.location.coordinates &&
        s.location.coordinates.length === 2
    );
    const coords = [
      `${lng1},${lat1}`,
      ...validStops.map(
        (s) => `${s.location.coordinates[0]},${s.location.coordinates[1]}`
      ),
      `${lng2},${lat2}`,
    ];
    console.log("coords:", coords);
    console.log("coords length:", coords.length);
    const routeData = await getRouteDistanceAndDuration(coords);
    const legs = routeData.legs;

    let cumulativeDuration = 0;
    let cumulativeDistance = 0;

    for (let i = 0; i < resultStops.length; i++) {
      cumulativeDuration += legs[i].duration;
      cumulativeDistance += legs[i].distance;

      resultStops[i].duration_from_start = cumulativeDuration / 3600;
      resultStops[i].distance_from_start = cumulativeDistance / 1000;
    }
    console.log("Recommend Stops:", resultStops);
    return res.status(200).json({
      start,
      recommendedStops: resultStops,
      end,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
// Hàm tạo tuyến đường (bao gồm các các stop node và các điểm con)
// Cơ chế transaction ==> Hoặc là làm TẤT CẢ, hoặc là KHÔNG làm gì cả.
// Sử dụng transaction cho trường hợp khi sai thứ tự stop_order để tránh trường hợp stop_order sai mà nó vẫn thêm vào tuyến mới (Route)
module.exports.createRoutes = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { start_id, stop_id, stops } = req.body;
    if (!start_id || !stop_id || !stops) {
      return res.status(400).json({ message: "Các trường nhập là bắt buộc" });
    }
    const startStop = await Stop.findById(start_id);
    const endStop = await Stop.findById(stop_id);
    const [startLng, startLat] = startStop.location.coordinates;
    const [endLng, endLat] = endStop.location.coordinates;
    const routeInformation =
      await getStartToEndDuration(
        startLng,
        startLat,
        endLng,
        endLat
      );
    const newRoute = await Route.create(
      [
        {
          start_id,
          stop_id,
          distance_km: routeInformation.distance_km,
          estimated_duration: routeInformation.duration_hour,
        },
      ],
      { session }
    );
    const fullStops = [
      {
        stop_id: start_id,
        stop_order: 1,
        estimated_time: 0,
      },
      ...stops,
      {
        stop_id: stop_id,
        stop_order: stops.length + 2,
        estimated_time: routeInformation.duration_hour,
      }
    ]
    const routeId = newRoute[0]._id;
    const newRoute_Stop = fullStops.map((s) => ({
      route_id: routeId,
      stop_id: s.stop_id,
      stop_order: s.stop_order,
      estimated_time: s.duration_from_start || s.estimated_time,
    }));
    const routeStops = await Route_Stop.insertMany(newRoute_Stop, { session });
    routeStops.sort((a, b) => a.stop_order - b.stop_order);
    const routeSegments = [];
    for (let i = 0; i < routeStops.length; i++) {
      for (let j = i + 1; j < routeStops.length; j++) {
        routeSegments.push({
          route_id: routeId,
          start_id: routeStops[i]._id,
          end_id: routeStops[j]._id,
        });
      }
    }
    await RouteSegmentPrice.insertMany(routeSegments, { session });
    await session.commitTransaction();
    return res.status(201).json({ message: "Tạo tuyến thành công" });
  } catch (error) {
    await session.abortTransaction();
    if (error.code === 110000) {
      return res.status(400).json({
        message: "Thứ tự các điểm bị trùng trong cùng 1 tuyến",
      });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
// Hàm lấy vị trí Stop Location
module.exports.getGeoOfStopLocation = async (req, res) => {
  console.log("chạy vào lấy vị trí");
  try {
    const { location_name } = req.body;
    if (!location_name) {
      return res.status(400).json({ message: "Các trường là bắt buộc" });
    }
    console.log("1");
    const coordinates = await geocodeVietnamese(location_name);
    if (!coordinates) {
      return res.status(404).json({ message: "Không tìm thấy địa điểm" });
    }
    console.log("2");
    return res.status(200).json({ coordinates });
  } catch (error) {
    console.error("FULL ERROR:", error);

    return res.status(500).json({ message: error.message });
  }
};
// Hàm tạo Stop location;
module.exports.createStopLocation = async (req, res) => {
  try {
    const { stop_id, location_name, address, location } = req.body;
    if (!stop_id || !location_name || !address || !location) {
      return res.status(400).json({ message: "Các trường là bắt buộc" });
    }
    const stopLocation = await StopLocation.findOne({ location_name });
    if (stopLocation) {
      return res
        .status(400)
        .json({ message: "Vị trí lên xuống này đã tồn tại" });
    }
    const newStopLocation = await StopLocation.create({
      stop_id,
      location_name,
      address,
      location,
    });
    await newStopLocation.save();
    return res.status(201).json({ message: "Tạo vị trí lên xuống thành công" });
  } catch (error) {
    console.error("FULL ERROR:", error);
    return res.status(500).json({ message: error.message });
  }
};
// Hàm get all route
module.exports.getAllRoutes = async (req, res) => {
  try {
    const allRoutes = await Route.find()
      .select("start_id stop_id estimated_duration")
      .populate("start_id", "name")
      .populate("stop_id", "name");
    return res.status(200).json(allRoutes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
// Hàm lấy tất cả xe đã check conflict lịch
module.exports.getAllBuses = async (req, res) => {
  console.log("chạy vào allbus")
  try {
    const { shift_start, shift_end, start_stop_id } = req.query;
    if (!shift_start || !shift_end || !start_stop_id) {
      return res.status(400).json({
        message: "Thiếu shift_start, shift_end hoặc start_stop_id",
      });
    }
    const start = new Date(shift_start);
    const end = new Date(shift_end);

    const BOARDING_BUFFER = 15;

    const CLEAN_TIME = 30;
    const busyTrips = await Trip.find({
      status: { $in: ["SCHEDULED", "RUNNING"] },

      departure_time: { $lt: end },
      arrival_time: { $gt: start },
    }).select("bus_id");

    const busyBusIds = new Set(
      busyTrips.map((trip) => trip.bus_id.toString())
    );
    const lastTrips = await Trip.aggregate([
      {
        $match: {
          status: { $in: ["SCHEDULED", "RUNNING", "FINISHED"] },
          arrival_time: { $lte: start },
        },
      },
      { $sort: { arrival_time: -1 } },
      {
        $group: {
          _id: "$bus_id",
          end: { $first: "$arrival_time" },
          route_id: { $first: "$route_id" },
        },
      },
      {
        $lookup: {
          from: "routes",
          localField: "route_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: "$route" },
      {
        $project: {
          end: 1,
          end_stop_id: "$route.stop_id",
        },
      },
    ]);
    console.log("lastTrips raw:", JSON.stringify(lastTrips, null, 2));
    const lastTripMap = {};

    lastTrips.forEach((trip) => {
      lastTripMap[trip._id.toString()] = {
        end: new Date(trip.end),
        location: trip.end_stop_id,
      };
    });

    const futureTrips = await Trip.aggregate([
      {
        $match: {
          status: { $in: ["SCHEDULED", "RUNNING"] },
          departure_time: { $gte: start },
        },
      },
      { $sort: { departure_time: 1 } },
      {
        $group: {
          _id: "$bus_id",
          start: { $first: "$departure_time" },
          route_id: { $first: "$route_id" },
        },
      },
      {
        $lookup: {
          from: "routes",
          localField: "route_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: "$route" },
      {
        $project: {
          start: 1,
          start_stop_id: "$route.start_id",
          end_stop_id: "$route.stop_id",
        },
      },
    ]);
    const futureTripMap = {};

    futureTrips.forEach((trip) => {
      futureTripMap[trip._id.toString()] = trip;
    });
    const buses = await Bus.find()
      .select("_id license_plate bus_type_id current_stop_id")
      .populate("bus_type_id", "name")
      .lean();
    const result = [];

    for (const bus of buses) {
      const busId = bus._id.toString();

      if (busyBusIds.has(busId)) continue;

      const lastTrip = lastTripMap[busId];
      const futureTrip = futureTripMap[busId];

      let busLocation = bus.current_stop_id;
      if (lastTrip && lastTrip.location) {
        busLocation = lastTrip.location;
      }
      if (!busLocation) continue;
      if (busLocation.toString() !== start_stop_id.toString()) {
        continue;
      }
      if (futureTrip) {
        if (
          futureTrip.start_stop_id.toString() !==
          start_stop_id.toString()
        ) {
          continue;
        }
      }
      let breakMinutes = Infinity;
      if (lastTrip) {
        breakMinutes = (start - lastTrip.end) / (1000 * 60);
      }
      const requiredBreak = CLEAN_TIME + BOARDING_BUFFER;
      let status = "GREEN";
      let warning = null;
      if (breakMinutes < requiredBreak) {
        status = "YELLOW";
        warning = "Xe không đủ thời gian nghỉ giữa 2 chuyến";
      }
      result.push({
        ...bus,
        bus_location: busLocation,
        breakMinutes: Math.round(breakMinutes),
        requiredBreak,
        status,
        warning,
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
// Hàm lấy tài xế đã check conflict lịch
// Hàm lấy danh sách tài xế có thể assign cho chuyến mới
module.exports.getAvailableDrivers = async (req, res) => {
  try {
    const { shift_start, shift_end, start_stop_id, travel_duration } = req.query;
    if (!shift_start || !shift_end || !start_stop_id || !travel_duration) {
      return res.status(400).json({
        message: "Thiếu shift_start, shift_end, start_stop_id hoặc travel_duration",
      });
    }
    const start = new Date(shift_start);
    const end = new Date(shift_end);

    const BOARDING_BUFFER = 15;
    const MIN_REST = 120;
    const driverRole = await Role.findOne({ name: "DRIVER" }).lean();
    const drivers = await User.find({ role: driverRole._id })
      .select("_id name phone current_stop_id")
      .lean();
    const driverIds = drivers.map((d) => d._id);
    const busyTrips = await Trip.find({
      status: { $in: ["SCHEDULED", "RUNNING"] },
      drivers: {
        $elemMatch: {
          shift_start: { $lt: end },
          shift_end: { $gt: start },
        },
      },
    }).select("drivers");
    const busyDriverIds = new Set();

    busyTrips.forEach((trip) => {
      trip.drivers.forEach((d) => {
        if (d.shift_start < end && d.shift_end > start) {
          busyDriverIds.add(d.driver_id.toString());
        }
      });
    });
    const lastTrips = await Trip.aggregate([
      {
        $match: {
          status: { $in: ["SCHEDULED", "RUNNING", "FINISHED"] },
        },
      },
      { $unwind: "$drivers" },
      {
        $match: {
          "drivers.driver_id": { $in: driverIds },
          arrival_time: { $lte: start },
        },
      },
      { $sort: { arrival_time: -1 } },
      {
        $group: {
          _id: "$drivers.driver_id",
          end: { $first: "$arrival_time" },
          route_id: { $first: "$route_id" },
        },
      },
      {
        $lookup: {
          from: "routes",
          localField: "route_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: "$route" },
      {
        $project: {
          end: 1,
          end_stop_id: "$route.stop_id",
        },
      },
    ]);
    const lastTripMap = {};
    lastTrips.forEach((trip) => {
      lastTripMap[trip._id.toString()] = {
        end: new Date(trip.end),
        location: trip.end_stop_id,
      };
    });
    const futureTrips = await Trip.aggregate([
      {
        $match: {
          status: { $in: ["SCHEDULED", "RUNNING"] },
        },
      },
      { $unwind: "$drivers" },
      {
        $match: {
          "drivers.driver_id": { $in: driverIds },
          departure_time: { $gte: start },
        },
      },
      { $sort: { departure_time: 1 } },
      {
        $group: {
          _id: "$drivers.driver_id",
          start: { $first: "$departure_time" },
          route_id: { $first: "$route_id" },
        },
      },
      {
        $lookup: {
          from: "routes",
          localField: "route_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: "$route" },
      {
        $project: {
          start: 1,
          start_stop_id: "$route.start_id",
        },
      },
    ]);
    const futureTripMap = {};
    futureTrips.forEach((trip) => {
      futureTripMap[trip._id.toString()] = trip;
    });
    const result = [];
    for (const driver of drivers) {
      const driverId = driver._id.toString();
      if (busyDriverIds.has(driverId)) continue;

      const lastTrip = lastTripMap[driverId];
      const futureTrip = futureTripMap[driverId];
      if (futureTrip) {
        if (futureTrip.start_stop_id.toString() !== start_stop_id.toString()) {
          continue;
        }
      }
      let driverLocation = driver.current_stop_id;
      let breakMinutes = Infinity;
      if (lastTrip && lastTrip.location) {
        driverLocation = lastTrip.location;
        breakMinutes = (start - lastTrip.end) / (1000 * 60);
      }
      if (!driverLocation) continue;
      if (driverLocation.toString() !== start_stop_id.toString()) {
        continue;
      }
      const requiredBreak = MIN_REST + BOARDING_BUFFER;
      let status = "GREEN";
      let warning = null;
      if (breakMinutes < requiredBreak) {
        status = "YELLOW";
        warning = "Không đủ thời gian nghỉ giữa các chuyến";
      }
      result.push({
        ...driver,
        driver_location: driverLocation,
        breakMinutes: Math.round(breakMinutes),
        requiredBreak,
        status,
        warning,
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};


// hàm lấy lơ xe lơ xe 
module.exports.getAvailableAssistantDriver = async (req, res) => {
  try {
    const { shift_start, shift_end, start_stop_id } = req.query;

    const assistantRole = await Role.findOne({ name: "ASSISTANT" }).lean();
    if (!assistantRole) {
      return res.status(404).json({ message: "Không tìm thấy role ASSISTANT" });
    }
    const assistants = await User.find({ role: assistantRole._id })
      .select("_id name email phone current_stop_id")
      .lean();
    if (!shift_start || !shift_end || !start_stop_id) {
      return res.status(200).json(assistants);
    }
    const start = new Date(shift_start);
    const end = new Date(shift_end);
    const BOARDING_BUFFER = 15;
    const MIN_REST = 120;
    const assistantIds = assistants.map((a) => a._id);
    const busyTrips = await Trip.find({
      status: { $in: ["SCHEDULED", "RUNNING"] },

      drivers: {
        $elemMatch: {
          shift_start: { $lt: end },
          shift_end: { $gt: start },
        },
      },
      assistant_id: { $in: assistantIds },
    }).select("assistant_id");

    const busyAssistantIds = new Set(
      busyTrips.map((trip) => trip.assistant_id.toString())
    );
    const lastTrips = await Trip.aggregate([
      {
        $match: {
          status: { $in: ["SCHEDULED", "RUNNING", "FINISHED"] },
          assistant_id: { $in: assistantIds },
          arrival_time: { $lte: start },
        },
      },
      { $sort: { arrival_time: -1 } },
      {
        $group: {
          _id: "$assistant_id",
          end: { $first: "$arrival_time" },
          route_id: { $first: "$route_id" },
        },
      },
      {
        $lookup: {
          from: "routes",
          localField: "route_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: "$route" },
      {
        $project: {
          end: 1,
          end_stop_id: "$route.stop_id",
        },
      },
    ]);
    const lastTripMap = {};
    lastTrips.forEach((trip) => {
      lastTripMap[trip._id.toString()] = {
        end: new Date(trip.end),
        location: trip.end_stop_id,
      };
    });
    const futureTrips = await Trip.aggregate([
      {
        $match: {
          status: { $in: ["SCHEDULED", "RUNNING"] },
          assistant_id: { $in: assistantIds },
          departure_time: { $gte: start },
        },
      },
      { $sort: { departure_time: 1 } },
      {
        $group: {
          _id: "$assistant_id",
          start: { $first: "$departure_time" },
          route_id: { $first: "$route_id" },
        },
      },
      {
        $lookup: {
          from: "routes",
          localField: "route_id",
          foreignField: "_id",
          as: "route",
        },
      },
      { $unwind: "$route" },
      {
        $project: {
          start: 1,
          start_stop_id: "$route.start_id",
        },
      },
    ]);
    const futureTripMap = {};
    futureTrips.forEach((trip) => {
      futureTripMap[trip._id.toString()] = trip;
    });
    const result = [];
    for (const assistant of assistants) {
      const assistantId = assistant._id.toString();
      if (busyAssistantIds.has(assistantId)) continue;
      const lastTrip = lastTripMap[assistantId];
      const futureTrip = futureTripMap[assistantId];
      if (futureTrip) {
        if (futureTrip.start_stop_id.toString() !== start_stop_id.toString()) {
          continue;
        }
      }
      let assistantLocation = assistant.current_stop_id;
      let breakMinutes = Infinity;
      if (lastTrip && lastTrip.location) {
        assistantLocation = lastTrip.location;
        breakMinutes = (start - lastTrip.end) / (1000 * 60);
      }
      if (!assistantLocation) continue;
      if (assistantLocation.toString() !== start_stop_id.toString()) {
        continue;
      }
      const requiredBreak = MIN_REST + BOARDING_BUFFER;
      let status = "GREEN";
      let warning = null;
      if (breakMinutes < requiredBreak) {
        status = "YELLOW";
        warning = "Không đủ thời gian nghỉ giữa các chuyến";
      }
      result.push({
        ...assistant,
        assistant_location: assistantLocation,
        breakMinutes: Math.round(breakMinutes),
        requiredBreak,
        status,
        warning,
      });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message });
  }
};
// Hàm tạo Trip;
module.exports.createTrips = async (req, res) => {
  try {
    const {
      route_id,
      bus_id,
      drivers,
      assistant_id,
      departure_time,
      arrival_time,
      scheduled_duration,
    } = req.body;
    if (
      !route_id ||
      !bus_id ||
      !drivers ||
      !assistant_id ||
      !departure_time ||
      !arrival_time ||
      !scheduled_duration
    ) {
      return res.status(400).json({ message: "Các trường là bắt buộc" });
    };
    if (new Date(departure_time) <= new Date(Date.now())) {
      return res.status(400).json({
        message: "Thời gian khởi hành phải là thời gian trong tương lai",
      });
    }
    const route = await Route.findById(route_id);
    if (!route) {
      return res.status(404).json({ message: "Tuyến không tồn tại" });
    }
    const bus = await Bus.findById(bus_id);
    if (!bus) {
      return res.status(404).json({ message: "Xe không tồn tại" });
    }
    const assistant = await User.findById(assistant_id);
    if (!assistant || assistant.role != "696ca255bc014a7a76f7caa8") {
      return res.status(404).json({ message: "Phụ xe không tồn tại" });
    }
    for (let d of drivers) {
      const driver = await User.findById(d.driver_id);
      if (!driver || driver.role != "696ca255bc014a7a76f7caa7") {
        return res.status(404).json({ message: "Tài xế không tồn tại" });
      }
      if (
        new Date(d.shift_start) < new Date(departure_time) ||
        new Date(d.shift_end) > new Date(arrival_time)
      ) {
        return res.status(400).json({
          message: `Ca làm của tài xế ${driver.name} không nằm trong thời gian chuyến.`,
        });
      }
    };
    const trip = new Trip({
      route_id,
      bus_id,
      drivers,
      assistant_id,
      departure_time,
      arrival_time,
      scheduled_duration,
    });
    await trip.save();
    return res.status(201).json({ message: "Tạo chuyến thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// --- VIEW TRIPS (list) ---
module.exports.getAllTrips = async (req, res) => {
  try {
    // No admin auth required here per request
    const {
      page = 1,
      limit = 10,
      status,
      route_id,
      bus_id,
      from,
      to,
      search,
    } = req.query;
    const { page: validPage, limit: validLimit } = validatePagination(
      page,
      limit
    );
    const skip = (validPage - 1) * validLimit;

    const query = {};

    if (status) {
      query.status = status;
    }
    if (route_id && isValidObjectId(route_id)) {
      query.route_id = route_id;
    }
    if (bus_id && isValidObjectId(bus_id)) {
      query.bus_id = bus_id;
    }
    if (from || to) {
      query.departure_time = {};
      if (from) {
        const fromDate = new Date(from);
        if (!isNaN(fromDate)) query.departure_time.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (!isNaN(toDate)) query.departure_time.$lte = toDate;
      }
      // remove empty object
      if (Object.keys(query.departure_time).length === 0)
        delete query.departure_time;
    }
    if (search && search.trim()) {
      // search in bus license_plate or route start/stop names (simple approach)
      const s = search.trim();
      query.$or = [{ "bus_id.license_plate": { $regex: s, $options: "i" } }];
      // Note: bus_id.license_plate won't work unless we denormalize; keep simple by fetching and filtering later if needed
    }

    const [trips, total] = await Promise.all([
      Trip.find(query)
        .populate({
          path: "route_id",
          populate: [
            { path: "start_id", select: "name" },
            { path: "stop_id", select: "name" },
          ],
        })
        .populate({
          path: "bus_id",
          populate: { path: "bus_type_id", select: "name" },
        })
        .populate("drivers.driver_id", "name phone")
        .populate("assistant_id", "name phone")
        .sort({ departure_time: -1 })
        .skip(skip)
        .limit(validLimit)
        .lean(),
      Trip.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      message: "Trips retrieved successfully",
      data: {
        trips,
        pagination: {
          currentPage: validPage,
          totalPages: Math.ceil(total / validLimit),
          totalItems: total,
          itemsPerPage: validLimit,
        },
      },
    });
  } catch (error) {
    console.error("❌ Error in getAllTrips:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// --- VIEW SINGLE TRIP ---
module.exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid trip id" });
    }

    const trip = await Trip.findById(id)
      .populate({
        path: "route_id",
        populate: [
          { path: "start_id", select: "name latitude longitude" },
          { path: "stop_id", select: "name latitude longitude" },
        ],
      })
      .populate({
        path: "bus_id",
        populate: { path: "bus_type_id", select: "name" },
      })
      .populate("drivers.driver_id", "name phone")
      .populate("assistant_id", "name phone")
      .lean();

    if (!trip) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    // Optionally attach route stops & locations
    const route = trip.route_id;
    if (route) {
      const routeDetail = await buildRouteResponse(route);
      trip.route_detail = routeDetail;
    }

    return res
      .status(200)
      .json({ success: true, message: "Trip retrieved", data: trip });
  } catch (error) {
    console.error("❌ Error in getTripById:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

//UPdate trip
module.exports.updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid trip id" });
    }

    const existing = await Trip.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Trip not found" });
    }

    const {
      route_id,
      bus_id,
      drivers,
      assistant_id,
      departure_time,
      arrival_time,
      scheduled_distance,
      scheduled_duration,
      status,
    } = req.body;

    const updateData = {};

    // route & bus basic validation
    if (route_id !== undefined) {
      if (!isValidObjectId(route_id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid route_id" });
      }
      updateData.route_id = route_id;
    }

    if (bus_id !== undefined) {
      if (!isValidObjectId(bus_id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid bus_id" });
      }
      updateData.bus_id = bus_id;
    }

    // drivers: expect array of { driver_id, shift_start, shift_end, status? }
    if (drivers !== undefined) {
      if (!Array.isArray(drivers)) {
        return res
          .status(400)
          .json({ success: false, message: "drivers must be an array" });
      }

      // find DRIVER role id if exists (optional)
      const driverRoleDoc = await Role.findOne({ name: "DRIVER" }).lean();

      const parsedDrivers = [];
      for (const d of drivers) {
        if (!d.driver_id || !isValidObjectId(d.driver_id)) {
          return res.status(400).json({
            success: false,
            message: "Each driver must have a valid driver_id",
          });
        }

        const driver = await User.findById(d.driver_id).lean();
        if (!driver) {
          return res.status(404).json({
            success: false,
            message: `Driver ${d.driver_id} not found`,
          });
        }

        if (
          driverRoleDoc &&
          String(driver.role) !== String(driverRoleDoc._id)
        ) {
          return res.status(400).json({
            success: false,
            message: `User ${driver._id} is not a DRIVER`,
          });
        }

        const parsed = { driver_id: d.driver_id };

        if (d.shift_start !== undefined) {
          const ss = new Date(d.shift_start);
          if (isNaN(ss)) {
            return res.status(400).json({
              success: false,
              message: "Invalid shift_start for driver",
            });
          }
          parsed.shift_start = ss;
        } else if (d.shift_start === undefined && d.shift_end !== undefined) {
          // allow partial but validate later against trip times
        }

        if (d.shift_end !== undefined) {
          const se = new Date(d.shift_end);
          if (isNaN(se)) {
            return res.status(400).json({
              success: false,
              message: "Invalid shift_end for driver",
            });
          }
          parsed.shift_end = se;
        }

        if (d.status !== undefined) {
          if (!["PENDING", "RUNNING", "DONE"].includes(d.status)) {
            return res.status(400).json({
              success: false,
              message: "Invalid driver status (PENDING|RUNNING|DONE)",
            });
          }
          parsed.status = d.status;
        }

        parsedDrivers.push(parsed);
      }

      updateData.drivers = parsedDrivers;
    }

    // assistant validation (allow null to unset)
    if (assistant_id !== undefined) {
      if (assistant_id !== null && !isValidObjectId(assistant_id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid assistant_id" });
      }
      if (assistant_id !== null) {
        const assistant = await User.findById(assistant_id).lean();
        if (!assistant) {
          return res
            .status(404)
            .json({ success: false, message: "Assistant not found" });
        }
        const assistantRoleDoc = await Role.findOne({
          name: "ASSISTANT",
        }).lean();
        if (
          assistantRoleDoc &&
          String(assistant.role) !== String(assistantRoleDoc._id)
        ) {
          return res
            .status(400)
            .json({ success: false, message: "User is not an ASSISTANT" });
        }
      }
      updateData.assistant_id = assistant_id;
    }

    // times
    let newDeparture = undefined;
    let newArrival = undefined;
    if (departure_time !== undefined) {
      const dt = new Date(departure_time);
      if (isNaN(dt))
        return res
          .status(400)
          .json({ success: false, message: "Invalid departure_time" });
      updateData.departure_time = dt;
      newDeparture = dt;
    }
    if (arrival_time !== undefined) {
      const at = new Date(arrival_time);
      if (isNaN(at))
        return res
          .status(400)
          .json({ success: false, message: "Invalid arrival_time" });
      updateData.arrival_time = at;
      newArrival = at;
    }

    // if only one of departure/arrival provided, ensure logical order using existing times
    const effectiveDeparture = newDeparture || existing.departure_time;
    const effectiveArrival = newArrival || existing.arrival_time;
    if (
      effectiveDeparture &&
      effectiveArrival &&
      effectiveArrival <= effectiveDeparture
    ) {
      return res.status(400).json({
        success: false,
        message: "arrival_time must be after departure_time",
      });
    }

    // if drivers provided, ensure driver shifts lie within trip time (use effective times)
    if (updateData.drivers) {
      for (const d of updateData.drivers) {
        if (d.shift_start && d.shift_end) {
          if (effectiveDeparture && d.shift_start < effectiveDeparture) {
            return res.status(400).json({
              success: false,
              message: `Driver ${d.driver_id} shift_start is before trip departure_time`,
            });
          }
          if (effectiveArrival && d.shift_end > effectiveArrival) {
            return res.status(400).json({
              success: false,
              message: `Driver ${d.driver_id} shift_end is after trip arrival_time`,
            });
          }
          if (d.shift_end <= d.shift_start) {
            return res.status(400).json({
              success: false,
              message: `Driver ${d.driver_id} shift_end must be after shift_start`,
            });
          }
        }
      }
    }

    // scheduled distance/duration validation
    if (scheduled_distance !== undefined) {
      const sd = Number(scheduled_distance);
      if (isNaN(sd) || sd < 0)
        return res
          .status(400)
          .json({ success: false, message: "Invalid scheduled_distance" });
      updateData.scheduled_distance = sd;
    }

    if (scheduled_duration !== undefined) {
      const sdur = Number(scheduled_duration);
      if (isNaN(sdur) || sdur < 0)
        return res
          .status(400)
          .json({ success: false, message: "Invalid scheduled_duration" });
      updateData.scheduled_duration = sdur;
    }

    // status
    if (status !== undefined) {
      const allowed = ["SCHEDULED", "RUNNING", "FINISHED", "CANCELLED"];
      if (!allowed.includes(status))
        return res
          .status(400)
          .json({ success: false, message: "Invalid status value" });
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No valid fields to update" });
    }

    const updated = await Trip.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate({
        path: "route_id",
        populate: [
          { path: "start_id", select: "name latitude longitude" },
          { path: "stop_id", select: "name latitude longitude" },
        ],
      })
      .populate({
        path: "bus_id",
        populate: { path: "bus_type_id", select: "name" },
      })
      .populate("drivers.driver_id", "name phone")
      .populate("assistant_id", "name phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("❌ Error in updateTrip:", error);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// Hàm tạo tài khoản nhân viên
module.exports.createStaffAccount = async (req, res) => {
  try {
    const { name, phone, password, role } = req.body;
    if (!name || !phone || !password || !role) {
      return res.status(404).json({ message: "Các trường nhập là bắt buộc" });
    }
    const existedStaff = await User.findOne({ phone });
    if (existedStaff) {
      return res.status(400).json({ message: "Số điện thoại đã được đăng kí" });
    }
    const newStaff = await User.create({
      name,
      phone,
      password,
      role,
    });
    await newStaff.save();
    return res
      .status(201)
      .json({ message: "Tạo tài khoản nhân viên thành công" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
module.exports.searchStopsTimeTable = async (req, res) => {
  try {
    const { keyword } = req.query;
    const searchStops = await Stops.find({
      province: { $regex: keyword, $options: "i" },
    }).select("-name");
    return res.status(200).json(searchStops);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
