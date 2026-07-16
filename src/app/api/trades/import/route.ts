import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPaidTier, FREE_TRADE_LIMIT } from "@/lib/subscription";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const trades = Array.isArray(body?.trades) ? body.trades : [];

  if (trades.length === 0) {
    return NextResponse.json({ error: "No trades to import." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  let allowed = trades.length;
  if (!isPaidTier(profile?.subscription_status)) {
    const { count } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    const remaining = Math.max(0, FREE_TRADE_LIMIT - (count ?? 0));
    allowed = Math.min(trades.length, remaining);

    if (allowed === 0) {
      return NextResponse.json(
        { error: `Free plan is limited to ${FREE_TRADE_LIMIT} logged trades. Upgrade to import more.` },
        { status: 403 }
      );
    }
  }

  const rowsToInsert = trades.slice(0, allowed).map((t: Record<string, unknown>) => ({
    user_id: user.id,
    symbol: String(t.symbol).toUpperCase(),
    side: t.side === "short" ? "short" : "long",
    quantity: Number(t.quantity),
    entry_price: Number(t.entryPrice),
    exit_price: t.exitPrice != null ? Number(t.exitPrice) : null,
    fees: t.fees != null ? Number(t.fees) : 0,
    entered_at: t.enteredAt,
    exited_at: t.exitedAt ?? null,
    tags: Array.isArray(t.tags) ? t.tags : [],
    notes: t.notes ?? null,
  }));

  const { data, error } = await supabase.from("trades").insert(rowsToInsert).select("id");

  if (error) {
    return NextResponse.json({ error: "Could not import trades." }, { status: 400 });
  }

  return NextResponse.json({
    imported: data?.length ?? 0,
    skipped: trades.length - allowed,
  });
}
