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

// --- Davranışsal analiz --------------------------------------------------
// Bunlar salt toplam/ortalama değil, trader'ın kendi alışkanlıklarını
// (intikam trade'i, tutma süresi, seri etkisi) ortaya çıkarır — "hesap
// makinesi"nin ötesine geçen kısım burası.

function closedSortedByExit(trades: JournalTrade[]): JournalTrade[] {
  return trades
    .filter((t) => t.exit_price != null && t.exited_at)
    .sort((a, b) => new Date(a.exited_at!).getTime() - new Date(b.exited_at!).getTime());
}

export type RevengeTradingInsight = {
  afterLossAvgPnl: number;
  afterLossWinRate: number;
  baselineAvgPnl: number;
  baselineWinRate: number;
  afterLossCount: number;
  flagged: boolean;
};

// "İntikam trade'i": bir kayıptan hemen sonra açılan trade'lerin performansı,
// genel ortalamadan belirgin şekilde kötüyse bunu işaretler.
export function revengeTradingInsight(trades: JournalTrade[]): RevengeTradingInsight | null {
  const closed = closedSortedByExit(trades);
  if (closed.length < 6) return null; // anlamlı bir örneklem için minimum

  const afterLossPnls: number[] = [];
  const baselinePnls: number[] = [];

  for (let i = 1; i < closed.length; i++) {
    const prevPnl = computePnl(closed[i - 1]) ?? 0;
    const pnl = computePnl(closed[i]) ?? 0;
    if (prevPnl < 0) afterLossPnls.push(pnl);
    else baselinePnls.push(pnl);
  }

  if (afterLossPnls.length < 3 || baselinePnls.length < 3) return null;

  const avg = (arr: number[]) => arr.reduce((s, p) => s + p, 0) / arr.length;
  const winRate = (arr: number[]) => (arr.filter((p) => p > 0).length / arr.length) * 100;

  const afterLossAvgPnl = avg(afterLossPnls);
  const baselineAvgPnl = avg(baselinePnls);
  const afterLossWinRate = winRate(afterLossPnls);
  const baselineWinRate = winRate(baselinePnls);

  return {
    afterLossAvgPnl: Math.round(afterLossAvgPnl * 100) / 100,
    afterLossWinRate: Math.round(afterLossWinRate * 10) / 10,
    baselineAvgPnl: Math.round(baselineAvgPnl * 100) / 100,
    baselineWinRate: Math.round(baselineWinRate * 10) / 10,
    afterLossCount: afterLossPnls.length,
    flagged: afterLossAvgPnl < baselineAvgPnl * 0.5 || afterLossWinRate < baselineWinRate - 15,
  };
}

const HOLD_BUCKETS = [
  { label: "< 15 min", maxMinutes: 15 },
  { label: "15m – 2h", maxMinutes: 120 },
  { label: "2h – 1 day", maxMinutes: 60 * 24 },
  { label: "> 1 day", maxMinutes: Infinity },
];

export function byHoldTime(trades: JournalTrade[]): { bucket: string; avgPnl: number; count: number }[] {
  const closed = trades.filter((t) => t.exit_price != null && t.exited_at);
  const buckets = HOLD_BUCKETS.map((b) => ({ ...b, pnls: [] as number[] }));

  for (const t of closed) {
    const minutes = (new Date(t.exited_at!).getTime() - new Date(t.entered_at).getTime()) / 60000;
    const bucket = buckets.find((b) => minutes <= b.maxMinutes) ?? buckets[buckets.length - 1];
    bucket.pnls.push(computePnl(t) ?? 0);
  }

  return buckets.map((b) => ({
    bucket: b.label,
    count: b.pnls.length,
    avgPnl: b.pnls.length > 0 ? Math.round((b.pnls.reduce((s, p) => s + p, 0) / b.pnls.length) * 100) / 100 : 0,
  }));
}

export type StreakInsight = {
  currentStreak: number;
  currentStreakType: "win" | "loss" | null;
  longestWinStreak: number;
  longestLossStreak: number;
};

export function streaks(trades: JournalTrade[]): StreakInsight {
  const closed = closedSortedByExit(trades);
  let longestWin = 0;
  let longestLoss = 0;
  let runWin = 0;
  let runLoss = 0;

  for (const t of closed) {
    const pnl = computePnl(t) ?? 0;
    if (pnl > 0) {
      runWin += 1;
      runLoss = 0;
    } else {
      runLoss += 1;
      runWin = 0;
    }
    longestWin = Math.max(longestWin, runWin);
    longestLoss = Math.max(longestLoss, runLoss);
  }

  return {
    currentStreak: runWin > 0 ? runWin : runLoss,
    currentStreakType: closed.length === 0 ? null : runWin > 0 ? "win" : "loss",
    longestWinStreak: longestWin,
    longestLossStreak: longestLoss,
  };
}
