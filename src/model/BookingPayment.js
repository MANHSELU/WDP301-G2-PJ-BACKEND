const mongoose = require("mongoose");

const BookingPaymentSchema = new mongoose.Schema(
    {
        order_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BookingOrder",
            required: true,
        },

        payment_method: {
            type: String,
            enum: ["ONLINE", "CASH_ON_BOARD"],
            required: true,
        },
        payment_gateway: {
            type: String,
            enum: ["BANK", "NONE"],
            default: "BANK",
        },
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            default: "VND",
        },
        payment_status: {
            type: String,
            enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
            default: "PENDING",
        },
        transaction_code: {
            type: String,
            default: null, // mã giao dịch từ SePay
        },
        // thời điểm thanh toán thành công
        paid_at: {
            type: Date,
            default: null,
        },
        // số tiền hoàn lại nếu hủy vé
        refund_amount: {
            type: Number,
            default: 0,
        },
        //Lưu thời điểm hoàn tiền.
        refunded_at: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
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
