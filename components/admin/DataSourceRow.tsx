"use client";

import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils/formatCurrency";

export type SourceStatus = "success" | "stale" | "failed";

export interface SourceState {
  id: "nvd" | "epss" | "kev";
  label: string;
  lastRunAt: string | null;
  recordCount: number | null;
  status: SourceStatus;
}

const STATUS_ICON: Record<SourceStatus, typeof CheckCircle2> = {
  success: CheckCircle2,
  stale: AlertTriangle,
  failed: XCircle,
};

const STATUS_TONE: Record<SourceStatus, "gain" | "warn" | "risk"> = {
  success: "gain",
  stale: "warn",
  failed: "risk",
};

interface DataSourceRowProps {
  source: SourceState;
  onRefresh: (id: SourceState["id"]) => void;
  isRefreshing: boolean;
}

export function DataSourceRow({ source, onRefresh, isRefreshing }: DataSourceRowProps) {
  const Icon = STATUS_ICON[source.status];

  return (
    <div className="flex items-center justify-between border border-line px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon
          size={18}
          className={
            source.status === "success"
              ? "text-gain"
              : source.status === "stale"
              ? "text-warn"
              : "text-risk"
          }
        />
        <div>
          <p className="text-sm font-medium text-ink">{source.label}</p>
          <p className="text-xs text-ink-soft">
            Last refreshed {formatRelativeTime(source.lastRunAt)}
            {source.recordCount !== null && ` · ${source.recordCount} records`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge tone={STATUS_TONE[source.status]}>
          {source.status === "success"
            ? "Up to date"
            : source.status === "stale"
            ? "Stale"
            : "Failed"}
        </Badge>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onRefresh(source.id)}
          disabled={isRefreshing}
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>
    </div>
  );
}