const customerCheck = require("./customer.check.routes");

module.exports = (app) => {
  app.use("/api/customer/check", customerCheck);
};
