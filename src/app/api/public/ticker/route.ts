import { NextResponse } from "next/server";
import { getStockQuote } from "@/lib/prices/finnhub";
import { getTopCryptoPrices } from "@/lib/prices/crypto";

// Herkese açık, oturum gerektirmeyen uç nokta — yalnızca landing sayfasındaki
// canlı borsa şeridi için. Gerçek fiyat verisi döner (uydurma değil), ama
// insider/watchlist gibi abonelik gerektiren hiçbir veriye dokunmaz.
const TICKERS = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "SPY", "QQQ"];

export async function GET() {
  const [quotes, crypto] = await Promise.all([
    Promise.all(TICKERS.map((t) => getStockQuote(t))),
    getTopCryptoPrices().catch(() => []),
  ]);

  const stocks = quotes
    .map((q, i) => (q ? { symbol: TICKERS[i], price: q.price, changePct: q.changePct } : null))
    .filter((q): q is { symbol: string; price: number; changePct: number } => q !== null);

  const cryptos = crypto.slice(0, 4).map((c) => ({
    symbol: c.symbol.toUpperCase(),
    price: c.current_price,
    changePct: c.price_change_percentage_24h ?? 0,
  }));

  return NextResponse.json(
    { items: [...stocks, ...cryptos] },
    { headers: { "Cache-Control": "public, max-age=20, stale-while-revalidate=40" } }
  );
}
