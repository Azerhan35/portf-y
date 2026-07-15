import Link from "next/link";
import { InsiderAvatar } from "@/components/InsiderAvatar";
import type { InsiderTrade } from "@/types/database";

export type InsiderSummary = {
  cik: string | null;
  name: string;
  role: string | null;
  tickers: string[];
  tradeCount: number;
  latestTrade: InsiderTrade;
};

export function InsiderCard({ insider }: { insider: InsiderSummary }) {
  const t = insider.latestTrade;
  const isBuy = t.transaction_type === "buy";
  const isSell = t.transaction_type === "sell";
  const href = insider.cik ? `/insider/${insider.cik}` : `/ticker/${t.ticker}`;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-border-hairline px-4 py-4 last:border-0 hover:bg-bg-surface-raised sm:px-5"
    >
      <InsiderAvatar name={insider.name} size={44} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-text-primary">{insider.name}</p>
          <span
            className={`shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
              isBuy
                ? "bg-signal-positive/15 text-signal-positive"
                : isSell
                  ? "bg-signal-negative/15 text-signal-negative"
                  : "bg-accent-gold/15 text-accent-gold"
            }`}
          >
            {t.transaction_type}
          </span>
        </div>
        <p className="truncate text-xs text-text-muted">
          {insider.role && <>{insider.role} · </>}
          <span className="font-mono text-accent-gold">{t.ticker}</span>
          {insider.tickers.length > 1 && ` +${insider.tickers.length - 1} more`}
        </p>
        <p className="text-xs text-text-muted">
          Filed {t.filing_date} · {insider.tradeCount} trade{insider.tradeCount === 1 ? "" : "s"}{" "}
          on file
        </p>
      </div>

      <div className="shrink-0 text-right font-mono text-sm">
        {t.shares != null && <p>{t.shares.toLocaleString()} sh</p>}
        {t.price != null && <p className="text-text-muted">${t.price.toFixed(2)}</p>}
      </div>
    </Link>
  );
}
