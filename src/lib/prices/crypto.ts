import "server-only";

export type CryptoQuote = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number | null;
};

const MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets" +
  "?vs_currency=usd&order=market_cap_desc&per_page=10&page=1" +
  "&sparkline=false&price_change_percentage=24h";

const CACHE_TTL_MS = 45_000;
let cache: { data: CryptoQuote[]; fetchedAt: number } | null = null;

// Sinyal ürününün çekirdeği hisse senedi/insider verisi, ama dashboard'da
// ek pazar bağlamı olarak en büyük 10 kripto paranın canlı fiyatı da gösterilir.
export async function getTopCryptoPrices(): Promise<CryptoQuote[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(MARKETS_URL, {
    headers: { accept: "application/json" },
    next: { revalidate: 45 },
  });

  if (!res.ok) {
    if (cache) return cache.data;
    throw new Error(`coingecko_fetch_failed_${res.status}`);
  }

  const data = await res.json();
  cache = { data, fetchedAt: Date.now() };
  return data;
}
