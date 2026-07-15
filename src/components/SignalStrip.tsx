"use client";

import { useEffect, useState } from "react";
import type { InsiderTrade } from "@/types/database";

function formatEntry(trade: InsiderTrade): string {
  const verb = trade.transaction_type === "buy" ? "BUY" : trade.transaction_type === "sell" ? "SELL" : "FILE";
  const shares = trade.shares ? trade.shares.toLocaleString() : "—";
  const price = trade.price ? `$${trade.price.toFixed(2)}` : "";
  return `${trade.ticker} · ${verb} · ${trade.insider_name} · ${shares} sh ${price}`.trim();
}

// Ürünün imza öğesi: Bloomberg'in haber ticker'ına benzer ama sakin, altın
// tonunda, ince bir çizgiyle akan canlı sinyal bandı.
export function SignalStrip() {
  const [trades, setTrades] = useState<InsiderTrade[]>([]);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetch("/api/ticker-feed?limit=20")
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setTrades(data.trades ?? []);
        })
        .catch(() => {});
    }

    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (trades.length === 0) return null;

  const entries = [...trades, ...trades];

  return (
    <div className="overflow-hidden border-b border-accent-gold/20 bg-bg-surface py-2">
      <div className="flex w-max animate-ticker whitespace-nowrap font-mono text-xs text-text-muted">
        {entries.map((trade, i) => (
          <span key={`${trade.id}-${i}`} className="mx-6 flex items-center gap-2">
            <span
              className={
                trade.transaction_type === "buy"
                  ? "text-signal-positive"
                  : trade.transaction_type === "sell"
                    ? "text-signal-negative"
                    : "text-accent-gold"
              }
            >
              ●
            </span>
            {formatEntry(trade)}
          </span>
        ))}
      </div>
    </div>
  );
}
