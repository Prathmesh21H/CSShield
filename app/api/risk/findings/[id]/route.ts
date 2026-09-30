import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import type { Finding } from "@/types/finding";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceRoleClient();

  try {
    const { data: row, error } = await supabase
      .from("findings")
      .select("id, cve_id, cvss_score, epss_score, is_kev, cwe_id, status, discovered_at, assets!inner(id, name)")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!row) {
      return apiError("NOT_FOUND", "This finding could not be found. It may have been remediated.");
    }

    // Look up this finding's EAL contribution from the latest simulation run,
    // if one exists — keeps the drill-down page consistent with the
    // dashboard's top-contributors figures rather than recomputing anything.
    const { data: latestScore } = await supabase
      .from("risk_scores")
      .select("top_contributors")
      .eq("scope_type", "org")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const contribution = (latestScore?.top_contributors ?? []).find(
      (c: { findingId: string; ealContribution: number }) => c.findingId === id
    );

    const finding: Finding = {
      id: row.id,
      assetId: (row as any).assets?.id ?? "",
      assetName: (row as any).assets?.name ?? "Unknown asset",
      cveId: row.cve_id,
      cvssScore: row.cvss_score,
      epssScore: row.epss_score,
      isKev: row.is_kev,
      cweId: row.cwe_id,
      status: row.status,
      discoveredAt: row.discovered_at,
      ealContribution: contribution?.ealContribution,
    };

    return NextResponse.json(finding);
  } catch (err) {
    logServerError("risk/findings/[id]", err);
    return apiError("INTERNAL_ERROR", "Could not load this finding.");
  }
}