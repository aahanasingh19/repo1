import evaluationQueue from "../queues/evaluation.queue";

export default async function evalQueueProducer(
  payload: Record<string, unknown>
) {
  console.log(
    `\nEvaluation result for submission: ${payload.submissionId}`,
    `\n  status: ${payload.status}\n`
  );

  await evaluationQueue.add("EvaluationJob", payload);
}
