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
module.exports = routerUserCheck;
