import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import type { ComplianceMatrix, CoverageStatus } from "@/types/compliance";

const STATUS_TONE: Record<CoverageStatus, "gain" | "warn" | "risk"> = {
  addressed: "gain",
  partial: "warn",
  gap: "risk",
};

const STATUS_LABEL: Record<CoverageStatus, string> = {
  addressed: "Addressed",
  partial: "Partial",
  gap: "Gap",
};

interface ComplianceMatrixTableProps {
  matrix: ComplianceMatrix | null;
  status: "loading" | "success" | "empty" | "error";
}

export function ComplianceMatrixTable({ matrix, status }: ComplianceMatrixTableProps) {
  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return <StateMessage tone="error" title="Could not load the compliance matrix" />;
  }

  if (status === "empty" || !matrix || matrix.rows.length === 0) {
    return (
      <StateMessage
        title="No compliance mapping yet"
        description="Coverage appears once findings and controls have been mapped to a framework."
      />
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line text-xs text-ink-soft">
          <th className="pb-2 font-medium">Control ID</th>
          <th className="pb-2 font-medium">Title</th>
          <th className="pb-2 font-medium">Status</th>
          <th className="pb-2 font-medium">Related findings</th>
        </tr>
      </thead>
      <tbody>
        {matrix.rows.map((row) => (
          <tr key={row.controlId} className="border-b border-line last:border-0">
            <td className="font-figures py-3 text-ink-soft">{row.controlId}</td>
            <td className="py-3 text-ink">{row.controlTitle}</td>
            <td className="py-3">
              <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
            </td>
            <td className="py-3 text-ink-soft">
              {row.relatedFindingIds.length > 0 ? row.relatedFindingIds.length : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}