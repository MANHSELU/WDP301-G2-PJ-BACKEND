const express = require("express");
const router = express.Router();
const adminController = require("../../controller/Admin/admin.controller");

// ==================== ACCOUNT ROUTES ====================
router.get("/accounts", adminController.getAllAccounts);
router.post("/accounts", adminController.createStaffAccount);
router.get("/accounts/:id", adminController.getAccountById);
// router.patch("/accounts/:id", adminController.updateAccount);

// ==================== BUS ROUTES ====================
router.get("/buses", adminController.getAllBuses);
router.get("/buses/:id", adminController.getBusById);
router.put("/buses/:id", adminController.updateBus);
router.patch("/buses/:id/status", adminController.updateBusStatus);
router.patch("/buses/:id/seat-layout", adminController.updateBusSeatLayout);
router.get("/routes", adminController.getAllRoutesAdmin);
router.get("/routes/:id", adminController.getRouteByIdAdmin);
router.put("/routes/:id", adminController.updateRoute);
router.patch("/routes/:id/status", adminController.updateRouteStatus);
router.patch(
  "/routes/:routeId/stops/:stopId/pickup",
  adminController.updateStopPickupStatus
);
router.patch(
  "/routes/:routeId/stops/:stopId/pickup",
  adminController.updateStopPickupStatus
);
router.post("/routes/:routeId/stops", adminController.addStopToRoute);
router.delete(
  "/routes/:routeId/stops/:stopId",
  adminController.removeStopFromRoute
);
router.put(
  "/routes/:routeId/stops/:stopId/order",
  adminController.updateRouteStopOrder
);
router.post(
  "/routes/:routeId/stops/:stopId/locations",
  adminController.addLocationToStop
);
router.delete(
  "/routes/:routeId/stops/:stopId",
  adminController.removeStopFromRoute
);
router.put(
  "/routes/:routeId/stops/:stopId/order",
  adminController.updateRouteStopOrder
);
router.post(
  "/routes/:routeId/stops/:stopId/locations",
  adminController.addLocationToStop
);
router.put("/locations/:id", adminController.updateLocation);
router.patch("/locations/:id/status", adminController.updateLocationStatus);
router.delete("/locations/:id", adminController.deleteLocation);

router.post("/buses", adminController.createBus);
router.post("/routes", adminController.createRoutes);
router.get("/recommendStops", adminController.getSuggestStops);
router.get("/getAllStops", adminController.getAllStops);
router.post("/getGeoStopLocation", adminController.getGeoOfStopLocation);
router.post("/createStopLocation", adminController.createStopLocation);
router.get("/getRoutes", adminController.getAllRoutes);
router.get("/getBuses", adminController.getAllBuses);
router.get("/getAvailableDrivers", adminController.getAvailableDrivers);
router.get("/getAvailableAssistant", adminController.getAvailableAssistantDriver);
router.post("/trips", adminController.createTrips);
router.get("/getDurationHandicraft", adminController.getDurationOfHandicraft);
router.get("/trips", adminController.getAllTrips);
router.get("/trips/:id", adminController.getTripById);
router.put("/trips/:id", adminController.updateTrip);
router.get("/viewBuses", adminController.viewBuses);
module.exports = router;
