import type { EmailJob, Sender } from "@prisma/client";
import { EMAIL_INDEX, elasticsearch } from "../config/elasticsearch.js";

export async function ensureEmailIndex(): Promise<void> {
  if (!elasticsearch) return;
  const exists = await elasticsearch.indices.exists({ index: EMAIL_INDEX });
  if (exists) return;
  await elasticsearch.indices.create({
    index: EMAIL_INDEX,
    mappings: {
      properties: {
        recipient: { type: "keyword" },
        sender: { type: "keyword" },
        subject: { type: "text" },
        body: { type: "text" },
        status: { type: "keyword" },
        scheduledAt: { type: "date" },
        sentAt: { type: "date" },
        userId: { type: "keyword" }
      }
    }
  });
}

export async function indexEmail(job: EmailJob, sender: Sender): Promise<void> {
  if (!elasticsearch) return;
  try {
    await ensureEmailIndex();
    await elasticsearch.index({
      index: EMAIL_INDEX,
      id: job.id,
      document: {
        recipient: job.recipient,
        sender: sender.email,
        subject: job.subject,
        body: job.body,
        status: job.status,
        scheduledAt: job.scheduledAt.toISOString(),
        sentAt: job.sentAt?.toISOString(),
        userId: sender.userId
      },
      refresh: "wait_for"
    });
  } catch (error) {
    // Search is a secondary read model. Never undo a successful MySQL update.
    console.error("Elasticsearch indexing failed", error);
  }
}

export async function searchEmails(userId: string, query: string) {
  if (!elasticsearch) throw new Error("Elasticsearch is not configured");
  await ensureEmailIndex();
  const result = await elasticsearch.search({
    index: EMAIL_INDEX,
    size: 50,
    query: {
      bool: {
        filter: [{ term: { userId } }],
        must: query
          ? [{ multi_match: { query, fields: ["recipient^3", "sender^2", "subject^2", "body", "status"] } }]
          : [{ match_all: {} }]
      }
    },
    sort: [{ scheduledAt: "desc" }]
  });
  return result.hits.hits.map((hit) => ({ id: hit._id, ...(hit._source as Record<string, unknown>) }));
}
