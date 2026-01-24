const clientNotcheck = require("./Customer/customer.notcheck.routes");
const clientcheck = require("./Customer/customer.check.routes")
const checkClient = require("./../middleware/auth")
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
];
