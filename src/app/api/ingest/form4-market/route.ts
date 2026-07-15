import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestMarketWideForm4 } from "@/lib/sec/ingest";

// Vercel Cron ile sık aralıklarla (bkz. vercel.json) çağrılır. Watchlist'ten
// bağımsız olarak piyasa genelinde en güncel Form 4 dosyalamalarını çeker —
// dashboard'daki "büyük oyuncular" akışının canlı kalmasını sağlayan uç nokta budur.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();
  const inserted = await ingestMarketWideForm4(admin, 150);

  return NextResponse.json({ newTrades: inserted.length });
}
