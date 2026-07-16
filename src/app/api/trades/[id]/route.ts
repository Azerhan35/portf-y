import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { JournalTrade } from "@/types/database";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const b = (body ?? {}) as Record<string, unknown>;

  const update: Partial<JournalTrade> = {};
  if (typeof b.symbol === "string") update.symbol = b.symbol.trim().toUpperCase();
  if (b.side === "long" || b.side === "short") update.side = b.side;
  if (b.quantity != null) update.quantity = Number(b.quantity);
  if (b.entryPrice != null) update.entry_price = Number(b.entryPrice);
  if ("exitPrice" in b) update.exit_price = b.exitPrice === "" || b.exitPrice == null ? null : Number(b.exitPrice);
  if (b.fees != null) update.fees = Number(b.fees);
  if (typeof b.enteredAt === "string") update.entered_at = b.enteredAt;
  if ("exitedAt" in b) update.exited_at = typeof b.exitedAt === "string" && b.exitedAt ? b.exitedAt : null;
  if (Array.isArray(b.tags)) {
    update.tags = b.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
  }
  if ("notes" in b) update.notes = typeof b.notes === "string" && b.notes.trim() ? b.notes.trim() : null;

  const { data, error } = await supabase
    .from("trades")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not update trade." }, { status: 400 });
  }

  return NextResponse.json({ trade: data });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { error } = await supabase.from("trades").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not delete trade." }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
