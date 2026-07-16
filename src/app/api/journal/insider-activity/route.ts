import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Kullanıcının journal'ındaki sembollerde, o sembollerin kendi insider_trades
// geçmişiyle çakışma olup olmadığını kontrol etmek için ham veriyi döner —
// asıl "bu trade'i açtığın hafta içeriden biri de almıştı" eşleştirmesi
// istemci tarafında (JournalClient) her trade'in kendi tarihine göre yapılır.
// insider_trades zaten RLS ile korunuyor (ücretsiz katman yalnızca son 3 günü
// görür), bu yüzden burada ekstra bir yetki kontrolüne gerek yok.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data: journalTrades } = await supabase
    .from("trades")
    .select("symbol")
    .eq("user_id", user.id);

  const symbols = Array.from(new Set((journalTrades ?? []).map((t) => t.symbol)));
  if (symbols.length === 0) {
    return NextResponse.json({ activity: [] });
  }

  const { data: activity, error } = await supabase
    .from("insider_trades")
    .select("ticker, filing_date, insider_name, transaction_type")
    .in("ticker", symbols)
    .order("filing_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load insider activity." }, { status: 500 });
  }

  return NextResponse.json({ activity: activity ?? [] });
}
