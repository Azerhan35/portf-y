"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export function DayOfWeekChart({ data }: { data: { day: string; pnl: number; count: number }[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#8A8F99" }} />
          <YAxis tick={{ fontSize: 10, fill: "#8A8F99" }} tickFormatter={(v: number) => `$${v}`} />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "P&L"]}
            contentStyle={{ background: "#171B24", border: "1px solid #2A2F3A", fontSize: 12 }}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.pnl >= 0 ? "#3A7D5C" : "#8C4A45"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
