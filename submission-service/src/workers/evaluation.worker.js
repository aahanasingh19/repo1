const { Worker } = require("bullmq");
const redis = require("../config/redis.config.js");
const axios = require("axios");
const logger = require("../config/logger.config.js");
const metricsCollector = require("../middleware/metrics.js");
const SubmissionService = require("../services/SubmissionService.js");
const SubmissionRepository = require("../repositories/SubmissionRepository.js");
const pool = require("../config/postgres.config.js");
const { SOCKET_SERVICE_URL } = require("../config/server.config.js");

function evaluationWorker(queueName) {
  const worker = new Worker(
    queueName,
    async (job) => {
      if (job.name === "EvaluationJob") {
        const startTime = Date.now();

        try {
          console.log(
            `\nProcessing evaluation result:`,
            `\n  submissionId: ${job.data.submissionId}`,
            `\n  status: ${job.data.status}\n`
          );

          const submissionService = new SubmissionService(
            new SubmissionRepository()
          );

          // Update submission status + response in PostgreSQL
          await submissionService.updateSubmissionStatus(
            job.data.submissionId,
            job.data.status,
            job.data.response
          );

          // Notify socket service for real-time client updates
          await axios.post(`${SOCKET_SERVICE_URL}/evaluationResult`, {
            userId: job.data.userId,
            payload: job.data,
          });

          if (job.data.metrics) {
            try {
              await pool.query(
                `INSERT INTO execution_logs (submission_id, start_time, end_time, memory_usage_bytes, exit_code)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  job.data.submissionId,
                  job.data.metrics.startTime,
                  job.data.metrics.endTime,
                  job.data.metrics.memoryUsageBytes || 0,
                  job.data.metrics.exitCode || 0,
                ]
              );
            } catch (pgErr) {
              logger.error(`Failed to insert metrics: ${pgErr.message}`);
            }
          }

          // Record metrics
          const executionTime = Date.now() - startTime;
          const queueLatency = job.processedOn
            ? job.processedOn - job.timestamp
            : 0;
          metricsCollector.recordSubmission(
            job.data.status,
            executionTime,
            queueLatency
          );
        } catch (error) {
          let errLog;
          if (error.response) {
            errLog = `Axios Error (status: ${error.response.status}) ${JSON.stringify(error.response.data)}`;
          } else if (error.request) {
            errLog = `Socket service unreachable: ${error.message}`;
          } else {
            errLog = `Error: ${error.message}`;
          }

          logger.error(
            `msg: [${errLog}], submissionId: [${job.data.submissionId}]`
          );
          throw error;
        }
      }
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    if (job) {
      logger.error(
        `Evaluation job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`
      );
    }
  });

  console.log(`Evaluation worker started on queue: ${queueName}`);
}

module.exports = evaluationWorker;
