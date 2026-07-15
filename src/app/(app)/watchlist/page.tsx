import { WatchlistClient } from "@/components/WatchlistClient";

export default function WatchlistPage() {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="font-display text-2xl font-medium tracking-tight">Watchlist</h1>
        <p className="mt-1 text-sm text-text-muted">
          Add a ticker to start tracking insider Form 4 filings. New tickers are backfilled
          within moments.
        </p>
      </section>
      <WatchlistClient />
    </div>
  );
}
