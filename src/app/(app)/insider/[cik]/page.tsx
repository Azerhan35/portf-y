import { createClient } from "@/lib/supabase/server";
import { InsiderAvatar } from "@/components/InsiderAvatar";
import { TradeRow } from "@/components/TradeRow";

export default async function InsiderPage({ params }: { params: Promise<{ cik: string }> }) {
  const { cik } = await params;

  const supabase = await createClient();
  const { data: trades } = await supabase
    .from("insider_trades")
    .select("*")
    .eq("cik", cik)
    .order("filing_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = trades ?? [];
  const name = rows[0]?.insider_name ?? "Unknown insider";
  const role = rows[0]?.insider_role ?? null;
  const tickers = Array.from(new Set(rows.map((t) => t.ticker)));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex items-center gap-4">
        <InsiderAvatar name={name} size={56} />
        <div>
          <h1 className="font-display text-xl font-medium tracking-tight sm:text-2xl">{name}</h1>
          <p className="text-sm text-text-muted">
            {role && <>{role} · </>}
            {tickers.length > 0 && (
              <span className="font-mono text-accent-gold">{tickers.join(", ")}</span>
            )}
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center text-text-muted">
          No filings found for this person in the current window.
        </div>
      ) : (
        <section className="rounded-[6px] border border-border-hairline bg-bg-surface">
          {rows.map((trade) => (
            <TradeRow key={trade.id} trade={trade} showTicker />
          ))}
        </section>
      )}
    </div>
  );
}
