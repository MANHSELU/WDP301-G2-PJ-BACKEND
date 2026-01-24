// bảng này là vị trí lên xuống của từng node do mình fix cứng
const mongoose = require("mongoose");

const StopLocationSchema = new mongoose.Schema(
    {
        route_stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },

        location_name: {
            type: String,
            required: true, // Ngã 3 Hòa Cầm, Bến xe...
            trim: true,
        },

        address: {
            type: String,
            required: false,
        },

        latitude: {
            type: Number,
            required: false,
        },

        longitude: {
            type: Number,
            required: false,
        },

        location_type: {
            type: String,
            enum: ["PICKUP", "DROPOFF", "BOTH"],
            default: "BOTH",
        },

        is_active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

module.exports = mongoose.model("StopLocation", StopLocationSchema);
