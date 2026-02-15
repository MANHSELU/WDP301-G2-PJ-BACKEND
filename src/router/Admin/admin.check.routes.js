

const express = require("express");
const routerAdminCheck = express.Router();
const adminController = require("../../controller/Admin/admin.controller")
routerAdminCheck.post("/buses", adminController.createBus);
routerAdminCheck.post("/routes",adminController.createRoutes);
routerAdminCheck.get("/recommendStops",adminController.getSuggestStops);
routerAdminCheck.get("/searchStop",adminController.searchStops);
module.exports = routerAdminCheck;
