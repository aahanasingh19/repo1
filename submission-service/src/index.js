const fastify = require("fastify")({ logger: true });

const app = require("./app.js");
const DatabaseConn = require("./config/DatabaseConn.js");
const { PORT } = require("./config/server.config.js");
const errorHandler = require("./utils/errorHandler.js");
const evaluationWorker = require("./workers/evaluation.worker.js");
const metricsCollector = require("./middleware/metrics.js");

fastify.register(app);
fastify.setErrorHandler(errorHandler);

// Metrics endpoint for observability
fastify.get("/metrics", async (req, res) => {
  return res.status(200).send({
    success: true,
    data: metricsCollector.getMetrics(),
  });
});

// Health check endpoint
fastify.get("/health", async (req, res) => {
  return res.status(200).send({ status: "healthy", service: "codeforge-submission" });
});

fastify.listen({ port: PORT, host: "0.0.0.0" }, async (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  console.log(`CodeForge Submission Service running at port ${PORT}`);
  await DatabaseConn.connect();

  evaluationWorker("EvaluationQueue");
});
