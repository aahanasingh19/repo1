const pool = require("../../../config/postgres.config.js");

async function systemRoutes(fastify, options) {
  fastify.get("/metrics", async (req, reply) => {
    try {
      const result = await pool.query(`
        WITH stats AS (
          SELECT
            COUNT(*) as total_executions,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (end_time - start_time))) as p95_latency,
            SUM(CASE WHEN exit_code != 0 THEN 1 ELSE 0 END) as failed_executions
          FROM execution_logs
          WHERE created_at >= NOW() - INTERVAL '1 hour'
        )
        SELECT 
          total_executions,
          COALESCE(p95_latency, 0) as "p95_latency_seconds",
          CASE WHEN total_executions > 0 THEN (failed_executions::FLOAT / total_executions) * 100 ELSE 0 END as "failure_rate_percent"
        FROM stats;
      `);

      const metrics = result.rows[0];
      return reply.code(200).send({
        status: "success",
        data: {
          metrics: {
            recentAverage: {
              p95_latency: parseFloat(metrics.p95_latency_seconds).toFixed(2) + 's',
              failureRate: parseFloat(metrics.failure_rate_percent).toFixed(2) + '%'
            }
          }
        }
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Internal Server Error" });
    }
  });
}

module.exports = systemRoutes;
