const mongoose = require("mongoose");
// bảng gửi hàng 
const ParcelSchema = new mongoose.Schema(
    {
        // tự động sinh ra ( viết thuật toán ) hoặc id
        code: {
            type: String,
            required: true,
            unique: true,
            trim: true, // mã vận đơn
        },

        trip_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trip",
            required: true, // hàng đi theo chuyến nào
            index: true,
        },

        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // có thể gửi lẻ không cần tài khoản
        },

        receiver_name: {
            type: String,
            required: true,
            trim: true,
        },

        receiver_phone: {
            type: String,
            required: true,
            trim: true,
        },

        // điểm khách hàng gửi hàng
        start_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },
        // điểm trả hàng
        end_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "RouteStop",
            required: true,
        },

        // điểm khách hàng gửi hàng chi tiết ( chọn )
        pickup_location_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StopLocation",
            required: false,
        },
        // điểm trả hàng chi tiết
        dropoff_location_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StopLocation",
            required: false,
        },

        weight_kg: {
            type: Number,
            min: 0,
            required: true,
        },

        parcel_type: {
            type: String,
            trim: true, // giấy tờ, dễ vỡ, thực phẩm...
        },

        total_price: {
            type: Number,
            required: true,
            min: 0,
        },
        approval_status: {
            type: String,
            enum: ["PENDING", "APPROVED", "REJECTED"],
            default: "PENDING",
        },

        approved_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // admin / nhân viên bến
        },
        status: {
            type: String,
            enum: [
                "RECEIVED",   // đã nhận hàng
                "ON_BUS",     // đã lên xe
                "IN_TRANSIT", // đang di chuyển
                "DELIVERED",  // đã giao
                "CANCELLED",
            ],
            default: "RECEIVED",
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

/**
 * Index thường dùng
 */
ParcelSchema.index({ trip_id: 1 });
ParcelSchema.index({ receiver_phone: 1 });
ParcelSchema.index({ status: 1 });

module.exports = mongoose.model("Parcel", ParcelSchema);
