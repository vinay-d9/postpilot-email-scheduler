import { Queue } from "bullmq";
import { redisConnection } from "../config/env.js";

export const EMAIL_QUEUE_NAME = "email-jobs";
export const emailQueue = new Queue(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: { age: 7 * 24 * 3600 },
    removeOnFail: { age: 14 * 24 * 3600 }
  }
});

export async function enqueueEmailJob(emailJobId, scheduledAt) {
  await emailQueue.add(
    "send-email",
    { emailJobId },
    { jobId: emailJobId, delay: Math.max(0, scheduledAt.getTime() - Date.now()) }
  );
}
