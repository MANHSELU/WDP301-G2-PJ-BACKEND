// đây là bảng đặt vé của từng người ( đặt vé)
const mongoose = require("mongoose");

const BookingOrderSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        trip_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true,
        },
        // điểm bắt đầu ( dn )
        start_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },
        // điểm xuống(hcm)
        end_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },
        // trạng thái
        order_status: {
            type: String,
            enum: ["CREATED", "PAID", "CANCELLED"],
            default: "CREATED",
        },
        // lưu snapshot điểm đón
        start_info: {
            city: String,           // Hà Nội
            specific_location: String // bến xe hà nooij hay ....
        },

        // lưu snapshot điểm trả
        end_info: {
            city: String,           // Hà Nam
            specific_location: String // Điểm phía Bắc - Bến xe Hà Nam
        },
        seat_labels: {
            type: [String],
            default: [],
        },
        passenger_name: {
            type: String,
            required: true,
        },
        passenger_phone: {
            type: String,
            required: true,
        },
        passenger_email: {
            type: String,
            default: null,
        },
        total_price: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

module.exports = mongoose.model("BookingOrder", BookingOrderSchema);
