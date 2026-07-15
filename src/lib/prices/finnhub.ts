import "server-only";

export type StockQuote = {
  ticker: string;
  price: number;
  changePct: number;
};

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { data: StockQuote; fetchedAt: number }>();

// Finnhub ücretsiz katmanı (60 istek/dk) — bir ticker sayfası açıldığında
// güncel fiyat/24s değişim bağlamı göstermek için kullanılır.
export async function getStockQuote(ticker: string): Promise<StockQuote | null> {
  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${apiKey}`,
    { next: { revalidate: 30 } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  // Finnhub bilinmeyen sembollerde tüm alanları 0 döner.
  if (!data || data.c === 0) return null;

  const quote: StockQuote = {
    ticker,
    price: data.c,
    changePct: data.dp ?? 0,
  };

  cache.set(ticker, { data: quote, fetchedAt: Date.now() });
  return quote;
}
