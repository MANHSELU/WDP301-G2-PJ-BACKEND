// đây chính là các điểm dường  cụ thể trên 1 chuyến    
const mongoose = require("mongoose");

const RouteStopSchema = new mongoose.Schema(
    {
        route_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Route",
            required: true,
        },

        stop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Stop",
            required: true,
        },

        stop_order: {
            type: Number,
            required: true, // thứ tự dừng
            min: 1,
        },

        estimated_time: {
            type: String,
            required: false, // VD: "08:30"
        },

        is_pickup: {
            type: Boolean,
            default: true, // có cho lên xe không
        },

        is_dropoff: {
            type: Boolean,
            default: true, // có cho xuống xe không
        },
    },
    {
        timestamps: false,
    }
);

// 1 tuyến không được trùng thứ tự dừng
RouteStopSchema.index({ route_id: 1, stop_order: 1 }, { unique: true });

module.exports = mongoose.model("RouteStop", RouteStopSchema);

