export function RouteLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-6 py-4">
      <div className="h-8 w-48 rounded-lg bg-goaliq-surface" />
      <div className="h-4 w-96 max-w-full rounded bg-goaliq-surface/80" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-goaliq-surface" />
        <div className="h-24 rounded-xl bg-goaliq-surface" />
        <div className="h-24 rounded-xl bg-goaliq-surface" />
      </div>
      <div className="h-64 rounded-2xl bg-goaliq-surface" />
    </div>
  );
}
