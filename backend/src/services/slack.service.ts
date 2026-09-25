import axios from "axios";
import { prisma } from "../config/prisma.js";

type SlackResponse<T> = T & { ok: boolean; error?: string };

export async function notifyRateLimit(userId: string, senderEmail: string, resumeAt: Date): Promise<void> {
  const connection = await prisma.slackConnection.findUnique({ where: { userId } });
  if (!connection) return;

  const headers = { Authorization: `Bearer ${connection.accessToken}` };
  try {
    const auth = await axios.post<SlackResponse<{ user_id: string }>>(
      "https://slack.com/api/auth.test",
      null,
      { headers }
    );
    if (!auth.data.ok) throw new Error(auth.data.error ?? "Slack auth failed");

    const dm = await axios.post<SlackResponse<{ channel: { id: string } }>>(
      "https://slack.com/api/conversations.open",
      { users: auth.data.user_id },
      { headers }
    );
    if (!dm.data.ok) throw new Error(dm.data.error ?? "Could not open Slack DM");

    const message = await axios.post<SlackResponse<Record<string, never>>>(
      "https://slack.com/api/chat.postMessage",
      {
        channel: dm.data.channel.id,
        text: `Email rate limit reached for sender ${senderEmail}. Jobs have been delayed until ${resumeAt.toISOString()}.`
      },
      { headers }
    );
    if (!message.data.ok) throw new Error(message.data.error ?? "Slack message failed");
  } catch (error) {
    // Slack is optional; a notification failure must not fail email delivery.
    console.error("Slack notification failed", error);
  }
}
