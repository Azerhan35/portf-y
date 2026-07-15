import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTopCryptoPrices } from "@/lib/prices/crypto";
import { TradeRow } from "@/components/TradeRow";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: watchlist } = await supabase
    .from("watchlists")
    .select("ticker")
    .eq("user_id", user.id);

  const tickers = (watchlist ?? []).map((w) => w.ticker);

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
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="font-display text-2xl font-medium tracking-tight">Your signal feed</h1>
        <p className="mt-1 text-sm text-text-muted">
          Insider trades for the {tickers.length} ticker{tickers.length === 1 ? "" : "s"} you&apos;re
          watching.
        </p>
      </section>

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
