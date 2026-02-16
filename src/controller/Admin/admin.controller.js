const User = require("../../model/Users");
const Role = require("../../model/Role");
const Bus = require("../../model/Bus");
const BusType = require("../../model/BusType");
const Route = require("../../model/Routers");
const Stop = require("../../model/Stops");
const RouteStop = require("../../model/route_stops");
const StopLocation = require("../../model/StopLocation");
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
}

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
module.exports.searchStops = async (req, res) => {
  try {
    const { keyword } = req.query;
    const searchStops = await Stops.find({ name: { $regex: keyword, $options: "i" } });
    return res.status(200).json(searchStops);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
// Hàm lấy ra những stop ở giữa điểm bắt đầu và kết thúc và sort theo order
module.exports.getSuggestStops = async (req, res) => {
  try {
    const { start_id, stop_id } = req.query;
    const start = await Stops.findById(start_id);
    const end = await Stops.findById(stop_id);
    if (!start || !end) {
      return res.status(404).json({ message: "Không tìm thấy điểm" });
    }
    const startLocation = start.location.coordinates;
    const [lng1, lat1] = start.location.coordinates;
    const [lng2, lat2] = end.location.coordinates;
    const minLat = Math.min(lat1, lat2);
    const maxLat = Math.max(lat1, lat2);
    const minLng = Math.min(lng1, lng2);
    const maxLng = Math.max(lng1, lng2);
    // Tính khoảng cách từ start -> end
    const [endDistanceResult] = await Stops.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: startLocation,
          },
          distanceField: "distance",
          spherical: true,
          query: { _id: end._id }, // chỉ tính cho end
        },
      },
    ]);
    const endDistance = endDistanceResult.distance;
    const stops = await Stops.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: startLocation
          },
          distanceField: "distance",
          spherical: true,
          query: {
            "location.coordinates.1": { $gte: minLat, $lte: maxLat },
            "location.coordinates.0": { $gte: minLng, $lte: maxLng },
            _id: { $nin: [start._id, end._id] }
          }
        }
      },
      {
        $match: {
          distance: { $lte: endDistance }
        }
      },
      {
        $project: {
          name: 1,
          province: 1,
          distance: 1
        }
      }
    ]);
    return res.status(200).json({ start, recommendedStops: stops, end });
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
      return res.status(404).json({ message: "Các trường nhập là bắt buộc" });
    }
    const newRoute = await Route.create(
      {
        start_id,
        stop_id,
      },
    );
    await newRoute.save(session);
    const newRoute_Stop = stops.map((s) => ({
      route_id: newRoute._id,
      stop_id: s.stop_id,
      stop_order: s.stop_order,
    }));
    await Route_Stop.insertMany(newRoute_Stop, { session });
    await session.commitTransaction();
    return res.status(201).json({ message: "Tạo tuyến thành công" });
  } catch (error) {
    await session.abortTransaction(); // rollback khi lỗi, hủy toàn bộ transaction, trả về lại trạng thái lúc đầu.
    if (error.code === 110000) {
      return res
        .status(400)
        .json({ message: "Thứ tự các điểm bị trùng trong cùng 1 tuyến" });
    }
    return res.status(500).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
