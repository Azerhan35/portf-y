import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InsiderTrade } from "@/types/database";
import { tickerToCik } from "./tickerMap";
import { getRecentForm4Filings, type Form4Filing } from "./submissions";
import { discoverRecentForm4Filings } from "./marketWide";
import { parseForm4 } from "./form4Parser";
import { sleep } from "./http";

async function insertParsedTrades(
  admin: SupabaseClient<Database>,
  filing: Form4Filing,
  fallbackTicker?: string
): Promise<InsiderTrade[]> {
  const trades = await parseForm4(filing);
  const inserted: InsiderTrade[] = [];

  for (const trade of trades) {
    const ticker = (trade.ticker || fallbackTicker || "").toUpperCase();
    // Bazı ihraççıların halka açık sembolü yoktur ve SEC XML'inde bu literal
    // olarak "NONE" yazılır (örn. borsada işlem görmeyen tahvil ihraççıları) —
    // ürünümüzün amacı hisse takibi olduğu için bunları atlıyoruz.
    if (!ticker || ticker === "NONE") continue;

    const { data, error } = await admin
      .from("insider_trades")
      .insert({
        ticker,
        cik: trade.cik,
        insider_name: trade.insiderName,
        insider_role: trade.insiderRole,
        transaction_type: trade.transactionType,
        shares: trade.shares,
        price: trade.price,
        total_value: trade.totalValue,
        filing_date: trade.filingDate,
        transaction_date: trade.transactionDate,
        source: trade.source,
        accession_number: trade.accessionNumber,
      })
      .select()
      .single();

    // Aynı satır yarış durumuyla (ör. eşzamanlı cron + manuel tetikleme) daha
    // önce eklenmiş olabilir; unique constraint çakışması sessizce atlanır.
    if (!error && data) inserted.push(data);
  }

  return inserted;
}

// Verilen ticker için henüz alınmamış Form 4 dosyalamalarını çeker, parse eder
// ve insider_trades'e ekler. Yeni eklenen satırları döner (bildirim tetiklemek için).
export async function ingestForm4ForTicker(
  admin: SupabaseClient<Database>,
  ticker: string
): Promise<InsiderTrade[]> {
  const cik = await tickerToCik(ticker);
  if (!cik) return [];

  const filings = await getRecentForm4Filings(cik);
  if (filings.length === 0) return [];

  const { data: existingRows } = await admin
    .from("insider_trades")
    .select("accession_number")
    .eq("ticker", ticker.toUpperCase())
    .eq("source", "form4");

  const ingestedAccessions = new Set(
    (existingRows ?? []).map((r) => r.accession_number.split("#")[0])
  );

  const newFilings = filings.filter((f) => !ingestedAccessions.has(f.accessionNumber));
  if (newFilings.length === 0) return [];

  const allInserted: InsiderTrade[] = [];

  for (const filing of newFilings) {
    allInserted.push(...(await insertParsedTrades(admin, filing, ticker)));
    // SEC EDGAR'ın hız sınırına karşı kibar davranmak için dosyalamalar arasında kısa bekleme.
    await sleep(150);
  }

  return allInserted;
}

// Piyasa genelinde (watchlist'ten bağımsız) en güncel Form 4 dosyalamalarını
// keşfeder — "büyük oyuncular" ana ekranını besleyen kaynak budur. Belirli bir
// ticker'a bağlı değildir; ticker her dosyalamanın kendi XML'inden okunur.
export async function ingestMarketWideForm4(
  admin: SupabaseClient<Database>,
  maxResults = 150
): Promise<InsiderTrade[]> {
  const filings = await discoverRecentForm4Filings(maxResults);
  if (filings.length === 0) return [];

  // Son birkaç günün zaten alınmış accession numaralarını çekip atlıyoruz —
  // keşif penceresi zaten yalnızca son 2 günü kapsıyor (bkz. marketWide.ts).
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 5);

  const { data: existingRows } = await admin
    .from("insider_trades")
    .select("accession_number")
    .eq("source", "form4")
    .gte("filing_date", cutoff.toISOString().slice(0, 10));

  const ingestedAccessions = new Set(
    (existingRows ?? []).map((r) => r.accession_number.split("#")[0])
  );

  const newFilings = filings.filter((f) => !ingestedAccessions.has(f.accessionNumber));
  const allInserted: InsiderTrade[] = [];

  for (const filing of newFilings) {
    try {
      allInserted.push(...(await insertParsedTrades(admin, filing)));
    } catch (err) {
      console.error(`market-wide ingest failed for ${filing.accessionNumber}`, err);
    }
    await sleep(150);
  }

  return allInserted;
}
