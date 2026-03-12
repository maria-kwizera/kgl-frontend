const express = require("express");
const cors = require("cors");

require("dotenv").config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const allowedOrigin = process.env.FRONTEND_URL || "*";

app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.json({ message: "Backend is running" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
