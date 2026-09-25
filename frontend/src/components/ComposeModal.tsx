import { useRef, useState } from "react";
import { api } from "../services/api";
import { Button } from "./Button";

type Props = { onClose: () => void; onScheduled: (count: number) => void };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialStartTime() {
  const date = new Date(Date.now() + 60_000);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ComposeModal({ onClose, onScheduled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [invalidCount, setInvalidCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [startTime, setStartTime] = useState(initialStartTime);
  const [delay, setDelay] = useState(2000);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function readLeads(file?: File) {
    if (!file) return;
    setError("");
    const text = await file.text();
    const candidates = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    const valid = [...new Set(candidates.map((candidate) => candidate.toLowerCase()).filter((candidate) => emailPattern.test(candidate)))];
    setRecipients(valid);
    setInvalidCount(Math.max(0, candidates.length - valid.length));
    setFileName(file.name);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!recipients.length) return setError("Upload a CSV or text file with at least one valid email address.");
    setSaving(true); setError("");
    try {
      const result = await api.schedule({ subject, body, recipients, startTime: new Date(startTime).toISOString(), delayBetweenEmails: delay, hourlyLimit });
      onScheduled(result.scheduledCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule campaign");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-ink/30 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Compose campaign">
      <form onSubmit={submit} className="mx-auto max-w-3xl rounded-[24px] bg-canvas p-5 shadow-2xl sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-ink/45">New campaign</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">Compose an email</h2></div><Button type="button" variant="quiet" aria-label="Close" onClick={onClose} className="!px-2 text-xl">×</Button></div>
        <div className="grid gap-5 md:grid-cols-[1.05fr_.95fr]">
          <div className="space-y-5">
            <div><label className="label" htmlFor="subject">Subject</label><input id="subject" required maxLength={255} className="field" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="A thoughtful subject line" /></div>
            <div><label className="label" htmlFor="body">Email body</label><textarea id="body" required className="field min-h-48 resize-y" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write your message…" /></div>
          </div>
          <div className="space-y-5">
            <div><label className="label">Recipient file</label><input ref={inputRef} className="hidden" type="file" accept=".csv,.txt,text/csv,text/plain" onChange={(event) => void readLeads(event.target.files?.[0])} /><button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-ink/25 bg-white px-4 text-center transition hover:border-ink hover:bg-mint/30"><span className="text-2xl">↑</span><span className="mt-2 text-sm font-semibold">Upload CSV or text file</span><span className="mt-1 text-xs text-ink/50">One or more email addresses</span></button>{fileName && <p className="mt-2 text-xs text-ink/55">{fileName} · <b className="text-ink">{recipients.length} email addresses detected</b>{invalidCount ? ` · ${invalidCount} ignored` : ""}</p>}</div>
            <div><label className="label" htmlFor="start">Start time</label><input id="start" className="field" required type="datetime-local" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="label" htmlFor="delay">Delay (ms)</label><input id="delay" className="field" required min="0" type="number" value={delay} onChange={(event) => setDelay(Number(event.target.value))} /></div><div><label className="label" htmlFor="limit">Hourly limit</label><input id="limit" className="field" required min="1" type="number" value={hourlyLimit} onChange={(event) => setHourlyLimit(Number(event.target.value))} /></div></div>
            <p className="rounded-xl bg-mint/65 p-3 text-xs leading-5 text-ink/70">The server enforces its configured minimum delay and maximum hourly limit, even if a higher value is entered here.</p>
          </div>
        </div>
        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        <div className="mt-7 flex flex-col-reverse justify-end gap-3 sm:flex-row"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Scheduling…" : `Schedule ${recipients.length || ""} email${recipients.length === 1 ? "" : "s"}`}</Button></div>
      </form>
    </div>
  );
}
