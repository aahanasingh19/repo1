import { Queue } from "bullmq";
import redis from "../config/redis.config";

export default new Queue("SubmissionQueue", {
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
