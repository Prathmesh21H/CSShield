"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StateMessage } from "@/components/ui/StateMessage";
import type { Criticality } from "@/types/asset";

interface BusinessUnit {
  id: string;
  name: string;
}

interface AssetFormProps {
  businessUnits: BusinessUnit[];
  onAdd: (input: {
    name: string;
    businessUnitId: string;
    criticality: Criticality;
    internetFacing: boolean;
  }) => Promise<{ success: boolean; warning?: string }>;
}

const CRITICALITY_OPTIONS: { value: Criticality; label: string }[] = [
  { value: "low", label: "Low — internal tooling, low blast radius" },
  { value: "medium", label: "Medium — internal business system" },
  { value: "high", label: "High — customer-facing or business-sensitive" },
  { value: "critical", label: "Critical — regulated data or revenue-critical" },
];

export function AssetForm({ businessUnits, onAdd }: AssetFormProps) {
  const [name, setName] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState(businessUnits[0]?.id ?? "");
  const [criticality, setCriticality] = useState<Criticality>("medium");
  const [internetFacing, setInternetFacing] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [warning, setWarning] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !businessUnitId) return;

    setStatus("saving");
    setWarning(null);

    const result = await onAdd({ name: name.trim(), businessUnitId, criticality, internetFacing });

    if (result.success) {
      setName("");
      setInternetFacing(false);
      setStatus("idle");
      if (result.warning) setWarning(result.warning);
    } else {
      setStatus("error");
    }
  }

  if (businessUnits.length === 0) {
    return (
      <StateMessage
        title="Add a business unit first"
        description="Assets belong to a business unit — create one above before adding assets."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="asset-name" className="mb-1 block text-xs font-medium text-ink-soft">
            Asset name
          </label>
          <Input
            id="asset-name"
            placeholder="e.g. customer-portal-api"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="asset-bu" className="mb-1 block text-xs font-medium text-ink-soft">
            Business unit
          </label>
          <select
            id="asset-bu"
            value={businessUnitId}
            onChange={(e) => setBusinessUnitId(e.target.value)}
            className="w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent"
          >
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="asset-criticality" className="mb-1 block text-xs font-medium text-ink-soft">
            Criticality
          </label>
          <select
            id="asset-criticality"
            value={criticality}
            onChange={(e) => setCriticality(e.target.value as Criticality)}
            className="w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-accent"
          >
            {CRITICALITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
          <input
            type="checkbox"
            checked={internetFacing}
            onChange={(e) => setInternetFacing(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Internet-facing (reachable from the public internet)
        </label>
      </div>

      {status === "error" && (
        <StateMessage tone="error" title="Could not add this asset" />
      )}
      {warning && <StateMessage title="Asset added with a note" description={warning} />}

      <Button type="submit" disabled={status === "saving"} className="self-start">
        {status === "saving" ? "Adding…" : "Add asset"}
      </Button>
    </form>
  );
}