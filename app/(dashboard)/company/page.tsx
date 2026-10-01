"use client";

import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { StateMessage } from "@/components/ui/StateMessage";
import { BusinessUnitForm } from "@/components/company/BusinessUniForm";
import { AssetForm } from "@/components/company/AssetForm";
import { AssetTable } from "@/components/company/AssetTable";
import { useCompanyData } from "@/hooks/useCompanyData";

export default function CompanyDataPage() {
  const { businessUnits, assets, status, addBusinessUnit, addAsset, deleteAsset } = useCompanyData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Company data</h1>
        <p className="text-sm text-ink-soft">
          Add your organization&apos;s business units and systems here. New assets are
          automatically attached to currently known vulnerabilities so they factor into
          the risk calculation right away.
        </p>
      </div>

      {assets.length === 0 && businessUnits.length === 0 && status === "success" && (
        <StateMessage
          title="Nothing here yet — two ways to get started"
          description="Fill in the forms below to enter your own company's systems, or go to Data Sources and click 'Load demo data' to instantly populate a sample organization so you can see the platform working end to end."
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Business units</CardTitle>
        </CardHeader>
        <BusinessUnitForm onAdd={addBusinessUnit} />
        {businessUnits.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {businessUnits.map((bu) => (
              <li
                key={bu.id}
                className="rounded-[var(--radius-pill)] border border-line bg-paper px-2.5 py-1 text-xs text-ink-soft"
              >
                {bu.name}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add an asset</CardTitle>
        </CardHeader>
        <AssetForm businessUnits={businessUnits} onAdd={addAsset} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current assets ({assets.length})</CardTitle>
        </CardHeader>
        <AssetTable assets={assets} status={status === "loading" ? "loading" : status === "error" ? "error" : "success"} onDelete={deleteAsset} />
      </Card>
    </div>
  );
}