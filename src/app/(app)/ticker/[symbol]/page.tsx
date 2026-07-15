import { createClient } from "@/lib/supabase/server";
import { getStockQuote } from "@/lib/prices/finnhub";
import { TradeRow } from "@/components/TradeRow";

export default async function TickerPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const ticker = symbol.toUpperCase();

  const supabase = await createClient();
  const [{ data: trades }, quote] = await Promise.all([
    supabase
      .from("insider_trades")
      .select("*")
      .eq("ticker", ticker)
      .order("filing_date", { ascending: false })
      .limit(50),
    getStockQuote(ticker).catch(() => null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-baseline justify-between">
        <h1 className="font-mono text-2xl font-medium tracking-tight">{ticker}</h1>
        {quote && (
          <div className="text-right font-mono">
            <p className="text-lg">${quote.price.toFixed(2)}</p>
            <p className={quote.changePct >= 0 ? "text-signal-positive" : "text-signal-negative"}>
              {quote.changePct >= 0 ? "+" : ""}
              {quote.changePct.toFixed(2)}%
            </p>
          </div>
        )}
      </section>

      {(trades ?? []).length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center text-text-muted">
          No insider filings found yet for {ticker}.
        </div>
      ) : (
        <section className="rounded-[6px] border border-border-hairline bg-bg-surface">
          {(trades ?? []).map((trade) => (
            <TradeRow key={trade.id} trade={trade} showTicker={false} />
          ))}
        </section>
      )}
    </div>
  );
}
