import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import type { Asset, Criticality } from "@/types/asset";

const CRITICALITY_TONE: Record<Criticality, "neutral" | "warn" | "risk"> = {
  low: "neutral",
  medium: "neutral",
  high: "warn",
  critical: "risk",
};

interface AssetTableProps {
  assets: Asset[];
  status: "loading" | "success" | "error";
  onDelete: (id: string) => Promise<boolean>;
}

export function AssetTable({ assets, status, onDelete }: AssetTableProps) {
  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return <StateMessage tone="error" title="Could not load assets" />;
  }

  if (assets.length === 0) {
    return (
      <StateMessage
        title="No assets yet"
        description="Add your first asset above, or use 'Load demo data' on the Data Sources page to get started quickly."
      />
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-line text-xs text-ink-soft">
          <th className="pb-2 font-medium">Asset</th>
          <th className="pb-2 font-medium">Business unit</th>
          <th className="pb-2 font-medium">Criticality</th>
          <th className="pb-2 font-medium">Exposure</th>
          <th className="pb-2 text-right font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id} className="border-b border-line last:border-0">
            <td className="py-3 text-ink">{asset.name}</td>
            <td className="py-3 text-ink-soft">{asset.businessUnitName}</td>
            <td className="py-3">
              <Badge tone={CRITICALITY_TONE[asset.criticality]}>{asset.criticality}</Badge>
            </td>
            <td className="py-3 text-ink-soft">
              {asset.internetFacing ? "Internet-facing" : "Internal only"}
            </td>
            <td className="py-3 text-right">
              <Button variant="ghost" size="sm" onClick={() => onDelete(asset.id)}>
                Remove
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}