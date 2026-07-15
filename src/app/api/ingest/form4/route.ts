import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestForm4ForTicker } from "@/lib/sec/ingest";
import { sendNewTradeNotifications } from "@/lib/email/notify";
import type { InsiderTrade } from "@/types/database";

// Vercel Cron ile periyodik olarak (bkz. vercel.json) tüm izlenen tickerlar
// için yeni Form 4 dosyalamalarını çeker ve izleyen kullanıcılara bildirim gönderir.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: rows, error } = await admin.from("watchlists").select("ticker");

  if (error) {
    return NextResponse.json({ error: "Could not read watchlists." }, { status: 500 });
  }

  const tickers = Array.from(new Set((rows ?? []).map((r) => r.ticker)));
  const allNewTrades: InsiderTrade[] = [];

  for (const ticker of tickers) {
    try {
      const inserted = await ingestForm4ForTicker(admin, ticker);
      allNewTrades.push(...inserted);
    } catch (err) {
      console.error(`form4 ingest failed for ${ticker}`, err);
    }
  }

  await sendNewTradeNotifications(admin, allNewTrades);

  return NextResponse.json({ tickers: tickers.length, newTrades: allNewTrades.length });
}
