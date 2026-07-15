import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
      <div className="flex flex-col items-center gap-4">
        <p className="font-mono text-xs tracking-[0.3em] text-accent-gold uppercase">
          Insider · Institutional · Congress
        </p>
        <h1 className="max-w-2xl font-display text-5xl font-medium tracking-tight italic">
          Know what they know.
        </h1>
        <p className="max-w-md text-text-muted">
          Real-time alerts when corporate insiders, hedge funds, or members of Congress trade
          the stocks you&apos;re watching — sourced straight from SEC filings.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-[6px] bg-accent-gold px-6 py-3 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
        >
          Start 7-day free trial
        </Link>
        <Link
          href="/login"
          className="rounded-[6px] border border-border-hairline px-6 py-3 text-sm font-medium hover:border-accent-gold"
        >
          Sign in
        </Link>
      </div>

      <div className="mt-8 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            title: "Insider trades",
            body: "Every Form 4 filing from executives, directors, and 10% owners, parsed the moment SEC EDGAR publishes it.",
          },
          {
            title: "Institutional funds",
            body: "Quarterly 13F positions from the largest hedge funds — coming in phase two.",
          },
          {
            title: "Congress trades",
            body: "STOCK Act disclosures from the Senate and House — coming in phase three.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-[6px] border border-border-hairline bg-bg-surface p-5 text-left"
          >
            <h3 className="font-display text-lg">{f.title}</h3>
            <p className="mt-2 text-sm text-text-muted">{f.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 font-mono text-sm text-text-muted">$19/month · 7-day free trial · cancel anytime</p>
      <p className="max-w-md text-xs text-text-muted">
        Signal surfaces public regulatory filings for informational purposes only. Nothing on
        this site is investment advice.
      </p>
    </div>
  );
}
