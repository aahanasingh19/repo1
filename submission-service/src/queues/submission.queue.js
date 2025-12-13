const { Queue } = require("bullmq");
const redis = require("../config/redis.config.js");

module.exports = new Queue("SubmissionQueue", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
