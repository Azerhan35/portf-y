import "server-only";
import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InsiderTrade } from "@/types/database";
import { isPaidTier } from "@/lib/subscription";

function formatTradeLine(trade: InsiderTrade): string {
  const action =
    trade.transaction_type === "buy"
      ? "bought"
      : trade.transaction_type === "sell"
        ? "sold"
        : "reported a transaction in";
  const shares = trade.shares ? `${trade.shares.toLocaleString()} shares` : "shares";
  const price = trade.price ? ` at $${trade.price.toFixed(2)}` : "";
  return `${trade.insider_name}${trade.insider_role ? ` (${trade.insider_role})` : ""} ${action} ${shares} of ${trade.ticker}${price}.`;
}

// Yeni eklenen insider trade'ler için, o ticker'ı watchlist'inde tutan ve
// ücretli (aktif/deneme) aboneliği olan kullanıcılara e-posta gönderir — anlık
// email uyarısı, freemium modelinde ücretsiz katıma dahil değildir. notifications
// tablosundaki unique(user_id, trade_id, channel) kısıtı sayesinde aynı
// bildirim iki kez gönderilmez (cron tekrar çalışsa bile).
export async function sendNewTradeNotifications(
  admin: SupabaseClient<Database>,
  trades: InsiderTrade[]
) {
  if (trades.length === 0 || !process.env.RESEND_API_KEY) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "alerts@example.com";

  const tickers = Array.from(new Set(trades.map((t) => t.ticker)));

  const { data: watchers } = await admin
    .from("watchlists")
    .select("user_id, ticker")
    .in("ticker", tickers);

  if (!watchers || watchers.length === 0) return;

  const userIds = Array.from(new Set(watchers.map((w) => w.user_id)));
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, subscription_status")
    .in("id", userIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  for (const trade of trades) {
    const watchersForTicker = watchers.filter((w) => w.ticker === trade.ticker);

    for (const watcher of watchersForTicker) {
      const profile = profileById.get(watcher.user_id);
      if (!profile || !isPaidTier(profile.subscription_status)) continue;

      const { error: insertError } = await admin
        .from("notifications")
        .insert({ user_id: watcher.user_id, trade_id: trade.id, channel: "email" });

      // Zaten gönderilmişse (unique constraint çakışması) tekrar e-posta atma.
      if (insertError) continue;

      await resend.emails.send({
        from: fromEmail,
        to: profile.email,
        subject: `New insider trade: ${trade.ticker}`,
        text: formatTradeLine(trade),
      });
    }
  }
}
