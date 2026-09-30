import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { rankContributors } from "@/lib/risk-engine/contributors";
import { apiError, logServerError } from "@/lib/api/errors";
import type { Finding } from "@/types/finding";

/**
 * Reads the latest org-level risk_scores row's stored per-finding
 * contributions (populated by the Monte Carlo run in /api/risk/summary
 * POST), ranks them, and joins against findings/assets for display —
 * this is what makes every number on the dashboard traceable back to a
 * specific CVE on a specific asset, per the explainability requirement.
 */
export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "10");

  try {
    const { data: latest, error: latestError } = await supabase
      .from("risk_scores")
      .select("eal_value, top_contributors")
      .eq("scope_type", "org")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) throw latestError;

    if (!latest || !latest.top_contributors || latest.top_contributors.length === 0) {
      return NextResponse.json<Finding[]>([]);
    }

    const ranked = rankContributors(
      { ealValue: Number(latest.eal_value), var95Value: 0, perFindingContribution: latest.top_contributors },
      limit
    );

    const findingIds = ranked.map((r) => r.findingId);

    const { data: findingRows, error: findingError } = await supabase
      .from("findings")
      .select("id, cve_id, cvss_score, epss_score, is_kev, cwe_id, status, discovered_at, assets!inner(name)")
      .in("id", findingIds);

    if (findingError) throw findingError;

    const findingById = new Map((findingRows ?? []).map((r: any) => [r.id, r]));

    const response: Finding[] = ranked
      .map((r) => {
        const row = findingById.get(r.findingId);
        if (!row) return null;

        const finding: Finding = {
          id: row.id,
          assetId: row.assets?.id ?? "",
          assetName: row.assets?.name ?? "Unknown asset",
          cveId: row.cve_id,
          cvssScore: row.cvss_score,
          epssScore: row.epss_score,
          isKev: row.is_kev,
          cweId: row.cwe_id,
          status: row.status,
          discoveredAt: row.discovered_at,
          ealContribution: r.ealContribution,
        };
        return finding;
      })
      .filter((f): f is Finding => f !== null);

    return NextResponse.json(response);
  } catch (err) {
    logServerError("risk/contributors", err);
    return apiError("INTERNAL_ERROR", "Could not load top risk contributors.");
  }
}