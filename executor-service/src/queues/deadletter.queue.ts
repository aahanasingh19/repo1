import { Queue } from "bullmq";
import redis from "../config/redis.config";

/**
 * Dead Letter Queue — stores jobs that have permanently failed
 * after exhausting all retry attempts.
 *
 * Each DLQ entry contains:
 * - originalJobId: the failed job's ID
 * - originalQueue: which queue the job came from
 * - payload: the original job data for debugging/replay
 * - failureReason: the error message
 * - failedAt: ISO timestamp of when the job was moved to DLQ
 */
const deadLetterQueue = new Queue("DeadLetterQueue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: false, // Keep DLQ entries for inspection
    removeOnFail: false,
  },
});

export async function moveToDeadLetter(
  jobId: string,
  queueName: string,
  payload: Record<string, unknown>,
  failureReason: string
): Promise<void> {
  await deadLetterQueue.add("FailedJob", {
    originalJobId: jobId,
    originalQueue: queueName,
    payload,
    failureReason,
    failedAt: new Date().toISOString(),
  });

  console.error(
    `[DLQ] Job ${jobId} from ${queueName} moved to dead letter queue: ${failureReason}`
  );
}

export default deadLetterQueue;
