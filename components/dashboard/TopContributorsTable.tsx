import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StateMessage } from "@/components/ui/StateMessage";
import { formatCompactINR } from "@/lib/utils/formatCurrency";
import type { Finding } from "@/types/finding";

interface TopContributorsTableProps {
  contributors: Finding[];
  status: "loading" | "success" | "empty" | "error";
}

export function TopContributorsTable({ contributors, status }: TopContributorsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top risk contributors</CardTitle>
      </CardHeader>

      {status === "loading" && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {status === "error" && (
        <StateMessage tone="error" title="Could not load contributing findings" />
      )}

      {status !== "loading" && status !== "error" && contributors.length === 0 && (
        <StateMessage
          title="No open findings"
          description="Once vulnerability data is ingested, the highest-impact findings will appear here."
        />
      )}

      {status !== "loading" && status !== "error" && contributors.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-soft">
              <th className="pb-2 font-medium">Asset</th>
              <th className="pb-2 font-medium">CVE</th>
              <th className="pb-2 font-medium">Flags</th>
              <th className="pb-2 text-right font-medium">EAL contribution</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((finding) => (
              <tr key={finding.id} className="border-b border-line last:border-0">
                <td className="py-3">
                  <Link
                    href={`/analyst/${finding.id}`}
                    className="text-ink hover:text-accent hover:underline"
                  >
                    {finding.assetName}
                  </Link>
                </td>
                <td className="py-3 font-figures text-ink-soft">{finding.cveId}</td>
                <td className="py-3">
                  <div className="flex gap-1.5">
                    {finding.isKev && <Badge tone="risk">Exploited</Badge>}
                    {finding.epssScore !== null && finding.epssScore > 0.5 && (
                      <Badge tone="warn">High EPSS</Badge>
                    )}
                  </div>
                </td>
                <td className="font-figures py-3 text-right text-ink">
                  {finding.ealContribution !== undefined
                    ? formatCompactINR(finding.ealContribution)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}