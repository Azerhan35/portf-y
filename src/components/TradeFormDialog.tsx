"use client";

import { useState } from "react";
import type { JournalTrade, TradeSide } from "@/types/database";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TradeFormDialog({
  trade,
  onClose,
  onSaved,
}: {
  trade?: JournalTrade;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [symbol, setSymbol] = useState(trade?.symbol ?? "");
  const [side, setSide] = useState<TradeSide>(trade?.side ?? "long");
  const [quantity, setQuantity] = useState(trade ? String(trade.quantity) : "");
  const [entryPrice, setEntryPrice] = useState(trade ? String(trade.entry_price) : "");
  const [exitPrice, setExitPrice] = useState(trade?.exit_price != null ? String(trade.exit_price) : "");
  const [fees, setFees] = useState(trade ? String(trade.fees) : "0");
  const [enteredAt, setEnteredAt] = useState(toLocalInput(trade?.entered_at ?? null));
  const [exitedAt, setExitedAt] = useState(toLocalInput(trade?.exited_at ?? null));
  const [tags, setTags] = useState(trade?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(trade?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      symbol,
      side,
      quantity: Number(quantity),
      entryPrice: Number(entryPrice),
      exitPrice: exitPrice === "" ? null : Number(exitPrice),
      fees: Number(fees) || 0,
      enteredAt: enteredAt ? new Date(enteredAt).toISOString() : "",
      exitedAt: exitedAt ? new Date(exitedAt).toISOString() : null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes,
    };

    try {
      const res = await fetch(trade ? `/api/trades/${trade.id}` : "/api/trades", {
        method: trade ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save trade.");
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-bg-surface p-5 sm:rounded-[6px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg">{trade ? "Edit trade" : "Log a trade"}</h2>
          <button onClick={onClose} className="text-text-muted">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol (e.g. AAPL)"
              required
              className="flex-1 rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 font-mono text-sm uppercase placeholder:normal-case placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
            />
            <div className="flex rounded-[6px] bg-bg-primary p-1">
              {(["long", "short"] as TradeSide[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setSide(s)}
                  className={`rounded-[4px] px-3 py-1.5 text-sm font-medium capitalize ${
                    side === s ? "bg-bg-surface-raised text-accent-gold" : "text-text-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Quantity</label>
              <input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 font-mono text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Fees</label>
              <input
                type="number"
                step="any"
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 font-mono text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Entry price</label>
              <input
                type="number"
                step="any"
                min="0"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                required
                className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 font-mono text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Exit price (optional)</label>
              <input
                type="number"
                step="any"
                min="0"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 font-mono text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Entered at</label>
              <input
                type="datetime-local"
                value={enteredAt}
                onChange={(e) => setEnteredAt(e.target.value)}
                required
                className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text-muted">Exited at (optional)</label>
              <input
                type="datetime-local"
                value={exitedAt}
                onChange={(e) => setExitedAt(e.target.value)}
                className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 text-sm focus:border-accent-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="breakout, earnings, scalp"
              className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 text-sm placeholder:text-text-muted focus:border-accent-gold focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-text-muted">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-[6px] border border-border-hairline bg-bg-primary px-3 py-2 text-sm focus:border-accent-gold focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-signal-negative">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-[6px] bg-accent-gold px-3 py-2.5 text-sm font-medium text-bg-primary disabled:opacity-40"
          >
            {submitting ? "Saving..." : trade ? "Save changes" : "Log trade"}
          </button>
        </form>
      </div>
    </div>
  );
}
