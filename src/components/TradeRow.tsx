import Link from "next/link";
import type { InsiderTrade } from "@/types/database";

export function TradeRow({ trade, showTicker = true }: { trade: InsiderTrade; showTicker?: boolean }) {
  const isBuy = trade.transaction_type === "buy";
  const isSell = trade.transaction_type === "sell";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-hairline px-5 py-4 last:border-0">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {showTicker && (
            <Link
              href={`/ticker/${trade.ticker}`}
              className="font-mono text-sm font-medium text-accent-gold hover:underline"
            >
              {trade.ticker}
            </Link>
          )}
          <span
            className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
              isBuy
                ? "bg-signal-positive/15 text-signal-positive"
                : isSell
                  ? "bg-signal-negative/15 text-signal-negative"
                  : "bg-accent-gold/15 text-accent-gold"
            }`}
          >
            {trade.transaction_type}
          </span>
        </div>
        <p className="text-sm text-text-primary">
          {trade.insider_name}
          {trade.insider_role && <span className="text-text-muted"> · {trade.insider_role}</span>}
        </p>
        <p className="text-xs text-text-muted">Filed {trade.filing_date}</p>
      </div>

      <div className="text-right font-mono text-sm">
        {trade.shares != null && <p>{trade.shares.toLocaleString()} sh</p>}
        {trade.price != null && <p className="text-text-muted">${trade.price.toFixed(2)}</p>}
        {trade.total_value != null && (
          <p className="text-text-muted">${trade.total_value.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
