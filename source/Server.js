const express = require("express");
const app = express();
const port = 3000;
const database = require("./config/databaseConfig");
require("dotenv").config();
const cors = require("cors");




const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const customerRouterNotCheck = require("./router/Customer/index.notcheck.routes");
const customerRouterCheck = require("./router/Customer/index.check.routes");

/* ===== CORS ===== */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const http = require("http");
const server = http.createServer(app);
customerRouterNotCheck(app);
customerRouterCheck(app);

database.connect();
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
