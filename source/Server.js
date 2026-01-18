const express = require("express");
const app = express();
const port = 3000;
const database = require("./config/databaseConfig");
require("dotenv").config();




const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const customerRouterNotCheck = require("./router/Customer/index.notcheck.routes");


const http = require("http");
const server = http.createServer(app);
customerRouterNotCheck(app);

database.connect();
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
