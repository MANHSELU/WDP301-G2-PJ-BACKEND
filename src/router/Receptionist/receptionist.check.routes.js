const express = require("express");
const router = express.Router();
const receptionistController = require("../../controller/Receptionist/receptionist.controller");

// Delivery order endpoints (receptionist)
router.get("/parcels", receptionistController.listParcels);
router.get("/parcels/:id", receptionistController.getParcelDetail);

module.exports = router;
