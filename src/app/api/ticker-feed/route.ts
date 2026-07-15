import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Abonelere (RLS ile korunur) tüm izlenen tickerlar genelinde en güncel
// insider trade akışını döner — sinyal şeridi ve dashboard feed'i bunu kullanır.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  let query = supabase
    .from("insider_trades")
    .select("*")
    .order("filing_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (ticker) query = query.eq("ticker", ticker.toUpperCase());

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Could not load signal feed." }, { status: 500 });
  }

  return NextResponse.json({ trades: data });
}
