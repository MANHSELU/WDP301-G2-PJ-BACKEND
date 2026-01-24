const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema(
    {
        // seat_template: {
        //     type: mongoose.Schema.Types.ObjectId,
        //     ref: "SeatTemplate",
        //     required: true,
        // },

        seat_code: {
            type: String,
            required: true,
            trim: true, // A1, B2, P01
        },

        seat_type: {
            type: String,
            enum: ["SEAT", "BED", "ROOM"],
            required: true,
        },

        floor: {
            type: Number,
            required: true, // tầng 1 / tầng 2
        },

        position: {
            type: String,
            enum: ["LEFT", "RIGHT", "MIDDLE"],
            required: true,
        },

        row_number: {
            type: Number,
            required: true,
        },

        is_active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: false, // bảng này không cần created_at
    }
);

module.exports = mongoose.model("Seat", seatSchema);
