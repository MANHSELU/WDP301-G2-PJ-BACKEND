const express = require("express");
const routerUserCheck = express.Router();
const driverController = require("../../controller/Driver/driver.controller");
const upload = require("../../util/upload");
routerUserCheck.get("/face-login", driverController.getUser);
module.exports = routerUserCheck;
