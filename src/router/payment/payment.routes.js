const express = require("express");
const router = express.Router();

const { sepayWebhook } = require("../../controller/payment/payment.controller");
const checkClient = require("./../../middleware/auth")
router.post("/sepay-webhook", sepayWebhook);

module.exports = router;
// https://f0de-2405-4802-6376-da0-b87b-1559-58d7-c5a1.ngrok-free.app/api/payment/sepay-webhook