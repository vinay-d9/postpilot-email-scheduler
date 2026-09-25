import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { ComposeModal } from "../components/ComposeModal";
import { EmailTable } from "../components/EmailTable";
import { EmptyState } from "../components/EmptyState";
import { StatusPill } from "../components/StatusPill";
import { api } from "../services/api";
import type { EmailRecord, SearchRecord, User } from "../types";

type Tab = "scheduled" | "sent";

function LoadingRows() {
  return <div className="space-y-3 rounded-2xl border border-ink/10 bg-white p-5 shadow-card">{[1, 2, 3, 4].map((row) => <div key={row} className="h-10 animate-pulse rounded-lg bg-ink/5" />)}</div>;
}

export function DashboardPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("scheduled");
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [slack, setSlack] = useState<{ connected: boolean; teamName: string | null } | null>(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchRecord[] | null>(null);

  async function loadEmails() {
    setLoading(true); setError("");
    try {
      const response = tab === "scheduled" ? await api.scheduled() : await api.sent();
      setEmails(response.emails);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not load emails"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadEmails(); }, [tab]);
  useEffect(() => { api.slackStatus().then(setSlack).catch(() => setSlack(null)); }, []);

  async function doSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!search.trim()) return setResults(null);
    setError("");
    try { setResults((await api.search(search)).emails); }
    catch (err) { setError(err instanceof Error ? err.message : "Search failed"); }
  }

  async function logout() {
    try { await api.logout(); } finally { navigate("/"); }
  }

  const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-ink/10 bg-canvas/85 px-5 py-4 backdrop-blur sm:px-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><a href="/dashboard" className="inline-flex items-center gap-2 text-lg font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-lime">P</span><span className="hidden sm:inline">PostPilot</span></a><div className="flex items-center gap-2 sm:gap-4"><a href={`${api.baseUrl}/admin/queues`} target="_blank" rel="noreferrer" className="hidden text-sm font-semibold text-ink/60 hover:text-ink md:inline">Queue board ↗</a><div className="flex items-center gap-2"><div className="hidden text-right sm:block"><p className="text-sm font-semibold leading-4">{user.name}</p><p className="mt-1 text-xs text-ink/50">{user.email}</p></div>{user.avatar ? <img className="h-9 w-9 rounded-full border border-ink/10 object-cover" src={user.avatar} alt="" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-bold text-lime">{initials}</span>}</div><Button variant="quiet" onClick={() => void logout()} className="!px-2.5 text-xs">Log out</Button></div></div></header>
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><section className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-sm font-semibold text-ink/45">Dashboard</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Your sending room</h1><p className="mt-2 text-ink/60">See what is queued, delivered, and ready for attention.</p></div><Button onClick={() => setComposeOpen(true)} className="gap-2"> <span className="text-lg leading-none">+</span> Compose new email</Button></section>
        <section className="mb-8 grid gap-4 lg:grid-cols-[1.15fr_.85fr]"><form onSubmit={doSearch} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-card"><label htmlFor="search" className="mb-2 block text-sm font-semibold">Search your emails</label><div className="flex gap-2"><input id="search" className="field !py-2" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Recipient, subject, sender, or status…" /><Button type="submit" className="!py-2">Search</Button>{results && <Button type="button" variant="secondary" onClick={() => { setResults(null); setSearch(""); }} className="!px-3 !py-2">Clear</Button>}</div></form><div className="rounded-2xl border border-ink/10 bg-ink p-5 text-white shadow-card"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white/65">Slack alerts</p><p className="mt-1 text-sm">{slack?.connected ? `Connected to ${slack.teamName ?? "your workspace"}` : "Get a message when a rate limit is reached."}</p></div>{slack?.connected ? <Button variant="secondary" onClick={() => void api.disconnectSlack().then(() => setSlack({ connected: false, teamName: null }))} className="!border-white/20 !bg-white/10 !py-2 !text-white hover:!bg-white/20">Disconnect</Button> : <a className="rounded-xl bg-lime px-3.5 py-2 text-sm font-bold text-ink transition hover:bg-lime/85" href={`${api.baseUrl}/api/slack/connect`}>Connect Slack</a>}</div></div></section>
        {notice && <div className="mb-6 flex items-center justify-between rounded-xl bg-mint px-4 py-3 text-sm font-medium"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        {error && <div className="mb-6 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss">×</button></div>}
        {results ? <section><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Search results</h2><span className="text-sm text-ink/50">{results.length} matches</span></div>{results.length ? <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-card"><div className="divide-y divide-ink/8">{results.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-sm"><div className="min-w-48 flex-1"><p className="font-semibold">{item.recipient}</p><p className="text-xs text-ink/50">from {item.sender}</p></div><p className="min-w-48 flex-1 text-ink/65">{item.subject}</p><StatusPill status={item.status} /></div>)}</div></div> : <EmptyState title="No matching emails" detail="Try a recipient, subject, sender, or status word." />}</section> : <section><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="rounded-xl bg-ink/5 p-1"><button onClick={() => setTab("scheduled")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "scheduled" ? "bg-white shadow-sm" : "text-ink/50 hover:text-ink"}`}>Scheduled</button><button onClick={() => setTab("sent")} className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "sent" ? "bg-white shadow-sm" : "text-ink/50 hover:text-ink"}`}>Sent</button></div><button onClick={() => void loadEmails()} className="text-sm font-semibold text-ink/55 hover:text-ink">Refresh</button></div>{loading ? <LoadingRows /> : <EmailTable emails={emails} mode={tab} />}</section>}
      </div>
      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} onScheduled={(count) => { setComposeOpen(false); setTab("scheduled"); setNotice(`${count} email${count === 1 ? " was" : "s were"} added to the durable queue.`); void loadEmails(); }} />}
    </main>
  );
}
