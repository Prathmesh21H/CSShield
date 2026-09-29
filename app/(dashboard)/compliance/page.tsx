"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { ComplianceMatrixTable } from "@/components/compliance/ComplianceMatrixTable";
import type { ComplianceMatrix } from "@/types/compliance";

const FRAMEWORKS = ["NIST CSF", "CIS Controls", "ISO 27001", "RBI CSF", "SEBI CSCRF"];

export default function CompliancePage() {
  const [framework, setFramework] = useState(FRAMEWORKS[0]);
  const [matrix, setMatrix] = useState<ComplianceMatrix | null>(null);
  const [status, setStatus] = useState<"loading" | "success" | "empty" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const res = await fetch(
          `/api/compliance/matrix?framework=${encodeURIComponent(framework)}`
        );
        if (!res.ok) throw new Error("Compliance service error");
        const data: ComplianceMatrix = await res.json();
        if (!cancelled) {
          setMatrix(data);
          setStatus(data.rows.length > 0 ? "success" : "empty");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [framework]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Compliance coverage</h1>
        <p className="text-sm text-ink-soft">
          How current findings and controls map to each framework&apos;s requirements.
        </p>
      </div>

      <div className="flex gap-1.5">
        {FRAMEWORKS.map((fw) => (
          <button
            key={fw}
            onClick={() => setFramework(fw)}
            className={`border px-3 py-1.5 text-sm transition-colors ${
              framework === fw
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-ink-soft hover:border-line-strong"
            }`}
          >
            {fw}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{framework} coverage</CardTitle>
        </CardHeader>
        <ComplianceMatrixTable matrix={matrix} status={status} />
      </Card>
    </div>
  );
}