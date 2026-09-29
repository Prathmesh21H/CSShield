"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StateMessage } from "@/components/ui/StateMessage";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataSourceRow, type SourceState } from "@/components/admin/DataSourceRow";

const SOURCE_LABELS: Record<SourceState["id"], string> = {
  nvd: "NVD — CVE catalog",
  epss: "FIRST EPSS — exploit probability",
  kev: "CISA KEV — actively exploited",
};

export default function AdminPage() {
  const [sources, setSources] = useState<SourceState[] | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [refreshingId, setRefreshingId] = useState<SourceState["id"] | null>(null);

  const loadStatus = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/ingest/status");
      if (!res.ok) throw new Error("Could not load ingestion status.");
      const data: SourceState[] = await res.json();
      setSources(data);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  async function handleRefresh(id: SourceState["id"]) {
    setRefreshingId(id);
    try {
      const res = await fetch(`/api/ingest/${id}`, { method: "POST" });
      if (!res.ok) throw new Error();
      await loadStatus();
    } catch {
      // Ingestion failure is surfaced by the row's own "Failed" status
      // after loadStatus() re-reads the ingestion_log — no separate
      // toast needed here.
    } finally {
      setRefreshingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Data sources</h1>
        <p className="text-sm text-ink-soft">
          Live threat intelligence feeds this platform depends on. Refreshing
          here re-runs ingestion immediately instead of waiting for the schedule.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingestion status</CardTitle>
        </CardHeader>

        {status === "loading" && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {status === "error" && (
          <StateMessage
            tone="error"
            title="Could not load ingestion status"
            description="The admin API may be unavailable. Dashboard figures still reflect the last successful ingestion."
          />
        )}

        {status === "success" && sources && (
          <div className="flex flex-col gap-2">
            {sources.map((source) => (
              <DataSourceRow
                key={source.id}
                source={{ ...source, label: SOURCE_LABELS[source.id] }}
                onRefresh={handleRefresh}
                isRefreshing={refreshingId === source.id}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}