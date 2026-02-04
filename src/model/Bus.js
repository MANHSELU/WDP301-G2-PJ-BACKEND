const mongoose = require("mongoose");

/**
 * Cột ghế: LEFT / RIGHT / MIDDLE
 */
const ColumnSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            enum: ["LEFT", "MIDDLE", "RIGHT"],
            required: true,
        },

        seats_per_row: {
            type: Number,
            required: true,
            min: 1,
        },
    },
    { _id: false }
);

/**
 * Layout ghế của xe
 */
const SeatLayoutSchema = new mongoose.Schema(
    {
        template_name: {
            type: String,
            required: true, // VD: Giường nằm 40 chỗ
        },

        floors: {
            type: Number,
            required: true,
            min: 1,
            max: 2,
        },

        rows: {
            type: Number,
            required: true,
            min: 1,
        },
        columns: {
            type: [ColumnSchema],
            required: true,
            validate: {
                validator: (v) => Array.isArray(v) && v.length > 0,
                message: "Xe phải có ít nhất 1 cột ghế",
            },
        },
        // hàng được biệt 
        // hàng cuối thường dính lại với nhau
        row_overrides: {
            type: [RowOverrideSchema],
            default: [],
        },
        total_seats: {
            type: Number,
            required: true,
        },
    },
    { _id: false }
);

/**
 * Xe buýt
 */
const BusSchema = new mongoose.Schema({
    license_plate: { // Biển số xe
        type: String,
        required: true,
        unique: true,
        trim: true,
    },

    bus_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BusType",
        required: true,
    },

    status: {
        type: String,
        enum: ["ACTIVE", "MAINTENANCE"],
        default: "ACTIVE",
    },

    seat_layout: {
        type: SeatLayoutSchema,
        required: true,
    },

    created_at: {
        type: Date,
        default: Date.now,
    },
});
module.exports = mongoose.model("Bus", BusSchema);