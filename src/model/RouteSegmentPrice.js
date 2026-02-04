// giá tiền của từng chặng 1-2-, 1-3 bao gồm chặng lớn và toàn toàn bộ chặng con của nó
const mongoose = require("mongoose");

const RouteSegmentPriceSchema = new mongoose.Schema(
    {
        route_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Route",
            required: true,
        },

        start_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },

        end_id: {
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
