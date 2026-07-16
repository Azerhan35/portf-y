"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function EquityCurveChart({ data }: { data: { date: string; cumulative: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#8A8F99" }} tickFormatter={(d: string) => d.slice(5)} />
          <YAxis
            tick={{ fontSize: 10, fill: "#8A8F99" }}
            tickFormatter={(v: number) => `$${v.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value) => [`$${Number(value).toFixed(2)}`, "Cumulative P&L"]}
            contentStyle={{ background: "#171B24", border: "1px solid #2A2F3A", fontSize: 12 }}
          />
          <Line type="monotone" dataKey="cumulative" stroke="#B8934F" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
