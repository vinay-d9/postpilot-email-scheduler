import { EmptyState } from "./EmptyState";
import { StatusPill } from "./StatusPill";
import type { EmailRecord } from "../types";

const format = (value?: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export function EmailTable({ emails, mode }: { emails: EmailRecord[]; mode: "scheduled" | "sent" }) {
  if (!emails.length) {
    return <EmptyState title={mode === "scheduled" ? "Nothing is scheduled" : "No deliveries yet"} detail={mode === "scheduled" ? "Compose a campaign to see its deliveries here." : "Sent and failed emails will appear here as your worker processes them."} />;
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="border-b border-ink/10 bg-ink/[0.025] text-xs font-semibold uppercase tracking-wider text-ink/45">
            <tr><th className="px-5 py-4">Recipient</th><th className="px-5 py-4">Subject</th><th className="px-5 py-4">{mode === "scheduled" ? "Scheduled for" : "Delivered"}</th><th className="px-5 py-4">Status</th><th className="px-5 py-4"></th></tr>
          </thead>
          <tbody className="divide-y divide-ink/8">
            {emails.map((email) => <tr key={email.id} className="hover:bg-canvas/70">
              <td className="px-5 py-4 font-medium">{email.recipient}</td>
              <td className="max-w-[260px] truncate px-5 py-4 text-ink/70">{email.subject}</td>
              <td className="whitespace-nowrap px-5 py-4 text-ink/55">{format(mode === "scheduled" ? email.scheduledAt : email.sentAt ?? email.failedAt)}</td>
              <td className="px-5 py-4"><StatusPill status={email.status} /></td>
              <td className="px-5 py-4 text-right">{email.previewUrl && <a className="text-xs font-semibold text-ink underline decoration-lime decoration-2 underline-offset-4" href={email.previewUrl} target="_blank" rel="noreferrer">Preview</a>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
