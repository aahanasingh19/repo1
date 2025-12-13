const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 4000,
  MONGODB_URL: process.env.MONGODB_URL,
  NODE_ENV: process.env.NODE_ENV || "development",
  REDIS_PORT: process.env.REDIS_PORT || "6379",
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PASS: process.env.REDIS_PASS || "",
  PROBLEM_SERVICE_BASE_URL:
    process.env.PROBLEM_SERVICE_BASE_URL || "http://localhost:3000",
  SOCKET_SERVICE_URL:
    process.env.SOCKET_SERVICE_URL || "http://localhost:5001",

  // PostgreSQL configuration
  PG_HOST: process.env.PG_HOST || "127.0.0.1",
  PG_PORT: process.env.PG_PORT || "5432",
  PG_USER: process.env.PG_USER || "codejudge",
  PG_PASSWORD: process.env.PG_PASSWORD || "codejudge_pass",
  PG_DATABASE: process.env.PG_DATABASE || "codejudge_db",
};
