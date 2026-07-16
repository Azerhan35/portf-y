"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { JournalTrade } from "@/types/database";
import { computePnl, computePnlPct } from "@/lib/journalAnalytics";
import { TradeFormDialog } from "@/components/TradeFormDialog";
import { CsvImportDialog } from "@/components/CsvImportDialog";

type InsiderActivity = {
  ticker: string;
  filing_date: string;
  insider_name: string;
  transaction_type: string;
};

const CORRELATION_WINDOW_DAYS = 7;

function findInsiderMatch(trade: JournalTrade, activity: InsiderActivity[]): InsiderActivity | null {
  const tradeDate = new Date(trade.entered_at).getTime();
  const windowMs = CORRELATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const matches = activity.filter((a) => {
    if (a.ticker !== trade.symbol) return false;
    const filingDate = new Date(a.filing_date).getTime();
    return Math.abs(filingDate - tradeDate) <= windowMs;
  });

  return matches[0] ?? null;
}

export function JournalClient() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [insiderActivity, setInsiderActivity] = useState<InsiderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<JournalTrade | undefined>(undefined);

  function load() {
    fetch("/api/trades")
      .then((res) => res.json())
      .then((data) => {
        setTrades(data.trades ?? []);
        setLoading(false);
      });
    fetch("/api/journal/insider-activity")
      .then((res) => res.json())
      .then((data) => setInsiderActivity(data.activity ?? []))
      .catch(() => {});
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
        <div className="flex gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="rounded-full border border-border-hairline px-4 py-2 text-sm font-medium hover:border-accent-gold/50"
          >
            Import CSV
          </button>
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
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : trades.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center text-sm text-text-muted">
          No trades logged yet. Add your first one above.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[6px] border border-border-hairline bg-bg-surface">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border-hairline text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Exit</th>
                <th className="px-4 py-3">P&amp;L</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Insider activity</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const pnl = computePnl(t);
                const pnlPct = computePnlPct(t);
                const match = findInsiderMatch(t, insiderActivity);
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
                    <td className="px-4 py-3">
                      {match ? (
                        <Link
                          href={`/ticker/${t.symbol}`}
                          title={`${match.insider_name} — ${match.transaction_type} on ${match.filing_date}`}
                          className="inline-flex items-center gap-1 rounded-[4px] bg-accent-gold/15 px-2 py-1 text-xs text-accent-gold hover:underline"
                        >
                          🔍 Insider activity
                        </Link>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
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
      {importOpen && <CsvImportDialog onClose={() => setImportOpen(false)} onImported={load} />}
    </div>
  );
}
