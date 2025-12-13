const { Pool } = require("pg");
const {
  PG_HOST,
  PG_PORT,
  PG_USER,
  PG_PASSWORD,
  PG_DATABASE,
} = require("./server.config.js");

const pool = new Pool({
  host: PG_HOST,
  port: parseInt(PG_PORT || "5432"),
  user: PG_USER,
  password: PG_PASSWORD,
  database: PG_DATABASE,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL");
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err);
});

module.exports = pool;
