const mongoose = require("mongoose");

const PaymentTransactionSchema = new mongoose.Schema(
    {
        payment_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BookingPayment",
            required: true,
        },

        gateway: {
            type: String,
            default: "BACNK",
        },
        // thời gian giao dịch 
        transaction_date: {
            type: Date,
            default: Date.now,
        },
        // số tài khoản  gửi tiền
        account_number: {
            type: String,
            default: null,
        },

        sub_account: {
            type: String,
            default: null,
        },
        // số tiền chuyến vào tài khoản
        amount_in: {
            type: Number,
            default: 0,
        },
        // số tiền chuyển ra khỏi tài khoản
        amount_out: {
            type: Number,
            default: 0,
        },

        accumulated: {
            type: Number,
            default: 0,
        },

        code: {
            type: String,
            default: null,
        },

        transaction_content: {
            type: String,
            default: null,
        },

        reference_number: {
            type: String,
            default: null,
        },

        raw_body: {
            type: Object,
            default: null,
        },
    },
    {
        timestamps: { createdAt: "created_at", updatedAt: false },
    }
);

module.exports = mongoose.model(
    "PaymentTransaction",
    PaymentTransactionSchema
);