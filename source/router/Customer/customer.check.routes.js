const express = require("express");
const router = express.Router();
const controller = require("./../../controller/Customer/customer.controller");
const middleware = require("./../../middleware/auth");
const upload = require("../../util/upload");

router.put("/changePass", middleware(),controller.changePass);
router.get("/getProfile", middleware(),controller.getProfile);
router.put("/updateProfile", middleware(),upload.single("avatar"),controller.updateProfile);

module.exports = router;
