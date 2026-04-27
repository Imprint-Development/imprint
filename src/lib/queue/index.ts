import IORedis, { type RedisOptions } from "ioredis";
import { Queue } from "bullmq";

/**
 * Parse a Redis URL using the WHATWG URL API and return an ioredis options
 * object. This avoids the deprecated `url.parse()` call inside ioredis when
 * a connection string is passed directly.
 */
export function redisOptionsFromUrl(redisUrl?: string): RedisOptions {
  const u = new URL(redisUrl ?? "redis://localhost:6379");
  return {
    host: u.hostname,
    port: u.port ? parseInt(u.port, 10) : 6379,
    ...(u.password ? { password: decodeURIComponent(u.password) } : {}),
    ...(u.username ? { username: decodeURIComponent(u.username) } : {}),
    ...(u.pathname && u.pathname !== "/"
      ? { db: parseInt(u.pathname.slice(1), 10) }
      : {}),
    maxRetriesPerRequest: null,
  };
}

export const redisConnection = new IORedis(
  redisOptionsFromUrl(process.env.REDIS_URL)
);

export interface AnalysisJobData {
  checkpointId: string;
  courseId: string;
  /** When set, only this group will be re-analyzed */
  groupId?: string;
}

export const analysisQueue = new Queue<AnalysisJobData>("analysis", {
  connection: redisConnection,
});
