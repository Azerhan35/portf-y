"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = { ticker: string; created_at: string };

export function WatchlistClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [ticker, setTicker] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/watchlist")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setItems(data.watchlist ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not add ticker.");
        return;
      }

      setItems((prev) => [{ ticker: ticker.toUpperCase(), created_at: new Date().toISOString() }, ...prev]);
      setTicker("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(t: string) {
    setItems((prev) => prev.filter((i) => i.ticker !== t));
    await fetch(`/api/watchlist/${t}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value.toUpperCase())}
          placeholder="e.g. AAPL"
          maxLength={10}
          className="flex-1 rounded-[6px] border border-border-hairline bg-bg-surface px-3 py-2 font-mono text-sm uppercase placeholder:normal-case placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !ticker}
          className="rounded-[6px] bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim disabled:opacity-40"
        >
          {submitting ? "Adding..." : "Add"}
        </button>
      </form>
      {error && <p className="text-sm text-signal-negative">{error}</p>}

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : items.length === 0 ? (
        <p className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center text-sm text-text-muted">
          No tickers yet. Add one above to start receiving insider trade alerts.
        </p>
      ) : (
        <ul className="rounded-[6px] border border-border-hairline bg-bg-surface">
          {items.map((item) => (
            <li
              key={item.ticker}
              className="flex items-center justify-between border-b border-border-hairline px-4 py-3 last:border-0"
            >
              <Link href={`/ticker/${item.ticker}`} className="font-mono text-sm text-accent-gold hover:underline">
                {item.ticker}
              </Link>
              <button
                onClick={() => handleRemove(item.ticker)}
                className="text-xs text-text-muted hover:text-signal-negative"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
