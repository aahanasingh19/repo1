import { Job, Worker } from "bullmq";
import redis from "../config/redis.config";
import SubmissionJob from "../jobs/SubmissionJob";
import { moveToDeadLetter } from "../queues/deadletter.queue";

function submissionWorker(queueName: string) {
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      if (job.name === "SubmissionJob") {
        console.log(`\nProcessing submission job: ${job.id}\n`);

        const handler = new SubmissionJob();
        // FIX: properly await the async handler (was fire-and-forget before)
        await handler.handle(job);
      }
    },
    {
      connection: redis,
      concurrency: 3,
    }
  );

  // Move permanently failed jobs to the Dead Letter Queue
  worker.on("failed", async (job, err) => {
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
      console.error(
        `Job ${job.id} permanently failed after ${job.attemptsMade} attempts:`,
        err.message
      );
      await moveToDeadLetter(
        job.id || "unknown",
        queueName,
        job.data,
        err.message
      );
    }
  });

  console.log(`Submission worker started on queue: ${queueName}`);
}

export default submissionWorker;
