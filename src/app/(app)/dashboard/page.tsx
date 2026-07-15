import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTopCryptoPrices } from "@/lib/prices/crypto";
import { TradeRow } from "@/components/TradeRow";
import { isPaidTier, FREE_TICKER_LIMIT, FREE_HISTORY_DAYS } from "@/lib/subscription";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: watchlist }, { data: profile }] = await Promise.all([
    supabase.from("watchlists").select("ticker").eq("user_id", user.id),
    supabase.from("profiles").select("subscription_status").eq("id", user.id).single(),
  ]);

  const tickers = (watchlist ?? []).map((w) => w.ticker);
  const isPaid = isPaidTier(profile?.subscription_status);

  const [{ data: trades }, crypto] = await Promise.all([
    tickers.length > 0
      ? supabase
          .from("insider_trades")
          .select("*")
          .in("ticker", tickers)
          .order("filing_date", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] }),
    getTopCryptoPrices().catch(() => []),
  ]);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section>
        <h1 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
          Your signal feed
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Insider trades for the {tickers.length} ticker{tickers.length === 1 ? "" : "s"} you&apos;re
          watching.
        </p>
      </section>

      {!isPaid && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[6px] border border-accent-gold/30 bg-accent-gold/5 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-text-muted">
            Free plan: up to {FREE_TICKER_LIMIT} tickers, last {FREE_HISTORY_DAYS} days of
            filings, no email alerts.
          </p>
          <Link
            href="/billing"
            className="shrink-0 rounded-[6px] bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
          >
            Upgrade
          </Link>
        </div>
      )}

      {tickers.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center">
          <p className="text-text-muted">You&apos;re not watching any tickers yet.</p>
          <Link href="/watchlist" className="mt-3 inline-block text-sm text-accent-gold underline">
            Build your watchlist
          </Link>
        </div>
      ) : (trades ?? []).length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center text-text-muted">
          No insider filings yet for your watchlist. New filings appear here automatically.
        </div>
      ) : (
        <section className="rounded-[6px] border border-border-hairline bg-bg-surface">
          {(trades ?? []).map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </section>
      )}

      {crypto.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-text-muted">Crypto market context</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {crypto.map((c) => (
              <div
                key={c.id}
                className="rounded-[6px] border border-border-hairline bg-bg-surface p-3"
              >
                <p className="text-xs text-text-muted uppercase">{c.symbol}</p>
                <p className="font-mono text-sm">
                  ${c.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p
                  className={`font-mono text-xs ${
                    (c.price_change_percentage_24h ?? 0) >= 0
                      ? "text-signal-positive"
                      : "text-signal-negative"
                  }`}
                >
                  {(c.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
                  {(c.price_change_percentage_24h ?? 0).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
