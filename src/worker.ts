/**
 * Standalone BullMQ worker process.
 * Run with: npm run worker
 *
 * This process picks up analysis jobs enqueued by the Next.js app and
 * runs them in the background so the UI is never blocked.
 */
import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { runAnalysis } from "./lib/analysis/runner";
import { redisOptionsFromUrl, type AnalysisJobData } from "./lib/queue/index";

const connection = new IORedis(redisOptionsFromUrl(process.env.REDIS_URL));

const worker = new Worker<AnalysisJobData>(
  "analysis",
  async (job) => {
    console.log(
      `[worker] Processing job ${job.id} — checkpoint ${job.data.checkpointId}`
    );
    await runAnalysis(job.data.checkpointId, job.data.groupId);
    console.log(`[worker] Job ${job.id} complete`);
  },
  { connection, concurrency: 2 }
);

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err);
});

console.log("[worker] Analysis worker started, waiting for jobs…");
