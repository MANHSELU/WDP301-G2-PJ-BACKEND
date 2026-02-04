const mongoose = require("mongoose");
// chuyến đi  nhưng với nhiều xe và giá khác nhau ( chung 1 tuyến đường )   dn-hcm :  1 thường 
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
        // người lai
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
        // thời gian khởi hành
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
