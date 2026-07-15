import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestForm4ForTicker } from "@/lib/sec/ingest";
import { isPaidTier, FREE_TICKER_LIMIT } from "@/lib/subscription";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("watchlists")
    .select("ticker, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load watchlist." }, { status: 500 });
  }

  return NextResponse.json({ watchlist: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ticker = typeof body?.ticker === "string" ? body.ticker.trim().toUpperCase() : "";

  if (!/^[A-Z.]{1,10}$/.test(ticker)) {
    return NextResponse.json({ error: "Invalid ticker symbol." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!isPaidTier(profile?.subscription_status)) {
    const { count } = await supabase
      .from("watchlists")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= FREE_TICKER_LIMIT) {
      return NextResponse.json(
        {
          error: `Free plan is limited to ${FREE_TICKER_LIMIT} tickers. Upgrade to add more.`,
        },
        { status: 403 }
      );
    }
  }

  const { error } = await supabase.from("watchlists").insert({ user_id: user.id, ticker });

  if (error) {
    const message = error.message.includes("duplicate")
      ? "Already on your watchlist."
      : error.message.includes("row-level security")
        ? `Free plan is limited to ${FREE_TICKER_LIMIT} tickers. Upgrade to add more.`
        : "Could not add ticker.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // İlk eklemede o ticker için hemen ingest tetiklenir ki kullanıcı watchlist'e
  // eklediği anda veriyi görsün; periyodik cron bundan sonra taze veriyi
  // otomatik çekmeye devam eder. Serverless fonksiyon yanıt sonrası donabileceği
  // için burada bilerek await ediliyor (fire-and-forget güvenilir değil).
  try {
    await ingestForm4ForTicker(createAdminClient(), ticker);
  } catch (err) {
    console.error(`initial ingest failed for ${ticker}`, err);
  }

  return NextResponse.json({ success: true });
}
