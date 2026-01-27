const express = require("express");
const router = express.Router();
const controller = require("./../../controller/Customer/customer.controller")

router.post("/register", controller.register);
router.post("/verifyAccount", controller.verifyAccount);
router.post("/resendOTP", controller.resendOtp);
router.post("/login", controller.loginController);
router.post("/check-phone", controller.checkphone);
router.post("/resetPass", controller.resetPassword);
module.exports = router;
