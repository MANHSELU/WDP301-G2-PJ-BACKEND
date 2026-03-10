const express = require("express");
const routerUserCheck = express.Router();
const assistantController = require("../../controller/Assistant Driver/assistantDriver.controller");
routerUserCheck.get(
    "/getAllTripsForAssistants",
    assistantController.getAllTripsForAssistants
);

routerUserCheck.get(
    "/shifts/stats",
    assistantController.getAssistantStats
);
routerUserCheck.get("/trips", assistantController.getAssistantTrips);
routerUserCheck.get("/trips/:tripId", assistantController.getAssistantTripDetail);
routerUserCheck.patch("/bookings/:orderId/boarded", assistantController.updateBoarded);
module.exports = routerUserCheck;
