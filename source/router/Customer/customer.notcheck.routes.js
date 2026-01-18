const express = require("express");
const router = express.Router();
const controller = require("./../../controller/Customer/customer.controller")

router.post("/register", controller.register);
router.post("/verifyAccount", controller.verifyAccount);
router.post("/resendOTP", controller.resendOtp);
router.post("/forgotPass", controller.forgotPassword);
router.post("/resetPass", controller.resetPassword);
router.post("/login", controller.loginController);

module.exports = router;
