const express = require("express");
const routerUserCheck = express.Router();
const assistantController = require("../../controller/Assistant Driver/assistantDriver.controller");
// thừa
routerUserCheck.get(
    "/getAllTripsForAssistants",
    assistantController.getAllTripsForAssistants
);
// tổng quan
routerUserCheck.get(
    "/shifts/stats",
    assistantController.getAssistantStats
);
// lấy toàn bộ trip của của mình
routerUserCheck.get("/trips", assistantController.getAssistantTrips);
routerUserCheck.get("/trips/:tripId", assistantController.getAssistantTripDetail);
// update trạng thái
routerUserCheck.patch("/bookings/:orderId/boarded", assistantController.updateBoarded);
// confirm luggage
routerUserCheck.patch("/bookings/:bookingId/confirm-luggage", assistantController.confirmLuggage);
// update parcel status
routerUserCheck.patch("/parcels/:parcelId/update-status", assistantController.updateParcelStatus);
module.exports = routerUserCheck;
