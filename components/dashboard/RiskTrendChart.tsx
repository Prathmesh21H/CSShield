"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { formatCompactINR } from "@/lib/utils/formatCurrency";
import type { RiskTrendPoint } from "@/types/riskScore";

interface RiskTrendChartProps {
  trend: RiskTrendPoint[];
  status: "loading" | "success" | "empty" | "error";
}

export function RiskTrendChart({ trend, status }: RiskTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exposure trend</CardTitle>
      </CardHeader>

      {status === "loading" && <Skeleton className="h-56 w-full" />}

      {status === "error" && (
        <StateMessage tone="error" title="Trend unavailable" />
      )}

      {status !== "loading" && status !== "error" && trend.length === 0 && (
        <StateMessage
          title="Not enough history yet"
          description="The trend line appears once at least two risk calculations have run."
        />
      )}

      {status !== "loading" && status !== "error" && trend.length > 0 && (
        <ResponsiveContainer width="100%" height={224}>
          <LineChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="#E2E5EA" vertical={false} />
            <XAxis
              dataKey="computedAt"
              tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              tick={{ fontSize: 12, fill: "#3C465E" }}
              axisLine={{ stroke: "#E2E5EA" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatCompactINR(v)}
              tick={{ fontSize: 12, fill: "#3C465E" }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              formatter={(value) => formatCompactINR(Number(value))}
              labelFormatter={(v) => new Date(String(v)).toLocaleDateString("en-IN")}
              contentStyle={{ borderRadius: 2, borderColor: "#E2E5EA", fontSize: 13 }}
            />
            <Line
              type="monotone"
              dataKey="ealValue"
              stroke="#1E4FD8"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}