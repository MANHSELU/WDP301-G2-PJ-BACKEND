const trip = require("./../../model/Trip")
const bus = require("./../../model/Bus")
const router = require("./../../model/Routers")
const stop = require("./../../model/Stops")
const bustype = require("./../../model/BusType")
const router_stop = require("./../../model/route_stops")
const API = process.env.API_VERIFY;
module.exports.faceLogin = async (req, res) => {
    try {
        console.log("chạy vào login face")
        const { image } = req.body;
        const userId = res.locals.user.id
        // 1️⃣ Validate
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Thiếu dữ liệu ảnh"
            });
        }
        // 2️⃣ Gửi sang Python AI
        const pythonRes = await fetch(
            `${API}/face-login`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    user_id: userId,
                    image: image,
                })
            }
        );
        console.log("gọi python")
        if (!pythonRes.ok) {
            throw new Error("Python server lỗi");
        }

        const result = await pythonRes.json();
        console.log("result là : ", result)
        if (!result.success) {
            return res.status(401).json({
                success: false,
                message: "Xác thực thất bại"
            });
        }

        // 4️⃣ TODO: Tạo JWT / session nếu cần
        // const token = jwt.sign({ userId: result.user_id }, process.env.JWT_SECRET)

        return res.json({
            success: true,
            similarity: result.similarity,
            user_id: result.user_id
            // token
        });

    } catch (err) {
        console.log("❌ Lỗi faceLogin:", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};
module.exports.registerCamera = async (req, res) => {
    try {
        const { image } = req.body;
        // 1️⃣ Validate input
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Missing userId or image",
            });
        }
        const userId = res.locals.user.id
        // 3️⃣ Call Python Face Register API
        const response = await fetch(`${API}/face-register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                user_id: userId,
                image: image,
            }),
        });
        // 4️⃣ Python trả lỗi
        const data = await response.json();

        // ❌ nếu Python báo lỗi
        if (!data.success) {
            return res.status(400).json({
                success: false,
                message: data.error || data.message || "Face register failed",
            });
        }

        // 5️⃣ Thành công
        return res.status(200).json({
            success: true,
            message: "Face registered successfully",
        });

    } catch (error) {
        console.error("registerCamera error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
module.exports.trips = async (req, res) => {
    try {
        const userId = res.locals.user.id
        console.log("usersId là : ", userId)
        const trips = await trip.find({
            $or: [{
                "drivers.driver_id": userId
            }
            ]
        })
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({
                path: "bus_id",
                populate: {
                    path: "bus_type_id"
                }
            }
            )
            .populate({
                path: "route_id",
                populate: [
                    {
                        path: "start_id"
                    },
                    {
                        path: "stop_id"
                    }
                ]
            })
            .populate("assistant_id", "-face_embedding -password -role")
        res.status(200).json({
            message: "successfully",
            data: trips
        })
    } catch (err) {
        console.log("lỗi trong chương trình là : ", err)
        res.status(500).json({
            message: "Server error",
        })
    }
}
module.exports.updateStrip = async (req, res) => {
    try {
        const { id } = req.body;

        const updatedTrip = await trip.findByIdAndUpdate(
            id,
            { status: "RUNNING" },
            { new: true }
        ) // trả về bản ghi sau khi update như kiểu là console.log ra thì trả về mới 
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({
                path: "bus_id",
                populate: {
                    path: "bus_type_id"
                }
            }
            )
            .populate({
                path: "route_id",
                populate: [
                    {
                        path: "start_id"
                    },
                    {
                        path: "stop_id"
                    }
                ]
            })
            .populate("assistant_id", "-face_embedding -password -role")

        if (!updatedTrip) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }

        return res.status(200).json({
            message: "Update status successfully",
            data: updatedTrip
        });

    } catch (err) {
        console.log("Lỗi:", err);
        return res.status(500).json({
            message: "Server error"
        });
    }
}
module.exports.tripDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = res.locals.user.id
        const trips = await trip.findOne({
            _id: id,
            $or: [{
                "drivers.driver_id": userId
            }
            ]
        })
            .populate("drivers.driver_id", "-face_embedding -password -role")
            .populate({
                path: "bus_id",
                populate: {
                    path: "bus_type_id"
                }
            }
            )
            .populate({
                path: "route_id",
                populate: [
                    {
                        path: "start_id"
                    },
                    {
                        path: "stop_id"
                    }
                ]
            })
            .populate("assistant_id", "-face_embedding -password -role")
        if (!trips) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }
        // router stop node con là 
        const router_stops = await router_stop.find({
            route_id: trips.route_id
        }).populate("stop_id")
            .sort({ order: 1 });
        const tripObj = trips.toObject();
        console.log("router stops node là : ", router_stops)
        return res.status(200).json({
            message: "OK",
            data: { ...tripObj, router_stops }
        });
    } catch (err) {
        console.log("lỗi trong chương trình trên là : ", err)
        return res.status(500).json({
            message: "Server error"
        });
    }
}
// Format YYYY-MM-DD
function formatDate(date) {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
}

// Format HH:mm
function formatTime(date) {
    if (!date) return null;

    return new Date(date).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// Format YYYY-MM-DD HH:mm
function formatDateTime(date) {
    if (!date) return null;

    return new Date(date).toLocaleString("vi-VN", {
        hour12: false,
    });
}

// Tính duration giữa 2 thời gian
function formatDuration(start, end) {
    if (!start || !end) return "N/A";

    const diff = new Date(end) - new Date(start);

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
}

module.exports.getAllTripsForDrivers = async (req, res) => {
    console.log("chạy vào lấy slot ca lái")
    try {
        const driverId = res.locals.user.id;
        const { status, limit = 10, page = 1 } = req.query;

        // Validate driverId
        if (!driverId) {
            return res.status(400).json({
                success: false,
                message: "Driver ID is required",
            });
        }

        // Build filter
        let filter = {
            "drivers.driver_id": driverId,
            status: { $ne: "CANCELLED" },
        };

        // Optional: Filter by shift status
        if (status && ["PENDING", "RUNNING", "DONE"].includes(status)) {
            filter["drivers.status"] = status;
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Query trips with driver shifts
        const trips = await trip.find(filter)
            .populate({
                path: "route_id",
                select: "departure_location arrival_location distance",
            })
            .populate({
                path: "bus_id",
                select: "license_plate bus_type_id",
                populate: {
                    path: "bus_type_id",
                    select: "name seats_count",
                },
            })
            .populate({
                path: "drivers.driver_id",
                select: "name phone",
            })
            .sort({ "drivers.shift_start": -1 }) // Sort newest to oldest
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const total = await trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        // Transform data for frontend
        const shiftsData = trips.flatMap((trip) => {
            // Find driver's shifts in this trip
            const driverShifts = trip.drivers.filter(
                (d) => d.driver_id._id.toString() === driverId
            );

            return driverShifts.map((shift) => ({
                id: trip._id,
                tripId: trip._id,
                date: formatDate(trip.departure_time),
                departureTime: formatTime(trip.departure_time),
                arrivalTime: formatTime(trip.arrival_time),
                from: trip.route_id?.departure_location || "N/A",
                to: trip.route_id?.arrival_location || "N/A",
                distance: trip.route_id?.distance || "N/A",
                vehicle: trip.bus_id?.bus_type_id?.name || "N/A",
                vehicleType: trip.bus_id?.bus_type_id?.name,
                licensePlate: trip.bus_id?.license_plate || "N/A",
                totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
                bookedSeats: trip.drivers.length, // Simplified
                route: trip.route_id,
                bus: trip.bus_id,
                // Driver shift info
                shiftStart: shift.shift_start,
                shiftEnd: shift.shift_end,
                shiftStartTime: formatDateTime(shift.shift_start),
                shiftEndTime: formatDateTime(shift.shift_end),
                actualShiftStart: shift.actual_shift_start,
                actualShiftEnd: shift.actual_shift_end,
                actualShiftStartTime: shift.actual_shift_start
                    ? formatDateTime(shift.actual_shift_start)
                    : null,
                actualShiftEndTime: shift.actual_shift_end
                    ? formatDateTime(shift.actual_shift_end)
                    : null,
                shiftStatus: shift.status, // PENDING, RUNNING, DONE
                tripStatus: trip.status, // SCHEDULED, RUNNING, FINISHED, CANCELLED
                duration: formatDuration(shift.shift_start, shift.shift_end),
                createdAt: trip.created_at,
                // Formatted for display
                displayTime: `${formatTime(trip.departure_time)} - ${formatTime(trip.arrival_time)}`,
                displayRoute: `${trip.route_id?.departure_location || "N/A"} → ${trip.route_id?.arrival_location || "N/A"}`,
            }));
        });

        // Sort by shift_start (newest first) - already done in query
        // shiftsData.sort((a, b) => new Date(b.shiftStart) - new Date(a.shiftStart));

        // Apply pagination on flattened data
        const paginatedData = shiftsData.slice(skip, skip + parseInt(limit));

        res.status(200).json({
            success: true,
            data: paginatedData,
            total: shiftsData.length,
            totalPages: Math.ceil(shiftsData.length / parseInt(limit)),
            currentPage: parseInt(page),
        });
    } catch (error) {
        console.error("Error in getDriverShifts:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch driver shifts",
            error: error.message,
        });
    }
}
exports.getDriverStats = async (req, res) => {
    console.log("🚀 getDriverStats called");

    try {
        // ✅ Get driver ID from middleware
        const driverId = res.locals.user?.id;
        console.log("1️⃣ driverId:", driverId);

        if (!driverId) {
            console.log("❌ No driver ID!");
            return res.status(401).json({
                success: false,
                message: "Driver ID not found",
            });
        }

        // ✅ Build filter - get all shifts for this driver (no pagination)
        const filter = {
            "drivers.driver_id": driverId,
            status: { $ne: "CANCELLED" },
        };
        console.log("2️⃣ Filter:", filter);

        // ✅ Query all trips (no pagination for stats)
        const trips = await trip.find(filter)
            .populate({
                path: "route_id",
                select: "departure_location arrival_location distance",
            })
            .populate({
                path: "bus_id",
                select: "license_plate bus_type_id",
                populate: {
                    path: "bus_type_id",
                    select: "name seats_count",
                },
            })
            .populate({
                path: "drivers.driver_id",
                select: "name phone",
            });

        console.log("3️⃣ Total trips found:", trips.length);

        // ✅ Calculate stats from trips
        let stats = {
            totalShifts: 0,
            pendingShifts: 0,
            runningShifts: 0,
            completedShifts: 0,
            totalHours: 0,
            totalDistance: 0,
        };

        trips.forEach((trip) => {
            // Find all shifts for this driver in this trip
            const driverShifts = trip.drivers.filter(
                (d) => d.driver_id._id.toString() === driverId
            );

            driverShifts.forEach((shift) => {
                // ✅ Count total shifts
                stats.totalShifts++;

                // ✅ Count by status
                if (shift.status === "PENDING") {
                    stats.pendingShifts++;
                } else if (shift.status === "RUNNING") {
                    stats.runningShifts++;
                } else if (shift.status === "DONE") {
                    stats.completedShifts++;
                }

                // ✅ Calculate total hours
                if (shift.shift_start && shift.shift_end) {
                    const start = new Date(shift.shift_start).getTime();
                    const end = new Date(shift.shift_end).getTime();
                    const hoursForThisShift = (end - start) / (1000 * 60 * 60);
                    stats.totalHours += hoursForThisShift;

                    console.log(
                        `  Shift: ${shift.status}, Hours: ${hoursForThisShift.toFixed(2)}`
                    );
                }

                // ✅ Calculate total distance
                if (trip.route_id?.distance) {
                    const distance = parseFloat(trip.route_id.distance);
                    if (!isNaN(distance)) {
                        stats.totalDistance += distance;
                    }
                }
            });
        });

        // ✅ Round total hours to 2 decimal places
        stats.totalHours = Math.round(stats.totalHours * 100) / 100;
        stats.totalDistance = Math.round(stats.totalDistance * 100) / 100;

        console.log("4️⃣ Stats calculated:", stats);

        // ✅ Return response
        res.status(200).json({
            success: true,
            data: stats,
        });

        console.log("✅ Response sent successfully");
    } catch (error) {
        console.error("❌ Error in getDriverStats:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch driver stats",
            error: error.message,
        });
    }
};