const express = require("express");
const routerLeTanCheck = express.Router();
const receptionistController = require("../../controller/Receptionist/receptionist.controller");
routerLeTanCheck.get("/active-trips", receptionistController.getActiveTrips);
routerLeTanCheck.post("/create-booking", receptionistController.createBooking);
routerLeTanCheck.get("/parcels", receptionistController.listParcels);
routerLeTanCheck.get("/parcels/:id", receptionistController.getParcelDetail);
module.exports = routerLeTanCheck;

