const mongoose = require("mongoose");

const TripSchema = new mongoose.Schema(
    {
        route_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Route",
            required: true,
        },

        bus_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bus",
            required: true,
        },

        driver_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        assistant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        // Thời gian khởi hành
        departure_time: {
            type: Date,
            required: true,
        },

        status: {
            type: String,
            enum: ["SCHEDULED", "RUNNING", "FINISHED", "CANCELLED"],
            default: "SCHEDULED",
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

module.exports = mongoose.model("Trip", TripSchema);
