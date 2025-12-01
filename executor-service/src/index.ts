import express, { Express, Request, Response } from "express";

import bullBoardAdapter from "./config/bullBoard.config";
import serverConfig from "./config/server.config";
import apiRouter from "./routes";
import submissionWorker from "./workers/submission.worker";
import { initCleanupWorker } from "./workers/cleanup.worker";

const app: Express = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.text());

app.get("/", (_: Request, res: Response) => {
  return res.json({ message: "executor service is live" });
});

app.get("/health", (_: Request, res: Response) => {
  return res.json({ status: "healthy", service: "executor-service" });
});

app.use("/api", apiRouter);
app.use("/ui", bullBoardAdapter.getRouter());

app.listen(serverConfig.PORT, () => {
  console.log(`Executor service running at port ${serverConfig.PORT}`);
  console.log(
    `BullBoard dashboard: http://localhost:${serverConfig.PORT}/ui`
  );
  submissionWorker("SubmissionQueue");
  initCleanupWorker();
});
