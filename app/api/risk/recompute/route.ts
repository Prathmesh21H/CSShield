import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { runMonteCarloSimulation, type SimulationFinding } from "@/lib/risk-engine/monteCarlo";
import { rankContributors } from "@/lib/risk-engine/contributors";
import { apiError, logServerError } from "@/lib/api/errors";
import type { Criticality } from "@/types/asset";

/**
 * Runs the risk engine and writes a new risk_scores row. This is the ONLY
 * place the Monte Carlo simulation runs — never inside a GET request a
 * dashboard is waiting on (see the optimization addendum's "never compute
 * expensive things inside a user's request" rule). Trigger this from the
 * admin "Refresh Data" flow, or a Vercel Cron job, after ingestion completes.
 */
export async function POST() {
  const supabase = createServiceRoleClient();

  try {
    const { data: findingRows, error: findingsError } = await supabase
      .from("findings")
      .select(
        "id, asset_id, cve_id, cvss_score, epss_score, is_kev, assets(criticality, internet_facing)"
      )
      .eq("status", "open");

    if (findingsError) throw findingsError;

    if (!findingRows || findingRows.length === 0) {
      return apiError(
        "VALIDATION_ERROR",
        "No open findings to compute risk from. Run ingestion and synthetic-asset generation first."
      );
    }

    const simulationInput: SimulationFinding[] = findingRows.map((f: any) => ({
      id: f.id,
      assetId: f.asset_id,
      assetCriticality: f.assets.criticality as Criticality,
      assetInternetFacing: f.assets.internet_facing as boolean,
      cveId: f.cve_id,
      cvssScore: f.cvss_score,
      epssScore: f.epss_score,
      isKev: f.is_kev,
    }));

    const result = runMonteCarloSimulation(simulationInput);
    const ranked = rankContributors(result, 10);

    const { error: insertError } = await supabase
      .from("risk_scores")
      .insert({
        scope_type: "org",
        scope_id: null,
        eal_value: result.ealValue,
        var95_value: result.var95Value,
        top_contributors: ranked,
      } as never);

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      ealValue: result.ealValue,
      var95Value: result.var95Value,
      findingsConsidered: simulationInput.length,
    });
  } catch (err) {
    logServerError("risk/recompute", err);
    return apiError("INTERNAL_ERROR", "Risk recomputation failed.");
  }
}