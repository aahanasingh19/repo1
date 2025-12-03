import { Job } from "bullmq";
import CodeRunner from "../containers/CodeRunner";
import evalQueueProducer from "../producers/evaluation.producer";
import { TestCase } from "../types/execute.type";

type PayloadType = {
  code: string;
  language: string;
  inputCase: string | string[];
  outputCase: string | string[];
  userId: string;
  submissionId: string;
};

/**
 * Handles a single submission job: executes user code against all test cases
 * inside ONE Docker container, then publishes results to the evaluation queue.
 */
class SubmissionJob {
  async handle(job: Job): Promise<void> {
    const data = job.data;
    const key = Object.keys(data)[0];
    const submission: PayloadType = data[key];

    const inputCases: string[] = Array.isArray(submission.inputCase)
      ? submission.inputCase
      : [];
    const outputCases: string[] = Array.isArray(submission.outputCase)
      ? submission.outputCase
      : [];

    const testCases: TestCase[] = inputCases.map(
      (input: string, index: number) => ({
        input,
        output: outputCases[index],
      })
    );

    // Execute all test cases in a single container (performance optimization)
    const runner = new CodeRunner();
    const result = await runner.execute(
      submission.code,
      submission.language,
      testCases
    );

    // FIX: await the producer call (was fire-and-forget before)
    await evalQueueProducer({
      status: result.overallStatus,
      response: result.results,
      userId: submission.userId,
      submissionId: submission.submissionId,
      metrics: result.metrics,
    });
  }
}

export default SubmissionJob;
