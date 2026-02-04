

const express = require("express");
const routerAdminCheck = express.Router();
const adminController = require("../../controller/Admin/admin.controller")
routerAdminCheck.post("/buses", adminController.createBus);
module.exports = routerAdminCheck;
