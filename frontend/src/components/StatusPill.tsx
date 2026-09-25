import type { EmailStatus } from "../types";

const styles: Record<EmailStatus, string> = {
  SCHEDULED: "bg-amber-100 text-amber-800",
  PROCESSING: "bg-blue-100 text-blue-800",
  SENT: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800"
};

export function StatusPill({ status }: { status: EmailStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ${styles[status]}`}>{status.toLowerCase()}</span>;
}
