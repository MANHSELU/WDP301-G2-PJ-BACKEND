const customerNotCheck = require("./customer.notcheck.routes");

module.exports = (app) => {
  app.use("/api/customer/notcheck", customerNotCheck);
};
