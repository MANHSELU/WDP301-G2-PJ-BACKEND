const BookingPayment = require("./../../model/BookingPayment");
const BookingOrder = require("./../../model/BookingOrder");
const PaymentTransaction = require("./../../model/PaymentTransaction");


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

const handleSepayOutbound = async (req, res) => {
    console.log("chạy vào payment hoàn tiền ")
    const authHeader = req.headers["authorization"] || req.headers["Authorization"] || "";
    const incomingKey = authHeader.replace(/^Apikey\s+/i, "").trim();

    if (!incomingKey || incomingKey !== process.env.SEPAY_API_KEY) {
        console.warn("[SePay Webhook] ❌ Invalid API key:", incomingKey?.slice(0, 8) + "...");
        return res.status(200).json({ success: false, message: "Unauthorized" });
    }
    try {
        const {
            transferType,
            transferAmount,
            content,
            referenceCode,
            code,
        } = req.body;

        console.log("1")
        // Chỉ xử lý giao dịch chuyển RA
        if (transferType !== "out") {
            return res.status(200).json({ success: true });
        }
        console.log("2")

        let payment = null;


        // Khi lễ tân chuyển khoản, nội dung = "Hoan <paymentId_8ký_tự_cuối>"
        if (content || code) {
            const searchStr = (code || content || "").trim();
            // Tìm tất cả payment đang chờ hoàn rồi lọc theo content
            const pendingPayments = await BookingPayment.find({
                payment_status: "REFUNDED",
            }).lean();

            payment = pendingPayments.find((p) => {
                const pid = p._id.toString();
                // Match nếu nội dung chứa 8 ký tự cuối của paymentId
                return searchStr.includes(pid.slice(-8).toUpperCase()) ||
                    searchStr.includes(pid.slice(-8));
            }) ?? null;
        }
        console.log("3")

        // Cách 2: fallback — match theo số tiền chính xác
        if (!payment && transferAmount) {
            payment = await BookingPayment.findOne({
                payment_status: "REFUNDED",
                refund_amount: transferAmount,
            }).lean();
        }
        console.log("transferAmount là : ", transferAmount)
        console.log("4")
        if (!payment) {
            // Không tìm thấy — có thể là giao dịch khác, bỏ qua
            return res.status(200).json({ success: true });
        }
        console.log("6")
        // Kiểm tra số tiền khớp (cho phép lệch tối đa 1000đ do làm tròn)
        const expected = payment.refund_amount ?? Math.round(payment.amount * 0.7);
        if (Math.abs(transferAmount - expected) > 1000) {
            console.warn(`[sepay-outbound] Số tiền không khớp: expected=${expected}, received=${transferAmount}`);
            return res.status(200).json({ success: true });
        }
        console.log("7")
        // ── Cập nhật payment → REFUNDED ──────────────────────────────
        await BookingPayment.findByIdAndUpdate(payment._id, {
            payment_status: "REFUND_SUCCESS",
            refund_transaction_code: referenceCode ?? code ?? null,
            refunded_at: new Date(),
            refund_note: content ?? null,
        });
        console.log("8")
        // Cập nhật order → CANCELLED (nếu chưa)
        await BookingOrder.findByIdAndUpdate(payment.order_id, {
            order_status: "CANCELLED",
        });

        console.log(`[sepay-outbound] Hoàn tiền thành công: payment=${payment._id}, amount=${transferAmount}`);
        return res.status(200).json({ success: true });

    } catch (err) {
        console.log("lỗi")
        console.error("[sepay-outbound] Lỗi:", err);
        // Vẫn trả 200 để SePay không retry liên tục
        return res.status(200).json({ success: true });
    }
};

const getRefundStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;

        const payment = await BookingPayment
            .findById(paymentId)
            .select("payment_status refunded_at refund_transaction_code refund_amount")
            .lean();

        if (!payment) {
            return res.status(404).json({ message: "Không tìm thấy payment" });
        }

        // Chỉ cho phép poll khi đang trong trạng thái hoàn tiền
        if (!["REFUND_SUCCESS", "REFUNDED"].includes(payment.payment_status)) {
            return res.status(400).json({ message: "Payment không ở trạng thái hoàn tiền" });
        }

        return res.status(200).json({
            payment_status: payment.payment_status,
            refunded_at: payment.refunded_at ?? null,
            refund_transaction_code: payment.refund_transaction_code ?? null,
            refund_amount: payment.refund_amount ?? null,
        });

    } catch (err) {
        console.error("[getRefundStatus]", err);
        return res.status(500).json({ message: "Lỗi server" });
    }
};
module.exports = { sepayWebhook, getPaymentStatus, handleSepayOutbound, getRefundStatus };