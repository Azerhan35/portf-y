import type { JournalTrade } from "@/types/database";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function computePnl(trade: JournalTrade): number | null {
  if (trade.exit_price == null) return null;
  const direction = trade.side === "long" ? 1 : -1;
  return (trade.exit_price - trade.entry_price) * trade.quantity * direction - trade.fees;
}

export function computePnlPct(trade: JournalTrade): number | null {
  const pnl = computePnl(trade);
  if (pnl == null) return null;
  const cost = trade.entry_price * trade.quantity;
  return cost > 0 ? (pnl / cost) * 100 : 0;
}

export type JournalStats = {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number | null;
  totalPnl: number;
  bestTrade: number | null;
  worstTrade: number | null;
};

export function computeStats(trades: JournalTrade[]): JournalStats {
  const closed = trades.filter((t) => t.exit_price != null);
  const pnls = closed.map((t) => computePnl(t)!).filter((p): p is number => p != null);

  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p <= 0);

  const totalWin = wins.reduce((s, p) => s + p, 0);
  const totalLoss = Math.abs(losses.reduce((s, p) => s + p, 0));

  return {
    totalTrades: trades.length,
    openTrades: trades.length - closed.length,
    closedTrades: closed.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    avgWin: wins.length > 0 ? totalWin / wins.length : 0,
    avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
    profitFactor: totalLoss > 0 ? totalWin / totalLoss : wins.length > 0 ? Infinity : null,
    totalPnl: pnls.reduce((s, p) => s + p, 0),
    bestTrade: pnls.length > 0 ? Math.max(...pnls) : null,
    worstTrade: pnls.length > 0 ? Math.min(...pnls) : null,
  };
}

// Kapanmış trade'leri kapanış tarihine göre sıralayıp kümülatif P&L eğrisi üretir.
export function equityCurve(trades: JournalTrade[]): { date: string; cumulative: number }[] {
  const closed = trades
    .filter((t) => t.exit_price != null && t.exited_at)
    .sort((a, b) => new Date(a.exited_at!).getTime() - new Date(b.exited_at!).getTime());

  let running = 0;
  return closed.map((t) => {
    running += computePnl(t) ?? 0;
    return { date: t.exited_at!.slice(0, 10), cumulative: Math.round(running * 100) / 100 };
  });
}

export function byDayOfWeek(trades: JournalTrade[]): { day: string; pnl: number; count: number }[] {
  const buckets = new Map<number, { pnl: number; count: number }>();

  for (const t of trades) {
    if (t.exit_price == null || !t.exited_at) continue;
    const day = new Date(t.exited_at).getUTCDay();
    const entry = buckets.get(day) ?? { pnl: 0, count: 0 };
    entry.pnl += computePnl(t) ?? 0;
    entry.count += 1;
    buckets.set(day, entry);
  }

  return DAY_NAMES.map((name, i) => ({
    day: name,
    pnl: Math.round((buckets.get(i)?.pnl ?? 0) * 100) / 100,
    count: buckets.get(i)?.count ?? 0,
  }));
}

export type GroupBreakdown = { key: string; pnl: number; count: number; winRate: number };

function groupBy(trades: JournalTrade[], keyFn: (t: JournalTrade) => string[]): GroupBreakdown[] {
  const buckets = new Map<string, { pnl: number; wins: number; count: number }>();

  for (const t of trades) {
    if (t.exit_price == null) continue;
    const pnl = computePnl(t) ?? 0;
    for (const key of keyFn(t)) {
      const entry = buckets.get(key) ?? { pnl: 0, wins: 0, count: 0 };
      entry.pnl += pnl;
      entry.count += 1;
      if (pnl > 0) entry.wins += 1;
      buckets.set(key, entry);
    }
  }

  return Array.from(buckets.entries())
    .map(([key, v]) => ({
      key,
      pnl: Math.round(v.pnl * 100) / 100,
      count: v.count,
      winRate: v.count > 0 ? (v.wins / v.count) * 100 : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl);
}

export function bySymbol(trades: JournalTrade[]): GroupBreakdown[] {
  return groupBy(trades, (t) => [t.symbol.toUpperCase()]);
}

export function byTag(trades: JournalTrade[]): GroupBreakdown[] {
  return groupBy(trades, (t) => (t.tags.length > 0 ? t.tags : []));
}
