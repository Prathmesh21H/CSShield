"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCompactINR } from "@/lib/utils/formatCurrency";
import type { OptimizationResult } from "@/types/control";

export function RiskReductionChart({ result }: { result: OptimizationResult }) {
  const data = [
    { label: "Current", value: result.ealBefore },
    { label: "After recommended spend", value: result.projectedEal },
  ];

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
        <CartesianGrid stroke="#E2E5EA" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => formatCompactINR(v)}
          tick={{ fontSize: 12, fill: "#3C465E" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: "#10172A" }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip formatter={(value) => formatCompactINR(Number(value))} />
        <Bar dataKey="value" fill="#1E4FD8" barSize={28} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}