"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { formatCompactINR, formatPercent } from "@/lib/utils/formatCurrency";
import type { Finding } from "@/types/finding";

export default function FindingDetailPage() {
  const params = useParams<{ findingId: string }>();
  const [finding, setFinding] = useState<Finding | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const res = await fetch(`/api/risk/findings/${params.findingId}`);
        if (!res.ok) throw new Error("Finding not found.");
        const data: Finding = await res.json();
        if (!cancelled) {
          setFinding(data);
          setStatus("success");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.findingId]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard"
        className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={14} /> Back to overview
      </Link>

      {status === "loading" && (
        <Card>
          <Skeleton className="mb-3 h-5 w-48" />
          <Skeleton className="h-32 w-full" />
        </Card>
      )}

      {status === "error" && (
        <Card>
          <StateMessage
            tone="error"
            title="Could not load this finding"
            description="It may have been remediated or the ID is invalid."
          />
        </Card>
      )}

      {status === "success" && finding && (
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-figures text-sm text-ink-soft">{finding.cveId}</p>
              <h1 className="mt-1 text-lg font-semibold text-ink">{finding.assetName}</h1>
            </div>
            <div className="flex gap-1.5">
              {finding.isKev && <Badge tone="risk">Actively exploited (KEV)</Badge>}
              <Badge tone="neutral">{finding.status}</Badge>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-6 border-t border-line pt-6 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-ink-soft">CVSS score</dt>
              <dd className="font-figures mt-1 text-lg text-ink">
                {finding.cvssScore?.toFixed(1) ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">EPSS (exploit probability)</dt>
              <dd className="font-figures mt-1 text-lg text-ink">
                {finding.epssScore !== null ? formatPercent(finding.epssScore, 1) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">CWE category</dt>
              <dd className="mt-1 text-lg text-ink">{finding.cweId ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">EAL contribution</dt>
              <dd className="font-figures mt-1 text-lg text-ink">
                {finding.ealContribution !== undefined
                  ? formatCompactINR(finding.ealContribution)
                  : "—"}
              </dd>
            </div>
          </dl>

          <p className="mt-6 border-t border-line pt-4 text-sm text-ink-soft">
            Discovered {new Date(finding.discoveredAt).toLocaleDateString("en-IN")}. This
            finding&apos;s contribution to Expected Annual Loss reflects its severity, exploit
            likelihood, and the criticality of the asset it affects.
          </p>
        </Card>
      )}
    </div>
  );
}