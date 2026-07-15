import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InsiderTrade } from "@/types/database";
import { tickerToCik } from "./tickerMap";
import { getRecentForm4Filings } from "./submissions";
import { parseForm4 } from "./form4Parser";
import { sleep } from "./http";

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
    const trades = await parseForm4(filing);

    for (const trade of trades) {
      const { data, error } = await admin
        .from("insider_trades")
        .insert({
          ticker: (trade.ticker || ticker).toUpperCase(),
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
      if (!error && data) allInserted.push(data);
    }

    // SEC EDGAR'ın hız sınırına karşı kibar davranmak için dosyalamalar arasında kısa bekleme.
    await sleep(150);
  }

  return allInserted;
}
