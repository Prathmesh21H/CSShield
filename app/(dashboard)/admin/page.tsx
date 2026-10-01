"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import { Skeleton } from "@/components/ui/Skeleton";
import { DataSourceRow, type SourceState } from "@/components/admin/DataSourceRow";
import { formatCompactINR } from "@/lib/utils/formatCurrency";

const SOURCE_LABELS: Record<SourceState["id"], string> = {
  nvd: "NVD — CVE catalog",
  epss: "FIRST EPSS — exploit probability",
  kev: "CISA KEV — actively exploited",
};

interface DemoDataResult {
  businessUnitsCreated: number;
  assetsCreated: number;
  findingsCreated: number;
  ealValue: number;
  var95Value: number;
}

export default function AdminPage() {
  const [sources, setSources] = useState<SourceState[] | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [refreshingId, setRefreshingId] = useState<SourceState["id"] | null>(null);

  const [demoStatus, setDemoStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [demoResult, setDemoResult] = useState<DemoDataResult | null>(null);
  const [demoError, setDemoError] = useState<string | null>(null);

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

  async function handleLoadDemoData() {
    setDemoStatus("loading");
    setDemoError(null);
    try {
      const res = await fetch("/api/ingest/demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetCount: 25 }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Could not load demo data.");
      }
      setDemoResult(data);
      setDemoStatus("success");
    } catch (err) {
      setDemoError(err instanceof Error ? err.message : "Could not load demo data.");
      setDemoStatus("error");
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

      <Card className="border-accent/40 bg-accent-soft/30">
        <CardHeader>
          <CardTitle>Quick start: load demo data</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-ink-soft">
          Seeds a sample organization (business units, assets) attached to a curated set
          of real, well-documented CVEs, then computes the first risk score — all in one
          click. This works immediately, with no NVD/EPSS API key required. Use it to see
          the platform working end to end before connecting live data or your own company
          data on the{" "}
          <Link href="/company" className="text-accent hover:underline">
            Company data
          </Link>{" "}
          page.
        </p>

        <Button onClick={handleLoadDemoData} disabled={demoStatus === "loading"}>
          {demoStatus === "loading" ? "Loading demo data…" : "Load demo data"}
        </Button>

        {demoStatus === "error" && (
          <StateMessage tone="error" title="Could not load demo data" description={demoError ?? undefined} className="mt-4" />
        )}

        {demoStatus === "success" && demoResult && (
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-ink-soft">Business units</p>
              <p className="font-figures text-lg text-ink">{demoResult.businessUnitsCreated}</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft">Assets</p>
              <p className="font-figures text-lg text-ink">{demoResult.assetsCreated}</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft">Findings</p>
              <p className="font-figures text-lg text-ink">{demoResult.findingsCreated}</p>
            </div>
            <div>
              <p className="text-xs text-ink-soft">Computed EAL</p>
              <p className="font-figures text-lg text-ink">{formatCompactINR(demoResult.ealValue)}</p>
            </div>
            <p className="col-span-2 text-sm text-ink-soft sm:col-span-4">
              Done — head to the{" "}
              <Link href="/dashboard" className="text-accent hover:underline">
                Overview
              </Link>{" "}
              page to see it.
            </p>
          </div>
        )}
      </Card>

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