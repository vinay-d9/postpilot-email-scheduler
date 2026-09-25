export type User = { id: string; name: string; email: string; avatar: string | null };

export type EmailStatus = "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED";

export type EmailRecord = {
  id: string;
  recipient: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string | null;
  failedAt?: string | null;
  errorMessage?: string | null;
  previewUrl?: string | null;
};

export type SearchRecord = {
  id: string;
  recipient: string;
  sender: string;
  subject: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string;
};
