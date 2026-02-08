const clientNotcheck = require("./Customer/customer.notcheck.routes");
const DriverNotcheck = require("./Driver/driver.notcheck.routes");
const clientcheck = require("./Customer/customer.check.routes")
const checkClient = require("./../middleware/auth")
const driverCheck = require("./../router/Driver/driver.check.routes")
module.exports = [
  {
    prefix: "/api/customer/notcheck",
    router: clientNotcheck
  },
  {
    prefix: "/api/customer/check",
    middlewares: [checkClient.checkaccount],
    router: clientcheck
  },
  {
    prefix: "/api/driver/notcheck",
    router: DriverNotcheck
  },
  {
    prefix: "/api/driver/check",
    middlewares: [checkClient.checkaccount],
    router: driverCheck
  },
];
