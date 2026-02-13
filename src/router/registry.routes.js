const clientNotcheck = require("./Customer/customer.notcheck.routes");
const DriverNotcheck = require("./Driver/driver.notcheck.routes");
const clientcheck = require("./Customer/customer.check.routes")
const checkClient = require("./../middleware/auth")
const driverCheck = require("./../router/Driver/driver.check.routes")
const adminCheck = require("./Admin/admin.check.routes");
const adminNotCheck = require("./Admin/admin.notcheck.routes");
module.exports = [
  {
    prefix: "/api/customer/notcheck",
    router: clientNotcheck,
  },
  {
    prefix: "/api/customer/check",
    middlewares:
      [
        checkClient.checkaccount,
        // checkClient.checkRole("696cd1f7cd7d3a094f45fd4b")
      ],
    router: clientcheck
  },
  {
    prefix: "/api/driver/notcheck",
    router: DriverNotcheck,
  },
  {
    prefix: "/api/driver/check",
    middlewares: [
      checkClient.checkaccount,
      // checkClient.checkRole("6989d2d5753034e791da3d2c")
    ],
    router: driverCheck
  },
  {
    prefix: "/api/admin/check",
    middlewares: [checkClient.checkaccount],
    router: adminCheck,
  },
  {
    prefix: "/api/admin/check",
    middlewares: [checkClient.checkaccount],
    router: adminCheck
  },
  {
    prefix: "/api/admin/notcheck",
    router: adminNotCheck
  },
];
