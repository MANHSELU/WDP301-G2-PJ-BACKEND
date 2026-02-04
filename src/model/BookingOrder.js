// đây là bảng đặt vé của từng người 
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

        pickup_stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },

        dropoff_stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },

        order_status: {
            type: String,
            enum: ["CREATED", "PAID", "CANCELLED"],
            default: "CREATED",
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
