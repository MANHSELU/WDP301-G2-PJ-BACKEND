// giá tiền của từng chặng
const mongoose = require("mongoose");

const RouteSegmentPriceSchema = new mongoose.Schema(
    {
        route_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Route",
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

        bus_type_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BusType",
            required: true,
        },

        base_price: {
            type: Number,
            required: true,
            min: 0,
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

// ❗ Không cho trùng giá cùng 1 đoạn + 1 loại xe
RouteSegmentPriceSchema.index(
    {
        route_id: 1,
        pickup_stop_id: 1,
        dropoff_stop_id: 1,
        bus_type_id: 1,
    },
    { unique: true }
);

module.exports = mongoose.model(
    "RouteSegmentPrice",
    RouteSegmentPriceSchema
);
