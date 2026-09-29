"use client";

import { useRiskSummary } from "@/hooks/useRiskSummary";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { RiskTrendChart } from "@/components/dashboard/RiskTrendChart";
import { TopContributorsTable } from "@/components/dashboard/TopContributorsTable";

export default function DashboardPage() {
  const { summary, topContributors, status, errorMessage } = useRiskSummary();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Overview</h1>
        <p className="text-sm text-ink-soft">
          Your organization&apos;s current financial cyber exposure, computed from live threat data.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <RiskScoreCard summary={summary} status={status} errorMessage={errorMessage} />
        <RiskTrendChart trend={summary?.trend ?? []} status={status} />
      </div>

      <TopContributorsTable contributors={topContributors} status={status} />
    </div>
  );
}