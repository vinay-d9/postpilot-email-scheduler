export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/20 bg-white/60 px-6 py-14 text-center">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-mint text-lg">✦</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink/55">{detail}</p>
    </div>
  );
}
