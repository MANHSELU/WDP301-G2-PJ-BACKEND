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
routerUserCheck.post("/getOrderHistory", userController.getOrderHistory)
routerUserCheck.get("/getTripFinishedHistory", userController.getFinishedTripBookingHistory);
routerUserCheck.post("/reviewTrip", userController.reviewTrip);
routerUserCheck.get("/reviewTripHistory", userController.getFinishedTripBookingHistoryWithReview);

module.exports = routerUserCheck;
