import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom metrics
const successRate = new Rate("submission_success_rate");
const submissionLatency = new Trend("submission_latency_ms");

/**
 * k6 load test for the submission API.
 *
 * Simulates realistic concurrent user submissions to measure:
 * - P95 latency under load
 * - Success rate at various concurrency levels
 * - Maximum concurrent users the system handles without degradation
 *
 * Run: k6 run --env BASE_URL=http://localhost:4000 k6-submission-test.js
 */
export const options = {
  stages: [
    { duration: "30s", target: 50 },    // Warm up: ramp to 50 VUs
    { duration: "1m", target: 200 },    // Scale: ramp to 200 VUs
    { duration: "2m", target: 400 },    // Peak: sustain 400 VUs
    { duration: "1m", target: 500 },    // Stress: push to 500 VUs
    { duration: "30s", target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<3000"],   // P95 latency under 3s
    submission_success_rate: ["rate>0.90"], // >90% success rate
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";

const testSubmissions = [
  {
    code: "class Solution:\n\tdef factorial(self, n):\n\t\tif n == 0 or n == 1:\n\t\t\treturn 1\n\t\treturn n * self.factorial(n - 1)",
    language: "PYTHON",
  },
  {
    code: "class Solution {\n\tpublic int factorial(int n) {\n\t\tif (n <= 1) return 1;\n\t\treturn n * factorial(n - 1);\n\t}\n}",
    language: "JAVA",
  },
  {
    code: "class Solution {\npublic:\n\tint factorial(int n) {\n\t\tif (n <= 1) return 1;\n\t\treturn n * factorial(n - 1);\n\t}\n};",
    language: "CPP",
  },
];

export default function () {
  const submission =
    testSubmissions[Math.floor(Math.random() * testSubmissions.length)];

  const payload = JSON.stringify({
    userId: `load-user-${__VU}`,
    problemId: "problem123",
    code: submission.code,
    language: submission.language,
  });

  const res = http.post(`${BASE_URL}/api/v1/submission`, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: "10s",
  });

  const passed = check(res, {
    "status is 201": (r) => r.status === 201,
    "response has data": (r) => {
      try {
        return r.json("data") !== undefined;
      } catch {
        return false;
      }
    },
    "latency < 3s": (r) => r.timings.duration < 3000,
  });

  successRate.add(passed);
  submissionLatency.add(res.timings.duration);

  // Simulate realistic user think time between submissions
  sleep(Math.random() * 2 + 0.5);
}

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.["p(95)"] || 0;
  const avgLatency = data.metrics.http_req_duration?.values?.avg || 0;
  const totalRequests = data.metrics.http_reqs?.values?.count || 0;
  const successPct = data.metrics.submission_success_rate?.values?.rate || 0;

  console.log("\n=== LOAD TEST RESULTS ===");
  console.log(`Total Requests:        ${totalRequests}`);
  console.log(`P95 Latency:           ${p95.toFixed(2)}ms`);
  console.log(`Avg Latency:           ${avgLatency.toFixed(2)}ms`);
  console.log(`Success Rate:          ${(successPct * 100).toFixed(2)}%`);
  console.log(`Max Concurrent Users:  500 VUs`);
  console.log("========================\n");

  return {};
}
