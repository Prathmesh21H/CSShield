import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { formatCompactINR, formatPercent } from "@/lib/utils/formatCurrency";
import type { OptimizationResult } from "@/types/control";

interface RecommendedControlsListProps {
  result: OptimizationResult | null;
  status: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
}

export function RecommendedControlsList({
  result,
  status,
  errorMessage,
}: RecommendedControlsListProps) {
  if (status === "idle") {
    return (
      <StateMessage
        title="Move the slider to see a recommendation"
        description="The optimizer selects the combination of controls that reduces the most risk for your budget."
      />
    );
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <StateMessage
        tone="error"
        title="Could not compute a recommendation"
        description={errorMessage ?? undefined}
      />
    );
  }

  if (!result || result.selectedControls.length === 0) {
    return (
      <StateMessage
        title="No controls fit this budget"
        description="Increase the budget to see recommended controls."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line pb-3 text-sm">
        <span className="text-ink-soft">
          Projected exposure:{" "}
          <span className="font-figures text-ink">
            {formatCompactINR(result.ealBefore)} → {formatCompactINR(result.projectedEal)}
          </span>
        </span>
        <Badge tone="gain">ROSI {formatPercent(result.rosi)}</Badge>
      </div>

      {result.selectedControls.map((control) => (
        <div
          key={control.id}
          className="flex items-center justify-between border border-line px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-ink">{control.name}</p>
            <p className="text-xs text-ink-soft">
              Estimated risk reduction: {formatPercent(control.estRiskReductionPct)}
            </p>
          </div>
          <span className="font-figures text-sm text-ink">
            {formatCompactINR(control.cost)}
          </span>
        </div>
      ))}
    </div>
  );
}