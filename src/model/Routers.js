// các tuyến đường
const mongoose = require("mongoose");

const RouteSchema = new mongoose.Schema(
    {
        start_stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stop",
            required: true,
        },

        end_stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stop",
            required: true,
        },

        distance_km: {
            type: Number,
            required: false,
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

module.exports = mongoose.model("Route", RouteSchema);

