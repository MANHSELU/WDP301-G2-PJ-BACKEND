const express = require("express");
const router = express.Router();
const controller = require("./../../controller/Customer/customer.controller");
const middleware = require("./../../middleware/auth");

router.put("/changePass", middleware(),controller.changePass);


module.exports = router;
