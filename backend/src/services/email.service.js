import { EmailStatus, Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { enqueueEmailJob, emailQueue } from "../queues/email.queue.js";
import { indexEmail } from "./elasticsearch.service.js";

const emailAddress = z.string().trim().email().max(320).transform((value) => value.toLowerCase());

export const scheduleSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(50_000),
  recipients: z.array(emailAddress).min(1).max(10_000),
  startTime: z.string().datetime(),
  delayBetweenEmails: z.coerce.number().int().min(0).max(86_400_000),
  hourlyLimit: z.coerce.number().int().min(1).optional(),
  senderId: z.string().cuid().optional()
});

export async function scheduleCampaign(userId, input) {
  const startTime = new Date(input.startTime);
  if (Number.isNaN(startTime.getTime())) throw new Error("Invalid start time");
  let sender = input.senderId
  ? await prisma.sender.findFirst({
      where: { id: input.senderId, userId }
    })
  : await prisma.sender.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" }
    });

if (!sender) {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error("User not found");
  }

  sender = await prisma.sender.create({
    data: {
      userId: user.id,
      email: user.email,
      displayName: user.name
    }
  });
}
  const recipients = [...new Set(input.recipients)];
  const effectiveDelay = Math.max(input.delayBetweenEmails, env.minEmailDelayMs);
  const effectiveHourlyLimit = Math.min(input.hourlyLimit ?? env.maxEmailsPerHour, env.maxEmailsPerHour);
  const firstAt = Math.max(startTime.getTime(), Date.now());

  const result = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        userId,
        senderId: sender.id,
        subject: input.subject,
        body: input.body,
        startTime: new Date(firstAt),
        delayBetweenEmails: effectiveDelay,
        hourlyLimit: effectiveHourlyLimit
      }
    });
    const jobs = await Promise.all(
      recipients.map((recipient, index) =>
        tx.emailJob.create({
          data: {
            campaignId: campaign.id,
            senderId: sender.id,
            recipient,
            subject: input.subject,
            body: input.body,
            scheduledAt: new Date(firstAt + index * effectiveDelay),
            idempotencyKey: crypto.createHash("sha256").update(`${campaign.id}:${index}:${recipient}`).digest("hex")
          }
        })
      )
    );
    return { campaign, jobs };
  });

  // Redis persists these delayed jobs through API restarts. Deterministic job IDs
  // make this operation safe to retry if a request is interrupted.
  await Promise.all(result.jobs.map((job) => enqueueEmailJob(job.id, job.scheduledAt)));
  await Promise.all(result.jobs.map((job) => indexEmail(job, sender)));

  return {
    campaignId: result.campaign.id,
    scheduledCount: result.jobs.length,
    validRecipients: recipients.length,
    effectiveDelayBetweenEmails: effectiveDelay,
    hourlyLimit: effectiveHourlyLimit
  };
}

export async function listEmails(userId, status) {
  return prisma.emailJob.findMany({
    where: { status, campaign: { userId } },
    select: { id: true, recipient: true, subject: true, scheduledAt: true, sentAt: true, failedAt: true, status: true, errorMessage: true, previewUrl: true },
    orderBy: status === EmailStatus.SCHEDULED ? { scheduledAt: "asc" } : { sentAt: "desc" },
    take: 200
  });
}

export async function listSentEmails(userId) {
  return prisma.emailJob.findMany({
    where: { status: { in: [EmailStatus.SENT, EmailStatus.FAILED] }, campaign: { userId } },
    select: { id: true, recipient: true, subject: true, scheduledAt: true, sentAt: true, failedAt: true, status: true, errorMessage: true, previewUrl: true },
    orderBy: { updatedAt: "desc" },
    take: 200
  });
}

/** Repairs only a missing queue record; it never recreates jobs that BullMQ still knows about. */
export async function reconcileScheduledJobs() {
  const records = await prisma.emailJob.findMany({
    where: { status: EmailStatus.SCHEDULED },
    select: { id: true, scheduledAt: true },
    take: 10_000
  });
  let restored = 0;
  for (const record of records) {
    const existing = await emailQueue.getJob(record.id);
    if (!existing) {
      await enqueueEmailJob(record.id, record.scheduledAt);
      restored += 1;
    }
  }
  return restored;
}

export function isPrismaNotFound(error) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
