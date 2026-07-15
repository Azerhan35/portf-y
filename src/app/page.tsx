import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HeroTerminal } from "@/components/HeroTerminal";
import { LandingTicker } from "@/components/LandingTicker";
import { InsiderAvatar } from "@/components/InsiderAvatar";
import { Reveal } from "@/components/Reveal";

const DATA_SOURCES = [
  "SEC EDGAR",
  "Form 4 Filings",
  "data.sec.gov",
  "Options Market Data",
  "Section 16 Disclosures",
  "Full-Text Search Index",
];

const FEATURES = [
  {
    title: "Insider trades",
    body: "Every Form 4 filing from executives, directors, and 10% owners, parsed the moment SEC EDGAR publishes it.",
    status: "Live now",
  },
  {
    title: "Unusual options activity",
    body: "Options volume that spikes far above normal, often before the market reacts — the same signal category serious day traders already pay for.",
    status: "Building now",
  },
  {
    title: "Congress trades",
    body: "STOCK Act disclosures from the Senate and House, cleaned up and correlated against everything else on this list.",
    status: "Planned",
  },
];

const STEPS = [
  {
    n: "01",
    title: "See every signal, not just tickers",
    body: "Land on your feed and see who's actively trading right now, market-wide — insiders, and soon, unusual options activity — or narrow it to your own watchlist.",
  },
  {
    n: "02",
    title: "We correlate the signals for you",
    body: "An insider buying and a sudden spike in call volume on the same stock, in the same week, is a much stronger story than either alone. We surface that overlap automatically.",
  },
  {
    n: "03",
    title: "Get there before the crowd",
    body: "Unlimited members get an instant alert — Telegram or email — the moment something worth seeing happens on their watchlist.",
  },
];

async function getMarketingStats() {
  const admin = createAdminClient();
  const [{ count: tradeCount }, { data: sample }] = await Promise.all([
    admin.from("insider_trades").select("id", { count: "exact", head: true }),
    admin
      .from("insider_trades")
      .select("*")
      .order("filing_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(400),
  ]);

  const rows = sample ?? [];
  const distinctInsiders = new Set(rows.map((r) => r.cik ?? r.insider_name)).size;
  const distinctTickers = new Set(rows.map((r) => r.ticker)).size;

  return {
    tradeCount: tradeCount ?? 0,
    distinctInsiders,
    distinctTickers,
    preview: rows.slice(0, 4),
  };
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  const stats = await getMarketingStats();

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- Hero ---------- */}
      <section className="relative flex min-h-screen flex-col overflow-hidden">
        <HeroTerminal />

        <header className="relative z-10 border-b border-white/10 bg-bg-primary/30 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <span className="font-display text-lg font-medium tracking-tight">Portfey</span>
            <nav className="hidden items-center gap-8 text-sm text-text-muted sm:flex">
              <a href="#how-it-works" className="hover:text-text-primary">
                How it works
              </a>
              <a href="#preview" className="hover:text-text-primary">
                Live feed
              </a>
              <a href="#pricing" className="hover:text-text-primary">
                Pricing
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-text-muted hover:text-text-primary"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-gold-dim"
              >
                Get started
              </Link>
            </div>
          </div>
        </header>

        <LandingTicker />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6 py-20 text-center">
          <div
            className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-text-muted backdrop-blur"
            style={{ animationDelay: "0ms" }}
          >
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-signal-positive" />
            Insider filings + unusual options activity, correlated in real time
          </div>

          <h1
            className="animate-fade-in-up max-w-3xl text-balance font-display text-5xl font-medium tracking-tight italic sm:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Know what they know.
          </h1>
          <p
            className="animate-fade-in-up max-w-lg text-text-muted"
            style={{ animationDelay: "160ms" }}
          >
            Built for people who trade every day, not once a quarter. We watch SEC filings and
            options flow so you don&apos;t have to, and alert you the moment two signals line up
            on the same stock.
          </p>

          <div
            className="animate-fade-in-up flex flex-wrap justify-center gap-3 pt-2"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/signup"
              className="rounded-full bg-accent-gold px-7 py-3.5 text-sm font-medium text-bg-primary transition-transform hover:scale-[1.03] hover:bg-accent-gold-dim"
            >
              Get started free →
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-medium backdrop-blur transition-colors hover:border-accent-gold/50"
            >
              Sign in
            </Link>
          </div>

          <div
            className="animate-fade-in-up flex flex-wrap justify-center gap-3 pt-4"
            style={{ animationDelay: "320ms" }}
          >
            {[
              `${stats.tradeCount.toLocaleString()}+ filings tracked`,
              `${stats.distinctInsiders}+ insiders followed`,
              `${stats.distinctTickers}+ tickers covered`,
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1 font-mono text-[11px] text-text-muted"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Marquee ---------- */}
      <section className="overflow-hidden border-y border-border-hairline bg-bg-surface py-3">
        <div className="flex w-max animate-ticker whitespace-nowrap">
          {[...DATA_SOURCES, ...DATA_SOURCES, ...DATA_SOURCES].map((s, i) => (
            <span key={i} className="mx-6 font-mono text-xs text-text-muted">
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-center font-mono text-xs tracking-[0.3em] text-accent-gold uppercase">
              How it works
            </p>
            <h2 className="mt-3 text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">
              From filing to your phone, automatically
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 120}>
                <div className="flex flex-col gap-3 border-t border-accent-gold/30 pt-5">
                  <span className="font-mono text-sm text-accent-gold">{step.n}</span>
                  <h3 className="font-display text-lg">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-text-muted">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- High conviction explainer ---------- */}
      <section className="border-t border-border-hairline bg-bg-surface px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-center font-mono text-xs tracking-[0.3em] text-accent-gold uppercase">
              Why it matters
            </p>
            <h2 className="mt-3 text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">
              One signal is noise. Two is a setup.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-text-muted">
              A CFO buying stock is interesting. Someone opening an unusually large call position
              on the same ticker, the same week, is a different story entirely. Checking SEC
              filings and options flow separately, by hand, across dozens of stocks, isn&apos;t
              realistic for a trader who&apos;s actually trading. Portfey watches both, all day,
              and only interrupts you when they overlap.
            </p>
          </Reveal>

          <Reveal delay={150}>
            <div className="mx-auto mt-10 max-w-lg rounded-[6px] border border-accent-gold/30 bg-bg-primary p-5 font-mono text-sm">
              <p className="mb-3 text-xs uppercase tracking-widest text-accent-gold">
                🔥 High conviction — example
              </p>
              <p className="text-text-muted">
                Insider: CFO bought <span className="text-text-primary">$480K</span> in shares
              </p>
              <p className="text-text-muted">
                Options: Call volume <span className="text-text-primary">11x</span> the 30-day
                average
              </p>
              <p className="mt-2 text-text-muted">→ Both flagged on the same ticker, same week.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Live preview ---------- */}
      {stats.preview.length > 0 && (
        <section id="preview" className="border-t border-border-hairline px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="text-center font-mono text-xs tracking-[0.3em] text-accent-gold uppercase">
                Straight off the wire
              </p>
              <h2 className="mt-3 text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">
                Real filings, ingested moments ago
              </h2>
              <p className="mx-auto mt-3 max-w-md text-center text-sm text-text-muted">
                Not a mockup — this is a live sample from Portfey&apos;s own feed right now.
              </p>
            </Reveal>

            <Reveal delay={150}>
              <div className="mt-10 rounded-[6px] border border-border-hairline bg-bg-surface">
                {stats.preview.map((trade) => {
                  const isBuy = trade.transaction_type === "buy";
                  const isSell = trade.transaction_type === "sell";
                  return (
                    <div
                      key={trade.id}
                      className="flex items-center gap-3 border-b border-border-hairline px-4 py-4 last:border-0 sm:px-5"
                    >
                      <InsiderAvatar name={trade.insider_name} size={40} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{trade.insider_name}</p>
                          <span
                            className={`shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                              isBuy
                                ? "bg-signal-positive/15 text-signal-positive"
                                : isSell
                                  ? "bg-signal-negative/15 text-signal-negative"
                                  : "bg-accent-gold/15 text-accent-gold"
                            }`}
                          >
                            {trade.transaction_type}
                          </span>
                        </div>
                        <p className="truncate text-xs text-text-muted">
                          {trade.insider_role && <>{trade.insider_role} · </>}
                          <span className="font-mono text-accent-gold">{trade.ticker}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right font-mono text-sm text-text-muted">
                        {trade.shares != null && <p>{trade.shares.toLocaleString()} sh</p>}
                        {trade.filing_date && <p>{trade.filing_date}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---------- Feature grid ---------- */}
      <section className="border-t border-border-hairline bg-bg-surface px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-center font-mono text-xs tracking-[0.3em] text-accent-gold uppercase">
              Coverage
            </p>
            <h2 className="mt-3 text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Three signals. One feed.
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 100}>
                <div className="flex h-full flex-col justify-between rounded-[6px] border border-border-hairline bg-bg-primary p-6 text-left transition-colors hover:border-accent-gold/40">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-display text-lg">{f.title}</h3>
                      <span
                        className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          f.status === "Live now"
                            ? "bg-signal-positive/15 text-signal-positive"
                            : "bg-text-muted/10 text-text-muted"
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted">{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Pricing ---------- */}
      <section id="pricing" className="border-t border-border-hairline px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <p className="text-center font-mono text-xs tracking-[0.3em] text-accent-gold uppercase">
              Pricing
            </p>
            <h2 className="mt-3 text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Start free. Upgrade when it&apos;s working.
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Reveal delay={0}>
              <div className="flex h-full flex-col gap-6 rounded-[6px] border border-border-hairline bg-bg-surface p-8">
                <div>
                  <h3 className="font-display text-xl">Free</h3>
                  <p className="mt-1 font-mono text-3xl">$0</p>
                </div>
                <ul className="flex flex-1 flex-col gap-3 text-sm text-text-muted">
                  <li>· Up to 2 tickers on your watchlist</li>
                  <li>· Last 3 days of insider filings</li>
                  <li>· Full market-wide insider feed</li>
                  <li>· No Telegram/email alerts</li>
                </ul>
                <Link
                  href="/signup"
                  className="rounded-full border border-white/15 px-6 py-3 text-center text-sm font-medium hover:border-accent-gold/50"
                >
                  Get started free
                </Link>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="flex h-full flex-col gap-6 rounded-[6px] border border-accent-gold/40 bg-bg-surface p-8">
                <div>
                  <h3 className="font-display text-xl text-accent-gold">Unlimited</h3>
                  <p className="mt-1 font-mono text-3xl">
                    $19<span className="text-base text-text-muted">/mo</span>
                  </p>
                </div>
                <ul className="flex flex-1 flex-col gap-3 text-sm text-text-muted">
                  <li>· Unlimited watchlist tickers</li>
                  <li>· Full historical filing archive</li>
                  <li>· Unusual options activity (rolling out)</li>
                  <li>· Instant Telegram + email alerts</li>
                </ul>
                <Link
                  href="/signup"
                  className="rounded-full bg-accent-gold px-6 py-3 text-center text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
                >
                  Get Unlimited
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="relative overflow-hidden border-t border-border-hairline px-6 py-24 text-center">
        <div className="hero-aura-gold pointer-events-none absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-gold/10 blur-[120px]" />
        <Reveal className="relative">
          <h2 className="mx-auto max-w-xl font-display text-3xl font-medium tracking-tight italic sm:text-4xl">
            The filings are already public. The edge is knowing first.
          </h2>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-accent-gold px-8 py-3.5 text-sm font-medium text-bg-primary transition-transform hover:scale-[1.03] hover:bg-accent-gold-dim"
          >
            Get started free →
          </Link>
        </Reveal>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-border-hairline px-6 py-10 text-center">
        <p className="font-display text-sm">Portfey</p>
        <p className="mx-auto mt-3 max-w-md text-xs text-text-muted">
          Portfey surfaces public regulatory filings and market data for informational purposes
          only. Nothing on this site is investment advice.
        </p>
      </footer>
    </div>
  );
}
