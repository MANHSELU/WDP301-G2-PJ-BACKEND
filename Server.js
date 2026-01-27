const express = require("express");
const app = express();
const port = 3000;
const database = require("./src/config/databaseConfig");
require("dotenv").config();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var cors = require('cors')
const ROUTES = require("./src/router/registry.routes");
const whitelist = [
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
// cách router để có thể hoạt động được 
ROUTES.forEach(route => {
  if (route.middlewares && route.middlewares.length > 0) {
    app.use(route.prefix, ...route.middlewares, route.router);
  } else {
    app.use(route.prefix, route.router);
  }
});
database.connect();
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
