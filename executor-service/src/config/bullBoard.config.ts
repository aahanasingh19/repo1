// @ts-nocheck
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import evaluationQueue from "../queues/evaluation.queue";
import submissionQueue from "../queues/submission.queue";
import deadLetterQueue from "../queues/deadletter.queue";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/ui");

createBullBoard({
  queues: [
    new BullMQAdapter(submissionQueue),
    new BullMQAdapter(evaluationQueue),
    new BullMQAdapter(deadLetterQueue),
  ],
  serverAdapter,
});

export default serverAdapter;

