export default function AppLoading() {
  return (
    <main className="mx-auto w-full max-w-[1680px] px-3 py-8 sm:px-4">
      <div className="grid gap-4">
        <div className="h-16 animate-pulse rounded-2xl border border-ink-100 bg-white/80" />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="h-44 animate-pulse rounded-2xl border border-ink-100 bg-white/80" />
            <div className="h-44 animate-pulse rounded-2xl border border-ink-100 bg-white/80" />
          </div>
          <div className="h-72 animate-pulse rounded-2xl border border-ink-100 bg-white/80" />
        </div>
      </div>
    </main>
  );
}
