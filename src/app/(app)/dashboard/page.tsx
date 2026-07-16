import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  computeStats,
  equityCurve,
  byDayOfWeek,
  bySymbol,
  revengeTradingInsight,
  byHoldTime,
  streaks,
} from "@/lib/journalAnalytics";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { DayOfWeekChart } from "@/components/DayOfWeekChart";
import { isPaidTier, FREE_TRADE_LIMIT } from "@/lib/subscription";

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return (
    <div className="rounded-[6px] border border-border-hairline bg-bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p
        className={`mt-1 font-mono text-xl ${
          tone === "positive" ? "text-signal-positive" : tone === "negative" ? "text-signal-negative" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: trades }, { data: profile }] = await Promise.all([
    supabase.from("trades").select("*").eq("user_id", user.id).order("entered_at", { ascending: true }),
    supabase.from("profiles").select("subscription_status").eq("id", user.id).single(),
  ]);

  const rows = trades ?? [];
  const isPaid = isPaidTier(profile?.subscription_status);
  const stats = computeStats(rows);
  const curve = equityCurve(rows);
  const dayBreakdown = byDayOfWeek(rows);
  const symbolBreakdown = bySymbol(rows).slice(0, 8);
  const revenge = revengeTradingInsight(rows);
  const holdTime = byHoldTime(rows);
  const streakInfo = streaks(rows);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-medium tracking-tight sm:text-2xl">Your performance</h1>
          <p className="mt-1 text-sm text-text-muted">
            {stats.totalTrades} trade{stats.totalTrades === 1 ? "" : "s"} logged · {stats.closedTrades} closed
          </p>
        </div>
        <Link
          href="/journal"
          className="rounded-full bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
        >
          + Log trade
        </Link>
      </section>

      {!isPaid && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-[6px] border border-accent-gold/30 bg-accent-gold/5 p-4 sm:flex-row sm:items-center">
          <p className="text-sm text-text-muted">
            Free plan: up to {FREE_TRADE_LIMIT} logged trades. Upgrade for unlimited trades and full history.
          </p>
          <Link
            href="/billing"
            className="shrink-0 rounded-[6px] bg-accent-gold px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-gold-dim"
          >
            Upgrade
          </Link>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border-hairline p-10 text-center text-text-muted">
          <p>No trades logged yet — your analytics will appear here automatically.</p>
          <Link href="/journal" className="mt-3 inline-block text-sm text-accent-gold underline">
            Log your first trade
          </Link>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Total P&L"
              value={`${stats.totalPnl >= 0 ? "+" : ""}$${stats.totalPnl.toFixed(2)}`}
              tone={stats.totalPnl >= 0 ? "positive" : "negative"}
            />
            <StatCard label="Win rate" value={`${stats.winRate.toFixed(1)}%`} />
            <StatCard
              label="Profit factor"
              value={stats.profitFactor == null ? "—" : stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
            />
            <StatCard label="Open trades" value={String(stats.openTrades)} />
            <StatCard label="Avg win" value={`$${stats.avgWin.toFixed(2)}`} tone="positive" />
            <StatCard label="Avg loss" value={`-$${stats.avgLoss.toFixed(2)}`} tone="negative" />
            <StatCard
              label="Best trade"
              value={stats.bestTrade == null ? "—" : `+$${stats.bestTrade.toFixed(2)}`}
              tone="positive"
            />
            <StatCard
              label="Worst trade"
              value={stats.worstTrade == null ? "—" : `$${stats.worstTrade.toFixed(2)}`}
              tone="negative"
            />
          </section>

          {curve.length > 1 && (
            <section className="rounded-[6px] border border-border-hairline bg-bg-surface p-5">
              <h2 className="mb-3 text-sm font-medium text-text-muted">Equity curve</h2>
              <EquityCurveChart data={curve} />
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {dayBreakdown.some((d) => d.count > 0) && (
              <section className="rounded-[6px] border border-border-hairline bg-bg-surface p-5">
                <h2 className="mb-3 text-sm font-medium text-text-muted">P&amp;L by day of week</h2>
                <DayOfWeekChart data={dayBreakdown} />
              </section>
            )}

            {symbolBreakdown.length > 0 && (
              <section className="rounded-[6px] border border-border-hairline bg-bg-surface p-5">
                <h2 className="mb-3 text-sm font-medium text-text-muted">Top symbols</h2>
                <div className="flex flex-col gap-2">
                  {symbolBreakdown.map((s) => (
                    <div key={s.key} className="flex items-center justify-between text-sm">
                      <span className="font-mono text-accent-gold">{s.key}</span>
                      <span className="text-xs text-text-muted">
                        {s.count} trade{s.count === 1 ? "" : "s"} · {s.winRate.toFixed(0)}% win
                      </span>
                      <span className={`font-mono ${s.pnl >= 0 ? "text-signal-positive" : "text-signal-negative"}`}>
                        {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-[6px] border border-border-hairline bg-bg-surface p-5">
              <h2 className="mb-3 text-sm font-medium text-text-muted">Streaks</h2>
              <p className="font-mono text-2xl">
                {streakInfo.currentStreak}{" "}
                <span
                  className={`text-sm ${
                    streakInfo.currentStreakType === "win" ? "text-signal-positive" : "text-signal-negative"
                  }`}
                >
                  {streakInfo.currentStreakType ? `${streakInfo.currentStreakType} streak` : ""}
                </span>
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Longest win streak: {streakInfo.longestWinStreak} · Longest loss streak:{" "}
                {streakInfo.longestLossStreak}
              </p>
            </div>

            <div className="rounded-[6px] border border-border-hairline bg-bg-surface p-5">
              <h2 className="mb-3 text-sm font-medium text-text-muted">P&amp;L by hold time</h2>
              <div className="flex flex-col gap-2">
                {holdTime.map((h) => (
                  <div key={h.bucket} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">{h.bucket}</span>
                    <span className="text-xs text-text-muted">{h.count}x</span>
                    <span className={`font-mono ${h.avgPnl >= 0 ? "text-signal-positive" : "text-signal-negative"}`}>
                      {h.avgPnl >= 0 ? "+" : ""}${h.avgPnl.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`rounded-[6px] border p-5 ${
                revenge?.flagged
                  ? "border-signal-negative/40 bg-signal-negative/5"
                  : "border-border-hairline bg-bg-surface"
              }`}
            >
              <h2 className="mb-3 text-sm font-medium text-text-muted">After a loss</h2>
              {revenge ? (
                <>
                  <p className="font-mono text-lg">
                    {revenge.afterLossWinRate.toFixed(0)}% win rate
                    <span className="ml-2 text-xs text-text-muted">vs {revenge.baselineWinRate.toFixed(0)}% usually</span>
                  </p>
                  <p className="mt-2 text-xs text-text-muted">
                    Avg P&amp;L on the trade right after a loss: ${revenge.afterLossAvgPnl.toFixed(2)} (usually $
                    {revenge.baselineAvgPnl.toFixed(2)})
                  </p>
                  {revenge.flagged && (
                    <p className="mt-2 text-xs text-signal-negative">
                      ⚠ You trade noticeably worse right after a loss — possible revenge trading.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-text-muted">Log a few more closed trades to unlock this insight.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
