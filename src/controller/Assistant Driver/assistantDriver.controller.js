const Trip = require("../../model/Trip"); // đổi đúng path model của bạn
const BookingOrder = require("./../../model/BookingOrder")
const TripBooking = require("../../model/Booking_Order_detail");
const Parcel = require("../../model/Parcel");
const upload = require("../../util/upload");
const cloudinary = require("../../config/cloudinaryConfig");
// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date) {
    if (!date) return null;
    return new Date(date).toISOString().split("T")[0];
}

function formatTime(date) {
    if (!date) return null;
    return new Date(date).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatDateTime(date) {
    if (!date) return null;
    return new Date(date).toLocaleString("vi-VN", { hour12: false });
}

function formatDuration(start, end) {
    if (!start || !end) return "N/A";
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

// ─── 1. Lấy danh sách ca làm phụ xe ──────────────────────────────────────────
// GET /api/assistant/check/getAllTripsForAssistants?page=1&limit=10&status=PENDING
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getAllTripsForAssistants = async (req, res) => {
    console.log("Chạy vào lấy slot ca phụ xe");
    try {
        const assistantId = res.locals.user?.id;
        const { status, limit = 10, page = 1 } = req.query;

        if (!assistantId) {
            return res.status(400).json({ success: false, message: "Assistant ID is required" });
        }

        // ✅ Trip có field assistant_id trực tiếp (không phải trong mảng drivers)
        let filter = {
            assistant_id: assistantId,
            status: { $ne: "CANCELLED" },
        };

        // Filter theo trip status nếu có
        if (status && ["SCHEDULED", "RUNNING", "FINISHED", "CANCELLED"].includes(status)) {
            filter.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const trips = await Trip.find(filter)
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
            .populate({
                path: "assistant_id",
                select: "name phone",
            })
            .sort({ departure_time: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Format response
        const data = trips.map((trip) => ({
            id: trip._id,
            tripId: trip._id,
            date: formatDate(trip.departure_time),
            departureTime: formatTime(trip.departure_time),
            arrivalTime: formatTime(trip.arrival_time),
            from: trip.route_id?.departure_location || "N/A",
            to: trip.route_id?.arrival_location || "N/A",
            distance: trip.route_id?.distance || "N/A",
            vehicle: trip.bus_id?.bus_type_id?.name || "N/A",
            vehicleType: trip.bus_id?.bus_type_id?.name || "N/A",
            licensePlate: trip.bus_id?.license_plate || "N/A",
            totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
            // Lái xe chính của chuyến này
            mainDrivers: trip.drivers?.map((d) => ({
                name: d.driver_id?.name || "N/A",
                phone: d.driver_id?.phone || "N/A",
                shiftStatus: d.status,
            })) || [],
            tripStatus: trip.status,
            duration: formatDuration(trip.departure_time, trip.arrival_time),
            createdAt: trip.created_at,
            displayTime: `${formatTime(trip.departure_time)} - ${formatTime(trip.arrival_time)}`,
            displayRoute: `${trip.route_id?.departure_location || "N/A"} → ${trip.route_id?.arrival_location || "N/A"}`,
        }));

        return res.status(200).json({
            success: true,
            data,
            total,
            totalPages,
            currentPage: parseInt(page),
        });
    } catch (error) {
        console.error("Error in getAllTripsForAssistants:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assistant shifts", error: error.message });
    }
};

// ─── 2. Thống kê ca làm phụ xe ────────────────────────────────────────────────
// GET /api/assistant/check/shifts/stats
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getAssistantStats = async (req, res) => {
    console.log("getAssistantStats called");
    try {
        const assistantId = res.locals.user?.id;
        if (!assistantId) {
            return res.status(401).json({ success: false, message: "Assistant ID not found" });
        }

        const filter = { assistant_id: assistantId, status: { $ne: "CANCELLED" } };

        const trips = await Trip.find(filter)
            .populate({ path: "route_id", select: "distance" })
            .lean();

        let stats = {
            totalShifts: trips.length,
            scheduledShifts: 0,
            runningShifts: 0,
            completedShifts: 0,
            totalHours: 0,
            totalDistance: 0,
        };

        trips.forEach((trip) => {
            if (trip.status === "SCHEDULED") stats.scheduledShifts++;
            if (trip.status === "RUNNING") stats.runningShifts++;
            if (trip.status === "FINISHED") stats.completedShifts++;

            if (trip.departure_time && trip.arrival_time) {
                const h = (new Date(trip.arrival_time) - new Date(trip.departure_time)) / (1000 * 60 * 60);
                if (h > 0) stats.totalHours += h;
            }

            const d = parseFloat(trip.route_id?.distance);
            if (!isNaN(d)) stats.totalDistance += d;
        });

        stats.totalHours = Math.round(stats.totalHours * 100) / 100;
        stats.totalDistance = Math.round(stats.totalDistance * 100) / 100;

        return res.status(200).json({ success: true, data: stats });
    } catch (error) {
        console.error("Error in getAssistantStats:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch assistant stats", error: error.message });
    }
};
module.exports.getAssistantTrips = async (req, res) => {
    try {
        const assistantId = res.locals.user?.id;
        if (!assistantId) {
            return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });
        }

        const { page = 1, limit = 10, status } = req.query;

        const filter = { assistant_id: assistantId };
        if (status && ["SCHEDULED", "RUNNING", "FINISHED", "CANCELLED"].includes(status)) {
            filter.status = status;
        } else {
            filter.status = { $ne: "CANCELLED" };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Trip.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        const trips = await Trip.find(filter)
            .populate({
                path: "route_id",           // Route
                select: "start_id stop_id distance_km scheduled_duration estimated_duration",
                populate: [
                    { path: "start_id", select: "name province" },  // Stop
                    { path: "stop_id", select: "name province" },  // Stop
                ],
            })
            .populate({
                path: "bus_id",             // Bus
                select: "license_plate bus_type_id",
                populate: { path: "bus_type_id", select: "name seats_count" },
            })
            .populate({
                path: "drivers.driver_id",  // User
                select: "name phone",
            })
            .sort({ departure_time: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const data = trips.map((trip) => ({
            _id: trip._id,
            departureTime: formatTime(trip.departure_time),
            arrivalTime: formatTime(trip.arrival_time),
            date: formatDate(trip.departure_time),
            // Route → Stop
            departureLocation: trip.route_id?.start_id?.name || "N/A",
            departurePovince: trip.route_id?.start_id?.province || "N/A",
            arrivalLocation: trip.route_id?.stop_id?.name || "N/A",
            arrivalProvince: trip.route_id?.stop_id?.province || "N/A",
            // distance & duration: ưu tiên trip → route
            distance: trip.scheduled_distance || trip.route_id?.distance_km || null,
            duration: formatDuration(trip.scheduled_duration || trip.route_id?.estimated_duration),
            // Bus
            vehicleType: trip.bus_id?.bus_type_id?.name || "N/A",
            licensePlate: trip.bus_id?.license_plate || "N/A",
            totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
            // Trip status
            status: trip.status,
            // Drivers (mảng con trong Trip)
            drivers: (trip.drivers || []).map((d) => ({
                name: d.driver_id?.name || "N/A",
                phone: d.driver_id?.phone || "",
                status: d.status,
                shiftStart: d.shift_start,
                shiftEnd: d.shift_end,
            })),
        }));

        return res.status(200).json({ success: true, data, total, totalPages, currentPage: parseInt(page) });
    } catch (err) {
        console.error("[getAssistantTrips]", err);
        return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
};

module.exports.getAssistantTripDetail = async (req, res) => {
    try {
        const assistantId = res.locals.user?.id;
        const { tripId } = req.params;

        if (!assistantId)
            return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });

        const trip = await Trip.findOne({ _id: tripId, assistant_id: assistantId })
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
            .populate({ path: "drivers.driver_id", select: "name phone" })
            .lean();

        if (!trip)
            return res.status(404).json({ success: false, message: "Không tìm thấy chuyến xe" });

        const bookings = await BookingOrder.find({
            trip_id: tripId,
            order_status: { $ne: "CANCELLED" },
        }).lean();

        const passengers = bookings.map((b) => ({
            _id: b._id,
            passenger_name: b.passenger_name || "N/A",
            passenger_phone: b.passenger_phone || "N/A",
            passenger_email: b.passenger_email || null,
            seat_labels: b.seat_labels || [],
            total_price: b.total_price || 0,
            order_status: b.order_status,
            is_boarded: b.is_boarded ?? false,
            boarded_at: b.boarded_at ?? null,
            is_alighted: b.is_alighted ?? false,
            alighted_at: b.alighted_at ?? null,
            start_info: b.start_info ?? { city: "", specific_location: "" },
            end_info: b.end_info ?? { city: "", specific_location: "" },
            created_at: b.created_at,
        }));

        const totalSeatsBooked = passengers.reduce((s, p) => s + (p.seat_labels?.length || 0), 0);

        const tripDetail = {
            _id: trip._id,
            departureTime: formatTime(trip.departure_time),
            arrivalTime: formatTime(trip.arrival_time),
            date: formatDate(trip.departure_time),
            departureLocation: trip.route_id?.start_id?.name || "N/A",
            departureProvince: trip.route_id?.start_id?.province || "N/A",
            arrivalLocation: trip.route_id?.stop_id?.name || "N/A",
            arrivalProvince: trip.route_id?.stop_id?.province || "N/A",
            distance: trip.scheduled_distance || trip.route_id?.distance_km || null,
            duration: formatDuration(trip.scheduled_duration || trip.route_id?.estimated_duration),
            vehicleType: trip.bus_id?.bus_type_id?.name || "N/A",
            licensePlate: trip.bus_id?.license_plate || "N/A",
            totalSeats: trip.bus_id?.bus_type_id?.seats_count || 0,
            totalSeatsBooked,
            totalPassengers: passengers.length,
            status: trip.status,
            drivers: (trip.drivers || []).map((d) => ({
                name: d.driver_id?.name || "N/A",
                phone: d.driver_id?.phone || "",
                status: d.status,
                shiftStart: d.shift_start,
                shiftEnd: d.shift_end,
                actualShiftStart: d.actual_shift_start,
                actualShiftEnd: d.actual_shift_end,
            })),
        };

        return res.status(200).json({ success: true, data: { trip: tripDetail, passengers } });
    } catch (err) {
        console.error("[getAssistantTripDetail]", err);
        return res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
    }
};
module.exports.updateBoarded = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { is_boarded, is_alighted } = req.body;

        /* ── Validate ── */
        if (typeof is_boarded !== "boolean")
            return res.status(400).json({ success: false, message: "is_boarded phải là boolean" });

        const order = await BookingOrder.findById(orderId)
            .select("_id is_boarded is_alighted order_status");

        if (!order)
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });

        const update = {};

        /* ══════════════════════════════════════════════════════
           CASE 1: Xuống xe
           FE gửi: { is_boarded: true, is_alighted: true }
           Điều kiện: phải đang is_boarded = true
        ══════════════════════════════════════════════════════ */
        if (is_boarded === true && typeof is_alighted === "boolean") {
            if (!order.is_boarded) {
                return res.status(400).json({
                    success: false,
                    message: "Hành khách chưa lên xe, không thể cập nhật xuống xe",
                });
            }
            update.is_alighted = is_alighted;
            update.alighted_at = is_alighted ? new Date() : null;
        }

        /* ══════════════════════════════════════════════════════
           CASE 2: Lên xe
           FE gửi: { is_boarded: true }
        ══════════════════════════════════════════════════════ */
        else if (is_boarded === true) {
            update.is_boarded = true;
            update.boarded_at = new Date();
            // Reset xuống xe nếu trước đó đã xuống (hoàn tác)
            update.is_alighted = false;
            update.alighted_at = null;
        }

        /* ══════════════════════════════════════════════════════
           CASE 3: Vắng mặt / Hoàn tác lên xe
           FE gửi: { is_boarded: false }
        ══════════════════════════════════════════════════════ */
        else if (is_boarded === false) {
            update.is_boarded = false;
            update.boarded_at = null;
            update.is_alighted = false;
            update.alighted_at = null;
        }

        const updated = await BookingOrder.findByIdAndUpdate(orderId, update, { new: true })
            .select("_id is_boarded boarded_at is_alighted alighted_at order_status");

        console.log(`[updateBoarded] Order ${orderId}:`, update);
        return res.status(200).json({ success: true, data: updated });

    } catch (err) {
        console.error("[updateBoarded]", err);
        return res.status(500).json({ success: false, message: "Lỗi server" });
    }
};

// ─── UC1: Confirm Luggage (Xác nhận hành lý đã lên xe) ──────────────────────────
// PATCH /api/assistant/check/bookings/:bookingId/confirm-luggage
// Body: { trip_id: string, note?: string }
// Files: images (multiple)
// ─────────────────────────────────────────────────────────────────────────────
module.exports.confirmLuggage = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { trip_id, note = '' } = req.body;
        const assistantId = res.locals.user?.id;
        const files = req.files || [];

        if (!bookingId || !trip_id) {
            return res.status(400).json({ success: false, message: "Booking ID and Trip ID are required" });
        }

        // Validate booking exists and belongs to trip
        const booking = await TripBooking.findOne({ _id: bookingId, trip_id });
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found for this trip" });
        }

        // Validate trip is RUNNING and assistant is assigned
        const trip = await Trip.findById(trip_id);
        if (!trip || trip.status !== 'RUNNING' || trip.assistant_id.toString() !== assistantId) {
            return res.status(403).json({ success: false, message: "Unauthorized or trip not running" });
        }

        // Upload images to Cloudinary
        let imageUrls = [];
        if (files.length > 0) {
            const uploadPromises = files.map(file => {
                return new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        { folder: 'luggage', resource_type: 'image' },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result.secure_url);
                        }
                    );
                    stream.end(file.buffer);
                });
            });
            imageUrls = await Promise.all(uploadPromises);
        }

        // Update booking and log
        const logEntry = {
            action: 'CONFIRMED',
            confirmed_by: assistantId,
            note,
            created_at: new Date()
        };

        const updateData = {
            luggage_confirmed: true,
            luggage_confirmed_at: new Date(),
            luggage_confirmed_by: assistantId,
            $push: { luggage_logs: logEntry }
        };

        if (imageUrls.length > 0) {
            updateData.$push = updateData.$push || {};
            updateData.$push.luggage_images = { $each: imageUrls };
        }

        const updatedBooking = await TripBooking.findByIdAndUpdate(bookingId, updateData, { new: true });

        return res.status(200).json({
            success: true,
            message: "Luggage confirmed successfully",
            data: updatedBooking
        });
    } catch (error) {
        console.error("Error in confirmLuggage:", error);
        return res.status(500).json({ success: false, message: "Failed to confirm luggage", error: error.message });
    }
};

// ─── UC2: Update Parcel Status ────────────────────────────────────────────────
// PATCH /api/assistant/check/parcels/:parcelId/update-status
// Body: { new_status: 'ON_BUS'|'IN_TRANSIT'|'DELIVERED', note?: string }
// ─────────────────────────────────────────────────────────────────────────────
module.exports.updateParcelStatus = async (req, res) => {
    try {
        const { parcelId } = req.params;
        const { new_status, note = '' } = req.body;
        const assistantId = res.locals.user?.id;

        const validStatuses = ['ON_BUS', 'IN_TRANSIT', 'DELIVERED'];
        if (!validStatuses.includes(new_status)) {
            return res.status(400).json({ success: false, message: "Invalid status. Must be ON_BUS, IN_TRANSIT, or DELIVERED" });
        }

        // Find parcel
        const parcel = await Parcel.findById(parcelId);
        if (!parcel) {
            return res.status(404).json({ success: false, message: "Parcel not found" });
        }

        // Validate trip is RUNNING or FINISHED and assistant is assigned
        const trip = await Trip.findById(parcel.trip_id);
        if (!trip || !['RUNNING', 'FINISHED'].includes(trip.status) || trip.assistant_id.toString() !== assistantId) {
            return res.status(403).json({ success: false, message: "Unauthorized or invalid trip status" });
        }

        // Prevent backward status changes
        const statusOrder = { 'RECEIVED': 1, 'ON_BUS': 2, 'IN_TRANSIT': 3, 'DELIVERED': 4 };
        if (statusOrder[new_status] <= statusOrder[parcel.status]) {
            return res.status(400).json({ success: false, message: "Cannot revert to previous status" });
        }

        // Update parcel and log status change
        const logEntry = {
            status: new_status,
            note,
            updated_by: assistantId,
            created_at: new Date()
        };

        const updatedParcel = await Parcel.findByIdAndUpdate(
            parcelId,
            {
                status: new_status,
                $push: { status_logs: logEntry }
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: "Parcel status updated successfully",
            data: updatedParcel
        });
    } catch (error) {
        console.error("Error in updateParcelStatus:", error);
        return res.status(500).json({ success: false, message: "Failed to update parcel status", error: error.message });
    }
};

// ─── Get Trip Detail with Parcels ─────────────────────────────────────────────
// GET /api/assistant/check/trips/:tripId
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getAssistantTripDetail = async (req, res) => {
    try {
        const { tripId } = req.params;
        const assistantId = res.locals.user?.id;

        if (!assistantId) {
            return res.status(401).json({ success: false, message: "Không xác định được tài khoản" });
        }

        // Validate trip belongs to assistant
        const trip = await Trip.findOne({ _id: tripId, assistant_id: assistantId });
        if (!trip) {
            return res.status(403).json({ success: false, message: "Không có quyền truy cập chuyến này" });
        }

        // Get passengers
        const passengers = await TripBooking.find({ trip_id: tripId })
            .populate('order_id', 'order_status')
            .sort({ created_at: -1 });

        // Get parcels
        const parcels = await Parcel.find({ trip_id: tripId })
            .populate('sender_id', 'name phone')
            .sort({ created_at: -1 });

        return res.status(200).json({
            success: true,
            data: {
                trip,
                passengers,
                parcels
            }
        });
    } catch (error) {
        console.error("Error in getAssistantTripDetail:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch trip detail", error: error.message });
    }
};