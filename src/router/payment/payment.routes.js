const express = require("express");
const router = express.Router();

const { sepayWebhook } = require("../../controller/payment/payment.controller");
const { handleSepayOutbound } = require("../../controller/payment/payment.controller");
router.post("/sepay-webhook", sepayWebhook);
router.post("/sepay-outbound", handleSepayOutbound);
module.exports = router;
