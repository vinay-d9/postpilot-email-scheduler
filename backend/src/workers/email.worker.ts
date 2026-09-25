import { DelayedError, Job, Worker } from "bullmq";
import { EmailStatus } from "@prisma/client";
import nodemailer from "nodemailer";
import { env, redisConnection } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { EMAIL_QUEUE_NAME, type SendEmailJobData } from "../queues/email.queue.js";
import { indexEmail } from "../services/elasticsearch.service.js";
import { reserveHourlyQuota, reserveMinimumDelay, shouldNotifyRateLimit } from "../services/rate-limit.service.js";
import { notifyRateLimit } from "../services/slack.service.js";

const STALE_PROCESSING_MS = 5 * 60 * 1000;

function transporter() {
  if (!env.etherealHost || !env.etherealUser || !env.etherealPassword) {
    throw new Error("Ethereal SMTP is not configured. Set ETHEREAL_HOST, ETHEREAL_USER and ETHEREAL_PASSWORD.");
  }
  return nodemailer.createTransport({
    host: env.etherealHost,
    port: env.etherealPort,
    secure: env.etherealPort === 465,
    auth: { user: env.etherealUser, pass: env.etherealPassword }
  });
}

async function moveBackToDelayed(job: Job<SendEmailJobData>, when: Date): Promise<never> {
  await job.moveToDelayed(when.getTime(), job.token);
  throw new DelayedError("Deferred by scheduler");
}

async function releaseForLater(id: string, job: Job<SendEmailJobData>, when: Date): Promise<never> {
  await prisma.emailJob.update({
    where: { id },
    data: { status: EmailStatus.SCHEDULED, processingAt: null, scheduledAt: when }
  });
  return moveBackToDelayed(job, when);
}

async function processEmail(job: Job<SendEmailJobData>) {
  const record = await prisma.emailJob.findUnique({
    where: { id: job.data.emailJobId },
    include: { campaign: true, sender: true }
  });
  if (!record || record.status === EmailStatus.SENT) return;

  // A database claim protects against duplicate queue jobs / retries while letting
  // a job abandoned by a crashed worker be reclaimed after a short timeout.
  const claimed = await prisma.emailJob.updateMany({
    where: {
      id: record.id,
      status: { not: EmailStatus.SENT },
      OR: [
        { status: { in: [EmailStatus.SCHEDULED, EmailStatus.FAILED] } },
        { status: EmailStatus.PROCESSING, processingAt: { lt: new Date(Date.now() - STALE_PROCESSING_MS) } }
      ]
    },
    data: { status: EmailStatus.PROCESSING, processingAt: new Date(), errorMessage: null, failedAt: null }
  });
  if (!claimed.count) {
    // Another live worker owns it. Keep this durable job instead of treating it as a failure.
    return moveBackToDelayed(job, new Date(Date.now() + 5_000));
  }

  try {
    const spacingWait = await reserveMinimumDelay(record.senderId);
    if (spacingWait > 0) return releaseForLater(record.id, job, new Date(Date.now() + spacingWait));

    const quota = await reserveHourlyQuota(record.senderId, record.campaign.hourlyLimit);
    if (!quota.granted) {
      const resumeAt = new Date(Date.now() + quota.retryAfterMs + 100);
      if (await shouldNotifyRateLimit(record.senderId, quota.windowKey, quota.retryAfterMs)) {
        await notifyRateLimit(record.sender.userId, record.sender.email, resumeAt);
      }
      return releaseForLater(record.id, job, resumeAt);
    }

    const info = await transporter().sendMail({
      from: record.sender.displayName ? `"${record.sender.displayName}" <${record.sender.email}>` : record.sender.email,
      to: record.recipient,
      subject: record.subject,
      text: record.body,
      messageId: `<${record.id}@email-job-scheduler.local>`
    });
    const previewUrl = nodemailer.getTestMessageUrl(info) || null;
    const updated = await prisma.emailJob.update({
      where: { id: record.id },
      data: { status: EmailStatus.SENT, sentAt: new Date(), processingAt: null, previewUrl }
    });
    await indexEmail(updated, record.sender);
  } catch (error) {
    if (error instanceof DelayedError) throw error;
    const message = error instanceof Error ? error.message : "Unknown email delivery error";
    const failed = await prisma.emailJob.update({
      where: { id: record.id },
      data: { status: EmailStatus.FAILED, failedAt: new Date(), processingAt: null, errorMessage: message }
    });
    await indexEmail(failed, record.sender);
    throw error;
  }
}

const worker = new Worker<SendEmailJobData>(EMAIL_QUEUE_NAME, processEmail, {
  connection: redisConnection,
  concurrency: env.workerConcurrency
});

worker.on("completed", (job) => console.info(`Email job ${job.id} completed`));
worker.on("failed", (job, error) => console.error(`Email job ${job?.id} failed`, error.message));
worker.on("error", (error) => console.error("Email worker error", error));

async function shutdown() {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
