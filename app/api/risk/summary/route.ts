import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { runMonteCarloSimulation, type SimulationFinding } from "@/lib/risk-engine/monteCarlo";
import { apiError, logServerError } from "@/lib/api/errors";
import type { RiskSummary, RiskTrendPoint } from "@/types/riskScore";
import type { Criticality } from "@/types/asset";

/**
 * GET reads the last-computed org-level risk score plus recent trend and
 * data freshness — it NEVER runs the simulation itself. This is the
 * "dashboard reads, background job writes" rule from the performance
 * addendum: a dashboard load must be instant, not wait on a Monte Carlo run.
 */
export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const { data: latest, error: latestError } = await supabase
      .from("risk_scores")
      .select("scope_type, scope_id, eal_value, var95_value, computed_at")
      .eq("scope_type", "org")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) throw latestError;

    const { data: trendRows, error: trendError } = await supabase
      .from("risk_scores")
      .select("eal_value, computed_at")
      .eq("scope_type", "org")
      .order("computed_at", { ascending: false })
      .limit(30);

    if (trendError) throw trendError;

    const trend: RiskTrendPoint[] = (trendRows ?? [])
      .map((r: { eal_value: number; computed_at: string }) => ({
        computedAt: r.computed_at,
        ealValue: Number(r.eal_value),
      }))
      .reverse();

    const freshness = await getDataFreshness(supabase);

    if (!latest) {
      return NextResponse.json<RiskSummary | { current: null }>({
        current: null,
        trend: [],
        dataFreshness: freshness,
      });
    }

    const summary: RiskSummary = {
      current: {
        scopeType: "org",
        scopeId: null,
        ealValue: Number(latest.eal_value),
        var95Value: Number(latest.var95_value),
        computedAt: latest.computed_at,
      },
      trend,
      dataFreshness: freshness,
    };

    return NextResponse.json(summary);
  } catch (err) {
    logServerError("risk/summary GET", err);
    return apiError("INTERNAL_ERROR", "Could not load the risk summary.");
  }
}

/**
 * POST runs the Monte Carlo simulation against all currently open findings
 * and stores a new org-level risk_scores row. Trigger this from the admin
 * "Refresh Data" flow after ingestion, or from a scheduled job — never
 * automatically from a GET request.
 */
export async function POST(_request: NextRequest) {
  const supabase = createServiceRoleClient();

  try {
    const { data: findingRows, error: findingsError } = await supabase
      .from("findings")
      .select(
        "id, cvss_score, epss_score, is_kev, assets!inner(id, criticality, internet_facing)"
      )
      .eq("status", "open");

    if (findingsError) throw findingsError;

    if (!findingRows || findingRows.length === 0) {
      return apiError(
        "VALIDATION_ERROR",
        "No open findings to compute risk from. Run ingestion and synthetic asset generation first."
      );
    }

    const simulationFindings: SimulationFinding[] = findingRows.map((row: any) => ({
      id: row.id,
      assetId: row.assets.id,
      assetCriticality: row.assets.criticality as Criticality,
      assetInternetFacing: row.assets.internet_facing,
      cveId: row.cve_id,
      cvssScore: row.cvss_score,
      epssScore: row.epss_score,
      isKev: row.is_kev,
    }));

    const result = runMonteCarloSimulation(simulationFindings);

    const { error: insertError } = await supabase.from("risk_scores").insert({
      scope_type: "org",
      scope_id: null,
      eal_value: result.ealValue,
      var95_value: result.var95Value,
      top_contributors: result.perFindingContribution, // full per-finding list, not just "top" — see contributors route for ranking/slicing
      computed_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      ealValue: result.ealValue,
      var95Value: result.var95Value,
      findingsEvaluated: simulationFindings.length,
    });
  } catch (err) {
    logServerError("risk/summary POST", err);
    return apiError("INTERNAL_ERROR", "Risk computation failed.");
  }
}

async function getDataFreshness(supabase: ReturnType<typeof createServiceRoleClient>) {
  const sources: Array<"nvd" | "epss" | "kev"> = ["nvd", "epss", "kev"];
  const staleThresholdMs = 24 * 60 * 60 * 1000; // 24h — conservative combined threshold for this summary banner

  const timestamps: Record<string, string | null> = {};

  for (const source of sources) {
    const { data } = await supabase
      .from("ingestion_log")
      .select("ran_at")
      .eq("source", source)
      .eq("status", "success")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    timestamps[source] = data?.ran_at ?? null;
  }

  const isStale = Object.values(timestamps).some(
    (ts) => !ts || Date.now() - new Date(ts).getTime() > staleThresholdMs
  );

  return {
    nvd: timestamps.nvd,
    epss: timestamps.epss,
    kev: timestamps.kev,
    isStale,
  };
}