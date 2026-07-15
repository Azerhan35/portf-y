import "server-only";
import { secFetch } from "./http";

const TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type TickerEntry = { cik_str: number; ticker: string; title: string };

let cache: { map: Map<string, string>; fetchedAt: number } | null = null;

// SEC'in resmi ticker->CIK eşleme dosyasını çeker ve 24 saat cache'ler.
// CIK'ler submissions endpoint'i için 10 haneli, baştan sıfırlarla dolgulu olmalı.
export async function getTickerToCikMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.map;
  }

  const res = await secFetch(TICKERS_URL);
  const data: Record<string, TickerEntry> = await res.json();

  const map = new Map<string, string>();
  for (const entry of Object.values(data)) {
    map.set(entry.ticker.toUpperCase(), String(entry.cik_str).padStart(10, "0"));
  }

  cache = { map, fetchedAt: now };
  return map;
}

export async function tickerToCik(ticker: string): Promise<string | null> {
  const map = await getTickerToCikMap();
  return map.get(ticker.toUpperCase()) ?? null;
}
