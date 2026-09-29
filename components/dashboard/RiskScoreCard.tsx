import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { formatCompactINR, formatRelativeTime } from "@/lib/utils/formatCurrency";
import type { RiskSummary } from "@/types/riskScore";

interface RiskScoreCardProps {
  summary: RiskSummary | null;
  status: "loading" | "success" | "empty" | "error";
  errorMessage: string | null;
}

/**
 * The one place on the page where boldness is spent: the EAL figure is
 * set large in the monospace numeral face, with everything else quiet
 * around it — this is the number the whole platform exists to produce.
 */
export function RiskScoreCard({ summary, status, errorMessage }: RiskScoreCardProps) {
  if (status === "loading") {
    return (
      <Card className="col-span-2">
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="h-16 w-64" />
      </Card>
    );
  }

  if (status === "error") {
    return (
      <Card className="col-span-2">
        <StateMessage
          tone="error"
          title="Risk data unavailable"
          description={errorMessage ?? "The risk engine could not be reached."}
        />
      </Card>
    );
  }

  if (status === "empty" || !summary) {
    return (
      <Card className="col-span-2">
        <StateMessage
          title="No risk score computed yet"
          description="Run a data refresh from the Data Sources page to generate the first calculation."
        />
      </Card>
    );
  }

  const { current, dataFreshness } = summary;

  return (
    <Card className="col-span-2">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-ink-soft">
          Enterprise Financial Exposure
        </p>
        {dataFreshness.isStale && (
          <Badge tone="warn">Underlying data may be stale</Badge>
        )}
      </div>

      <p className="font-figures mt-3 text-6xl font-semibold leading-none text-ink">
        {formatCompactINR(current.ealValue)}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
        <span>
          95th percentile (VaR):{" "}
          <span className="font-figures text-ink">
            {formatCompactINR(current.var95Value)}
          </span>
        </span>
        <span>Computed {formatRelativeTime(current.computedAt)}</span>
        <span>NVD updated {formatRelativeTime(dataFreshness.nvd)}</span>
      </div>
    </Card>
  );
}