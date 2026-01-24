const mongoose = require("mongoose");

const BookingPaymentSchema = new mongoose.Schema(
    {
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BookingOrder",
            required: true,
            index: true,
        },

        payment_method: {
            type: String,
            enum: ["ONLINE", "CASH_ON_BOARD"],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        payment_status: {
            type: String,
            enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
            default: "PENDING",
        },

        collected_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // chỉ có khi CASH_ON_BOARD
        },

        paid_at: {
            type: Date,
            required: false,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

/**
 * 1 đơn đặt vé chỉ có 1 payment chính
 */
BookingPaymentSchema.index(
    { order_id: 1 },
    { unique: true }
);

module.exports = mongoose.model("BookingPayment", BookingPaymentSchema);
