import { api } from "../services/api";

export function LoginPage() {
  return (
    <main className="relative grid min-h-screen overflow-hidden bg-canvas px-6 py-8 lg:grid-cols-2 lg:px-[8vw]">
      <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-lime/35 blur-3xl" />
      <div className="absolute bottom-[-8rem] right-[12%] h-96 w-96 rounded-full bg-mint blur-3xl" />
      <section className="relative z-10 flex flex-col justify-between py-4 lg:py-10">
        <div className="inline-flex items-center gap-2 text-lg font-bold tracking-tight"><span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-lime">P</span> PostPilot</div>
        <div className="max-w-xl py-16 lg:py-0"><p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-ink/45">Reliable outreach, quietly handled</p><h1 className="max-w-lg text-5xl font-semibold leading-[1.04] tracking-[-0.055em] sm:text-6xl">Schedule every email with confidence.</h1><p className="mt-6 max-w-md text-lg leading-8 text-ink/65">A small, dependable workspace for thoughtful campaigns—complete with durable queues, rate controls, and delivery visibility.</p></div>
        <p className="text-sm text-ink/45">Built for calm, considered sending.</p>
      </section>
      <section className="relative z-10 flex items-center justify-center lg:justify-end">
        <div className="w-full max-w-md rounded-[28px] border border-ink/10 bg-white/80 p-7 shadow-card backdrop-blur sm:p-9"><div className="mb-8"><p className="text-sm font-medium text-ink/55">Welcome to PostPilot</p><h2 className="mt-1 text-3xl font-semibold tracking-tight">Sign in to your workspace</h2></div><button onClick={() => { window.location.href = `${api.baseUrl}/api/auth/google`; }} className="flex w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-white px-4 py-3 font-semibold transition hover:bg-canvas"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#4285F4] text-[10px] font-bold text-white">G</span>Continue with Google</button><p className="mt-5 text-center text-xs leading-5 text-ink/45">We use Google only to identify your workspace and create your default sender.</p></div>
      </section>
    </main>
  );
}
