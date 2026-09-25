import type { EmailRecord, SearchRecord, User } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "Request failed");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  baseUrl: API_URL,
  me: () => request<{ user: User }>("/api/auth/me"),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  scheduled: () => request<{ emails: EmailRecord[] }>("/api/emails/scheduled"),
  sent: () => request<{ emails: EmailRecord[] }>("/api/emails/sent"),
  search: (query: string) => request<{ emails: SearchRecord[] }>(`/api/emails/search?q=${encodeURIComponent(query)}`),
  schedule: (data: { subject: string; body: string; recipients: string[]; startTime: string; delayBetweenEmails: number; hourlyLimit: number }) =>
    request<{ scheduledCount: number; effectiveDelayBetweenEmails: number; hourlyLimit: number }>("/api/emails/schedule", { method: "POST", body: JSON.stringify(data) }),
  slackStatus: () => request<{ connected: boolean; teamName: string | null }>("/api/slack/status"),
  disconnectSlack: () => request<void>("/api/slack/disconnect", { method: "POST" })
};
