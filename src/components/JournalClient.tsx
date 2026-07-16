"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { JournalTrade } from "@/types/database";
import { computePnl, computePnlPct } from "@/lib/journalAnalytics";
import { TradeFormDialog } from "@/components/TradeFormDialog";

export function JournalClient() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<JournalTrade | undefined>(undefined);

  function load() {
    fetch("/api/trades")
      .then((res) => res.json())
      .then((data) => {
        setTrades(data.trades ?? []);
        setLoading(false);
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    setTrades((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/trades/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-sm text-accent-gold hover:underline">
          ← View analytics
        </Link>
        <button
          onClick={() => {
            setEditing(undefined);
            setDialogOpen(true);
          }}
          className="rounded-full bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
        >
          + Log trade
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : trades.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center text-sm text-text-muted">
          No trades logged yet. Add your first one above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-border-hairline bg-bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border-hairline text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Exit</th>
                <th className="px-4 py-3">P&amp;L</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const pnl = computePnl(t);
                const pnlPct = computePnlPct(t);
                return (
                  <tr key={t.id} className="border-b border-border-hairline last:border-0">
                    <td className="px-4 py-3 font-mono font-medium text-accent-gold">{t.symbol}</td>
                    <td className="px-4 py-3 capitalize text-text-muted">{t.side}</td>
                    <td className="px-4 py-3 font-mono">{t.quantity}</td>
                    <td className="px-4 py-3 font-mono">${t.entry_price.toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono">
                      {t.exit_price != null ? `$${t.exit_price.toFixed(2)}` : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono ${
                        pnl == null ? "text-text-muted" : pnl >= 0 ? "text-signal-positive" : "text-signal-negative"
                      }`}
                    >
                      {pnl == null ? "Open" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)} (${pnlPct!.toFixed(1)}%)`}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted">{t.entered_at.slice(0, 10)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setEditing(t);
                          setDialogOpen(true);
                        }}
                        className="mr-3 text-xs text-text-muted hover:text-accent-gold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-xs text-text-muted hover:text-signal-negative"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialogOpen && (
        <TradeFormDialog trade={editing} onClose={() => setDialogOpen(false)} onSaved={load} />
      )}
    </div>
  );
}
