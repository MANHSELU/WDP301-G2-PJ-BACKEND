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
        // người lái
        drivers: [
            {
                driver_id: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                // thời điểm bắt đầu ca lái 
                shift_start: {
                    type: Date,
                    required: true,
                },
                // thời điểm kết thúc ca lái 
                shift_end: {
                    type: Date,
                    required: true,
                },
            }
        ],


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
