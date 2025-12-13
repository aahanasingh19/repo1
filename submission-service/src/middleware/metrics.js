/**
 * In-memory metrics collector for submission pipeline observability.
 *
 * Tracks:
 * - Total submissions processed
 * - Success/failure counts and rates
 * - Execution time averages
 * - Queue latency percentiles (P50, P95, P99)
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      totalSubmissions: 0,
      successfulSubmissions: 0,
      failedSubmissions: 0,
      totalExecutionTimeMs: 0,
      queueLatencies: [],
      executionTimes: [],
    };
  }

  recordSubmission(status, executionTimeMs, queueLatencyMs) {
    this.metrics.totalSubmissions++;

    if (status === "SUCCESS") {
      this.metrics.successfulSubmissions++;
    } else {
      this.metrics.failedSubmissions++;
    }

    if (executionTimeMs) {
      this.metrics.totalExecutionTimeMs += executionTimeMs;
      this.metrics.executionTimes.push(executionTimeMs);
      if (this.metrics.executionTimes.length > 1000) {
        this.metrics.executionTimes.shift();
      }
    }

    if (queueLatencyMs) {
      this.metrics.queueLatencies.push(queueLatencyMs);
      if (this.metrics.queueLatencies.length > 1000) {
        this.metrics.queueLatencies.shift();
      }
    }
  }

  getMetrics() {
    const latencies = [...this.metrics.queueLatencies].sort((a, b) => a - b);
    const execTimes = [...this.metrics.executionTimes].sort((a, b) => a - b);

    return {
      totalSubmissions: this.metrics.totalSubmissions,
      successRate:
        this.metrics.totalSubmissions > 0
          ? (
              (this.metrics.successfulSubmissions /
                this.metrics.totalSubmissions) *
              100
            ).toFixed(2) + "%"
          : "0%",
      failedSubmissions: this.metrics.failedSubmissions,
      avgExecutionTimeMs:
        this.metrics.totalSubmissions > 0
          ? Math.round(
              this.metrics.totalExecutionTimeMs /
                this.metrics.totalSubmissions
            )
          : 0,
      p50QueueLatencyMs: this.percentile(latencies, 0.5),
      p95QueueLatencyMs: this.percentile(latencies, 0.95),
      p99QueueLatencyMs: this.percentile(latencies, 0.99),
      p95ExecutionTimeMs: this.percentile(execTimes, 0.95),
    };
  }

  percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = Math.floor(sortedArray.length * p);
    return sortedArray[Math.min(index, sortedArray.length - 1)];
  }
}

const metricsCollector = new MetricsCollector();
module.exports = metricsCollector;
