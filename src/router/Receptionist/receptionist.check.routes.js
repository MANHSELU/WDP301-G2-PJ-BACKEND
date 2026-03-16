const express = require("express");
const routerLeTanCheck = express.Router();
const LeTanController = require("../../controller/Receptionist/receptionist.controller");
routerLeTanCheck.get("/active-trips", LeTanController.getActiveTrips);
routerLeTanCheck.post("/create-booking", LeTanController.createBooking);
module.exports = routerLeTanCheck;
