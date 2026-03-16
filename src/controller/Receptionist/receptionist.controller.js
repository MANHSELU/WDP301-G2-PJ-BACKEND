// controllers/receptionist.controller.js
const Trip = require("./../../model/Trip")
const BookingOrder = require("./../../model/BookingOrder")
const RouterStop = require("./../../model/route_stops")
module.exports.getActiveTrips = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        // Filter: RUNNING + SCHEDULED, hoặc filter theo status cụ thể
        const statusFilter = status && ["RUNNING", "SCHEDULED", "FINISHED"].includes(status)
            ? [status]
            : ["RUNNING", "SCHEDULED"];

        const filter = { status: { $in: statusFilter } };
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const trips = await Trip.find(filter)
            .sort({ departure_time: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: "route_id",
                select: "start_id stop_id distance_km estimated_duration",
                populate: [
                    { path: "start_id", select: "name province location" },
                    { path: "stop_id", select: "name province location" },
                ],
            })
            .populate({
                path: "bus_id",
                select: "license_plate bus_type_id",
                populate: { path: "bus_type_id", select: "name seats_count" },
            })
            .populate({
                path: "drivers.driver_id",
                select: "name phone avatar status",
            })
            .populate({
                path: "assistant_id",
                select: "name phone avatar status",
            });

        // Lấy orders cho từng trip
        const tripIds = trips.map((t) => t._id);
        const orders = await BookingOrder.find({
            trip_id: { $in: tripIds },
            order_status: { $nin: ["CANCELLED"] },
        }).select("trip_id seat_labels passenger_name passenger_phone payment_method payment_status order_status start_info end_info");

        // Group orders by trip_id
        const ordersByTrip = {};
        orders.forEach((o) => {
            const key = o.trip_id.toString();
            if (!ordersByTrip[key]) ordersByTrip[key] = [];
            ordersByTrip[key].push(o);
        });

        // Lấy router_stops cho từng route
        const routeIds = trips.map((t) => t.route_id?._id).filter(Boolean);
        const routerStops = await RouterStop.find({
            route_id: { $in: routeIds },
        })
            .populate("stop_id", "name province location")
            .sort({ stop_order: 1 });

        // Group router_stops by route_id
        const stopsByRoute = {};
        routerStops.forEach((s) => {
            const key = s.route_id.toString();
            if (!stopsByRoute[key]) stopsByRoute[key] = [];
            stopsByRoute[key].push(s);
        });

        const data = trips.map((t) => {
            const tripOrders = ordersByTrip[t._id.toString()] || [];
            const routeStops = stopsByRoute[t.route_id?._id?.toString()] || [];
            const bookedSeats = tripOrders.reduce((acc, o) => acc + (o.seat_labels?.length || 0), 0);
            const totalSeats = t.bus_id?.bus_type_id?.seats_count || 0;

            const departureTime = new Date(t.departure_time);
            const arrivalTime = new Date(t.arrival_time);
            const durationMs = arrivalTime - departureTime;
            const durationH = Math.floor(durationMs / (1000 * 60 * 60));
            const durationM = Math.round((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            const duration = durationM === 0 ? `${durationH}h` : `${durationH}h ${durationM}m`;

            return {
                _id: t._id,
                status: t.status,
                departure_time: t.departure_time,
                arrival_time: t.arrival_time,
                actual_departure_time: t.actual_departure_time,
                actual_arrival_time: t.actual_arrival_time,
                duration,

                // Tuyến đường
                route: {
                    _id: t.route_id?._id,
                    from: {
                        name: t.route_id?.start_id?.name || "N/A",
                        province: t.route_id?.start_id?.province || "",
                    },
                    to: {
                        name: t.route_id?.stop_id?.name || "N/A",
                        province: t.route_id?.stop_id?.province || "",
                    },
                    distance_km: t.route_id?.distance_km || 0,
                    stops: routeStops.map((s) => ({
                        _id: s._id,
                        stop_order: s.stop_order,
                        is_pickup: s.is_pickup,
                        name: s.stop_id?.name || "N/A",
                        province: s.stop_id?.province || "",
                    })),
                },

                // Xe
                bus: {
                    license_plate: t.bus_id?.license_plate || "N/A",
                    type: t.bus_id?.bus_type_id?.name || "N/A",
                    total_seats: totalSeats,
                    booked_seats: bookedSeats,
                    available_seats: totalSeats - bookedSeats,
                },

                // Tài xế & phụ xe
                drivers: t.drivers.map((d) => ({
                    _id: d.driver_id?._id,
                    name: d.driver_id?.name || "N/A",
                    phone: d.driver_id?.phone || "N/A",
                    avatar: d.driver_id?.avatar || null,
                    shift_start: d.shift_start,
                    shift_end: d.shift_end,
                    actual_shift_start: d.actual_shift_start,
                    actual_shift_end: d.actual_shift_end,
                    status: d.status,
                })),
                assistant: t.assistant_id
                    ? {
                        _id: t.assistant_id._id,
                        name: t.assistant_id.name || "N/A",
                        phone: t.assistant_id.phone || "N/A",
                        avatar: t.assistant_id.avatar || null,
                    }
                    : null,

                // Danh sách khách
                orders: tripOrders.map((o) => ({
                    _id: o._id,
                    passenger_name: o.passenger_name,
                    passenger_phone: o.passenger_phone,
                    seat_labels: o.seat_labels,
                    payment_method: o.payment_method,
                    payment_status: o.payment_status,
                    order_status: o.order_status,
                    pickup: o.start_info?.specific_location || o.start_info?.city || "N/A",
                    dropoff: o.end_info?.specific_location || o.end_info?.city || "N/A",
                })),
            };
        });

        return res.status(200).json({
            success: true,
            data,
            total,
            page: parseInt(page),
            totalPages,
        });
    } catch (error) {
        console.error("Error in getActiveTrips:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message,
        });
    }
};
module.exports.createBooking = async (req, res) => {
    try {
        const receptionist_id = res.locals.user.id; // từ middleware auth

        const {
            trip_id,
            seat_labels,
            ticket_price,
            passenger_name,
            passenger_phone,
            payment_method,
            pickup_stop_id,    // RouteStop._id
            dropoff_stop_id,   // RouteStop._id
            pickup_location_name,
            dropoff_location_name,
            pickup_city,
            dropoff_city,
        } = req.body;
        console.log("trip id là : ", trip_id)
        // ── Validate ──────────────────────────────────────────────────────────
        if (!trip_id || !seat_labels?.length || !passenger_name || !passenger_phone) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc",
            });
        }

        if (!pickup_stop_id || !dropoff_stop_id) {
            return res.status(400).json({
                success: false,
                message: "Thiếu điểm đón hoặc điểm trả",
            });
        }

        // ── Kiểm tra trip tồn tại ─────────────────────────────────────────────
        const trip = await Trip.findById(trip_id).lean();
        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy chuyến xe",
            });
        }

        if (trip.status === "CANCELLED") {
            return res.status(400).json({
                success: false,
                message: "Chuyến xe đã bị huỷ",
            });
        }

        // ── Kiểm tra ghế có bị trùng không ───────────────────────────────────
        // Lấy tất cả booking chưa huỷ của trip này
        const existingBookings = await BookingOrder.find({
            trip_id,
            order_status: { $nin: ["CANCELLED"] },
        }).select("seat_labels").lean();

        const allBookedSeats = existingBookings.flatMap(b => b.seat_labels ?? []);
        const conflictSeats = seat_labels.filter(label => allBookedSeats.includes(label));

        if (conflictSeats.length > 0) {
            return res.status(409).json({
                success: false,
                message: `Ghế ${conflictSeats.join(", ")} đã được đặt, vui lòng chọn ghế khác`,
            });
        }

        // ── Tính tổng tiền ────────────────────────────────────────────────────
        const total_price = (ticket_price ?? 0) * seat_labels.length;

        // ── Tạo booking ───────────────────────────────────────────────────────
        const booking = await BookingOrder.create({
            user_id: receptionist_id,
            trip_id,
            start_id: pickup_stop_id,   // RouteStop._id
            end_id: dropoff_stop_id,    // RouteStop._id
            seat_labels,
            passenger_name: passenger_name.trim(),
            passenger_phone: passenger_phone.trim(),
            total_price,
            order_status: "PAID",       // lễ tân đặt → thanh toán luôn
            start_info: {
                city: pickup_city || "",
                specific_location: pickup_location_name || "",
            },
            end_info: {
                city: dropoff_city || "",
                specific_location: dropoff_location_name || "",
            },
        });

        return res.status(201).json({
            success: true,
            message: "Đặt vé thành công",
            data: booking,
        });

    } catch (err) {
        console.error("[createBooking] Error:", err);
        return res.status(500).json({
            success: false,
            message: "Lỗi server. Vui lòng thử lại sau.",
        });
    }
};