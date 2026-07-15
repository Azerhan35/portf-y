import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InsiderCard } from "@/components/InsiderCard";
import { groupByInsider } from "@/lib/insiders";
import { isPaidTier, FREE_TICKER_LIMIT, FREE_HISTORY_DAYS } from "@/lib/subscription";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: trades }] = await Promise.all([
    supabase.from("profiles").select("subscription_status").eq("id", user.id).single(),
    supabase
      .from("insider_trades")
      .select("*")
      .order("filing_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const isPaid = isPaidTier(profile?.subscription_status);
  const insiders = groupByInsider(trades ?? []).slice(0, 40);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section>
        <h1 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
          Top insiders
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Who&apos;s actively buying and selling right now, market-wide — sourced straight from
          SEC Form 4 filings.
        </p>
      </section>

      {!isPaid && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[6px] border border-accent-gold/30 bg-accent-gold/5 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-text-muted">
            Free plan: last {FREE_HISTORY_DAYS} days of filings, {FREE_TICKER_LIMIT}-ticker
            watchlist, no email alerts.
          </p>
          <Link
            href="/billing"
            className="shrink-0 rounded-[6px] bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
          >
            Upgrade
          </Link>
        </div>
      )}

      {insiders.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-8 text-center text-text-muted">
          No insider activity in view yet. New filings are picked up automatically every few
          minutes — check back shortly.
        </div>
      ) : (
        <section className="rounded-[6px] border border-border-hairline bg-bg-surface">
          {insiders.map((insider) => (
            <InsiderCard key={insider.cik ?? insider.name} insider={insider} />
          ))}
        </section>
      )}
    </div>
  );
}
