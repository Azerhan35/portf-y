import type { InsiderTrade } from "@/types/database";
import type { InsiderSummary } from "@/components/InsiderCard";

// insider_trades satırlarını kişi (cik, yoksa isim) bazında gruplar. Trades
// zaten filing_date/created_at'e göre azalan sırayla geldiği için her kişinin
// ilk karşılaşılan satırı onun en güncel işlemidir — bu da "günlük/aktif
// traderları öne çıkar" sıralamasının temelini oluşturur.
export function groupByInsider(trades: InsiderTrade[]): InsiderSummary[] {
  const byKey = new Map<
    string,
    { cik: string | null; name: string; role: string | null; trades: InsiderTrade[]; tickers: Set<string> }
  >();

  for (const trade of trades) {
    const key = trade.cik ?? trade.insider_name;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { cik: trade.cik, name: trade.insider_name, role: trade.insider_role, trades: [], tickers: new Set() };
      byKey.set(key, entry);
    }
    entry.trades.push(trade);
    entry.tickers.add(trade.ticker);
    if (!entry.role && trade.insider_role) entry.role = trade.insider_role;
  }

  return Array.from(byKey.values())
    .map((e) => ({
      cik: e.cik,
      name: e.name,
      role: e.role,
      tickers: Array.from(e.tickers),
      tradeCount: e.trades.length,
      latestTrade: e.trades[0],
    }))
    .sort((a, b) => {
      const dateDiff =
        new Date(b.latestTrade.filing_date).getTime() - new Date(a.latestTrade.filing_date).getTime();
      return dateDiff !== 0 ? dateDiff : b.tradeCount - a.tradeCount;
    });
}
