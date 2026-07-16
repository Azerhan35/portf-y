import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPaidTier, FREE_TRADE_LIMIT } from "@/lib/subscription";
import type { TradeSide } from "@/types/database";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("entered_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load trades." }, { status: 500 });
  }

  return NextResponse.json({ trades: data });
}

function parseBody(body: unknown) {
  const b = body as Record<string, unknown>;
  const symbol = typeof b?.symbol === "string" ? b.symbol.trim().toUpperCase() : "";
  const side: TradeSide | null = b?.side === "long" || b?.side === "short" ? b.side : null;
  const quantity = Number(b?.quantity);
  const entryPrice = Number(b?.entryPrice);
  const exitPrice = b?.exitPrice != null && b.exitPrice !== "" ? Number(b.exitPrice) : null;
  const fees = b?.fees != null && b.fees !== "" ? Number(b.fees) : 0;
  const enteredAt = typeof b?.enteredAt === "string" ? b.enteredAt : "";
  const exitedAt = typeof b?.exitedAt === "string" && b.exitedAt ? b.exitedAt : null;
  const tags = Array.isArray(b?.tags)
    ? b.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim())
    : [];
  const notes = typeof b?.notes === "string" && b.notes.trim() ? b.notes.trim() : null;

  return { symbol, side, quantity, entryPrice, exitPrice, fees, enteredAt, exitedAt, tags, notes };
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
  const { symbol, side, quantity, entryPrice, exitPrice, fees, enteredAt, exitedAt, tags, notes } =
    parseBody(body);

  if (!symbol || !side || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Invalid symbol, side, or quantity." }, { status: 400 });
  }
  if (!Number.isFinite(entryPrice) || entryPrice <= 0) {
    return NextResponse.json({ error: "Invalid entry price." }, { status: 400 });
  }
  if (!enteredAt) {
    return NextResponse.json({ error: "Entry date is required." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (!isPaidTier(profile?.subscription_status)) {
    const { count } = await supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= FREE_TRADE_LIMIT) {
      return NextResponse.json(
        { error: `Free plan is limited to ${FREE_TRADE_LIMIT} logged trades. Upgrade to log more.` },
        { status: 403 }
      );
    }
  }

  const { data, error } = await supabase
    .from("trades")
    .insert({
      user_id: user.id,
      symbol,
      side,
      quantity,
      entry_price: entryPrice,
      exit_price: exitPrice,
      fees,
      entered_at: enteredAt,
      exited_at: exitedAt,
      tags,
      notes,
    })
    .select()
    .single();

  if (error) {
    const message = error.message.includes("row-level security")
      ? `Free plan is limited to ${FREE_TRADE_LIMIT} logged trades. Upgrade to log more.`
      : "Could not save trade.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ trade: data });
}
