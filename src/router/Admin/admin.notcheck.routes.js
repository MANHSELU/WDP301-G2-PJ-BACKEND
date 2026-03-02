const express = require("express");
const router = express.Router();
const controller = require("./../../controller/Admin/admin.controller")

router.get("/BusType", controller.getAllBusType);

module.exports = router;
