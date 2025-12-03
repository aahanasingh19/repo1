import dotenv from "dotenv";

dotenv.config();

export default {
  PORT: process.env.PORT || 7000,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PASS: process.env.REDIS_PASS,
  NODE_ENV: process.env.NODE_ENV || "development",
};
