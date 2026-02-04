// đây là bảng 
const mongoose = require("mongoose");

const StopSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true, // Hà Nội, Đà Nẵng, Bến xe Mỹ Đình...
            trim: true,
        },

        type: {
            type: String,
            enum: ["PROVINCE", "CITY", "STATION"],
            required: true,
        },

        latitude: {
            type: Number,
            required: false,
        },

        longitude: {
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

module.exports = mongoose.model("Stop", StopSchema);

