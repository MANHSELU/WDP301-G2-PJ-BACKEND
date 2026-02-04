const clientNotcheck = require("./Customer/customer.notcheck.routes");
const DriverNotcheck = require("./Driver/driver.notcheck.routes");
const clientcheck = require("./Customer/customer.check.routes");
const adminCheck = require("./Admin/admin.check.routes");
const checkClient = require("./../middleware/auth")
module.exports = [
  {
    prefix: "/api/customer/notcheck",
    router: clientNotcheck
  },
  {
    prefix: "/api/driver/notcheck",
    router: DriverNotcheck
  },
  {
    prefix: "/api/customer/check",
    middlewares: [checkClient.checkaccount],
    router: clientcheck
  },
    {
    prefix: "/api/admin/check",
    middlewares: [checkClient.checkaccount],
    router: adminCheck
  },
];
