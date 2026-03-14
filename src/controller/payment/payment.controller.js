const BookingPayment = require("./../../model/BookingPayment");
const BookingOrder = require("./../../model/BookingOrder");
const PaymentTransaction = require("./../../model/PaymentTransaction");

/* ══════════════════════════════════════════════════════════════
   SEPAY WEBHOOK
   SePay POST về endpoint này mỗi khi có giao dịch vào tài khoản.
   Dashboard SePay → Webhook → URL: https://your-domain.com/api/payment/sepay-webhook
   Content-Type: application/json
   (Nếu dùng Webhook Secret, uncomment phần verify ở dưới)
══════════════════════════════════════════════════════════════ */
const sepayWebhook = async (req, res) => {
    try {
        console.log("tự động gọi về web hook của payment")
        // ── Verify API key từ SePay ──
        const authHeader = req.headers["authorization"] || req.headers["Authorization"] || "";
        const incomingKey = authHeader.replace(/^Apikey\s+/i, "").trim();

        if (!incomingKey || incomingKey !== process.env.SEPAY_API_KEY) {
            console.warn("[SePay Webhook] ❌ Invalid API key:", incomingKey?.slice(0, 8) + "...");
            // Trả 200 để SePay không retry, nhưng không xử lý
            return res.status(200).json({ success: false, message: "Unauthorized" });
        }

        const body = req.body;

        // ── 0. Chỉ xử lý giao dịch TIỀN VÀO ──
        if (body.transferType !== "in" || !body.transferAmount || body.transferAmount <= 0) {
            return res.status(200).json({ success: true, message: "Ignored: not an incoming transfer" });
        }

        const content = (body.content || body.code || body.description || "").trim().toUpperCase();

        // ── 1. Tìm orderId từ nội dung: "DATVE <orderId>" ──
        const match = content.match(/DATVE\s+([A-F0-9]{24})/i);
        if (!match) {
            return res.status(200).json({ success: true, message: "No order code found in content" });
        }
        const orderId = match[1];

        // ── 2. Tìm BookingPayment theo order ──
        const payment = await BookingPayment.findOne({ order_id: orderId });
        if (!payment) {
            return res.status(200).json({ success: true, message: "Payment record not found" });
        }

        // ── 3. Idempotent — tránh xử lý 2 lần cùng 1 giao dịch ──
        const already = await PaymentTransaction.findOne({
            payment_id: payment._id,
            transaction_content: content,
        });
        if (already) {
            return res.status(200).json({ success: true, message: "Already processed" });
        }

        // ── 4. Lưu PaymentTransaction ──
        await PaymentTransaction.create({
            payment_id: payment._id,
            gateway: body.gateway || "BANK",
            transaction_date: body.transactionDate ? new Date(body.transactionDate) : new Date(),
            account_number: body.accountNumber || null,
            sub_account: body.subAccount || null,
            amount_in: body.transferAmount,
            amount_out: 0,
            accumulated: body.accumulated || 0,
            code: body.code || null,
            transaction_content: content,
            reference_number: body.referenceCode || null,
            raw_body: body,
        });

        // ── 5. Kiểm tra đủ tiền ──
        if (body.transferAmount < payment.amount) {
            return res.status(200).json({ success: true, message: "Partial payment recorded" });
        }

        // ── 6. Cập nhật BookingPayment → PAID ──
        await BookingPayment.findByIdAndUpdate(payment._id, {
            payment_status: "PAID",
            transaction_code: body.referenceCode || body.code || null,
            paid_at: new Date(),
        });

        // ── 7. Cập nhật BookingOrder → PAID ──
        await BookingOrder.findByIdAndUpdate(orderId, {
            order_status: "PAID",
        });

        console.log(`[SePay Webhook] ✅ Order ${orderId} PAID - ${body.transferAmount}đ`);
        return res.status(200).json({ success: true, message: "Payment confirmed" });

    } catch (err) {
        console.error("[SePay Webhook] Error:", err);
        return res.status(200).json({ success: false, message: "Internal error" });
    }
};


const getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await BookingOrder.findById(orderId).select("order_status");
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const payment = await BookingPayment.findOne({ order_id: orderId })
            .select("payment_status paid_at amount");

        return res.status(200).json({
            success: true,
            data: {
                order_status: order.order_status,
                payment_status: payment?.payment_status ?? "PENDING",
                paid_at: payment?.paid_at ?? null,
                amount: payment?.amount ?? 0,
            },
        });
    } catch (err) {
        console.error("[getPaymentStatus] Error:", err);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

module.exports = { sepayWebhook, getPaymentStatus };