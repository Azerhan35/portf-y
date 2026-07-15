"use client";

import { useEffect, useState } from "react";

type TickerItem = { symbol: string; price: number; changePct: number };

// Landing sayfasının en üstünde akan, gerçek (uydurma olmayan) fiyatlarla
// beslenen borsa şeridi — oturum gerektirmez, /api/public/ticker'dan gelir.
export function LandingTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    function load() {
      fetch("/api/public/ticker")
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled) setItems(data.items ?? []);
        })
        .catch(() => {});
    }

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (items.length === 0) return null;

  const entries = [...items, ...items, ...items];

  return (
    <div className="relative z-10 overflow-hidden border-b border-white/10 bg-black/40 py-2 backdrop-blur-sm">
      <div className="flex w-max animate-ticker whitespace-nowrap font-mono text-xs">
        {entries.map((item, i) => {
          const isUp = item.changePct >= 0;
          return (
            <span key={`${item.symbol}-${i}`} className="mx-5 flex items-center gap-2 text-white/70">
              <span className="font-medium text-white/90">{item.symbol}</span>
              <span>${item.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className={isUp ? "text-signal-positive" : "text-signal-negative"}>
                {isUp ? "▲" : "▼"} {Math.abs(item.changePct).toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
