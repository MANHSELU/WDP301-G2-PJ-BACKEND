const express = require("express");
const router = express.Router();
const adminController = require("../../controller/Admin/admin.controller");

// ==================== ACCOUNT ROUTES ====================
router.get("/accounts", adminController.getAllAccounts);
router.get("/accounts/:id", adminController.getAccountById);

// ==================== BUS ROUTES ====================
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
router.put("/locations/:id", adminController.updateLocation);
router.patch("/locations/:id/status", adminController.updateLocationStatus);
router.delete("/locations/:id", adminController.deleteLocation);
router.post("/buses", adminController.createBus);
router.post("/routes", adminController.createRoutes);
router.get("/recommendStops", adminController.getSuggestStops);
router.get("/searchStop", adminController.searchStops);
module.exports = router;



