const express = require("express");
const routerUserCheck = express.Router();
const userController = require("../../controller/Customer/customer.controller");
const upload = require("../../util/upload");

routerUserCheck.get("/getuser", userController.getUser);
routerUserCheck.put("/changPassword", userController.changPassword);
routerUserCheck.put(
  "/updateProfile",
  upload.single("avatar"),
  userController.updateProfile
);

routerUserCheck.post("/create", userController.createBooking);
routerUserCheck.post("/getOrderHistory", userController.getOrderHistory);

// Delivery / Parcel endpoints (customer)
routerUserCheck.post("/parcels", userController.createParcel);
routerUserCheck.get("/parcels", userController.getMyParcels);
routerUserCheck.get("/parcels/:id", userController.getParcelDetail);
routerUserCheck.patch("/parcels/:id/cancel", userController.cancelParcel);

module.exports = routerUserCheck;
