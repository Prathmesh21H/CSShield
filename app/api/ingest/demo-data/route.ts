import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import { logger } from "@/lib/utils/logger";
import { DEMO_CVE_SEED } from "@/lib/demo/demoCveSeeds";
import {
  BUSINESS_UNIT_NAMES,
  generateSyntheticAssetSeeds,
  randomFindingsPerAsset,
} from "@/supabase/seed/syntheticOrgSeed";
import { runMonteCarloSimulation, type SimulationFinding } from "@/lib/risk-engine/monteCarlo";
import type { Criticality } from "@/types/asset";

/**
 * The single "make this application show real numbers right now" button.
 * This is what was missing: the app started, but there was no seeded
 * company data and no vulnerability data that didn't depend on a working
 * NVD_API_KEY. This route does, in order:
 *
 *   1. Seed nvd_cve_cache with a small set of REAL, well-documented CVEs
 *      (lib/demo/demoCveSeed.ts) — works with zero external API calls.
 *   2. Generate a synthetic organization (business units + assets) via
 *      the same shared seed module the "real" ingestion flow uses.
 *   3. Attach those demo CVEs to the generated assets as findings.
 *   4. Run the Monte Carlo risk engine immediately and store the first
 *      risk_scores row, so the dashboard has something to show without
 *      a separate manual "compute risk" step.
 *
 * Safe to call on an empty database. Calling it again on a database that
 * already has assets will ADD another synthetic organization on top —
 * see the `reset` flag if you want a clean slate first.
 */
export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const log = logger("ingest/demo-data");

  let assetCount = 25;
  let reset = false;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.assetCount === "number") assetCount = body.assetCount;
    if (typeof body.reset === "boolean") reset = body.reset;
  } catch {
    // No body — use defaults.
  }

  try {
    if (reset) {
      log.info("Resetting existing company data before seeding demo data");
      // Order matters for FK constraints: findings -> assets -> business_units,
      // and risk_scores/optimization_runs reference findings only indirectly
      // (by ID inside JSON), so they're cleared too to avoid stale contributor
      // references pointing at findings that no longer exist.
      await supabase.from("findings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("assets").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("business_units").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("risk_scores").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("optimization_runs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    }

    // 1. Seed the CVE cache with real, static demo data (idempotent upsert —
    // running this repeatedly never creates duplicates).
    const { error: cveUpsertError } = await supabase.from("nvd_cve_cache").upsert(
      DEMO_CVE_SEED.map((c) => ({
        cve_id: c.cveId,
        cvss_score: c.cvssScore,
        cwe_id: c.cweId,
        is_kev: c.isKev,
        epss_score: null, // intentionally null — see demoCveSeed.ts header comment
        description: c.description,
        published_at: null,
        last_modified_at: null,
      })),
      { onConflict: "cve_id" }
    );
    if (cveUpsertError) throw cveUpsertError;

    await supabase.from("ingestion_log").insert({
      source: "synthetic",
      record_count: DEMO_CVE_SEED.length,
      status: "success",
    });

    // 2. Generate the synthetic organization.
    const { data: businessUnits, error: buError } = await supabase
      .from("business_units")
      .insert(BUSINESS_UNIT_NAMES.map((name) => ({ name })))
      .select("id");
    if (buError) throw buError;
    if (!businessUnits || businessUnits.length === 0) {
      throw new Error("Failed to create business units.");
    }

    const assetSeeds = generateSyntheticAssetSeeds(assetCount);
    const assetRows = assetSeeds.map((seed) => ({
      name: seed.name,
      business_unit_id: businessUnits[Math.floor(Math.random() * businessUnits.length)].id,
      criticality: seed.criticality,
      internet_facing: seed.internetFacing,
    }));

    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .insert(assetRows)
      .select("id, criticality, internet_facing");
    if (assetError) throw assetError;
    if (!assets || assets.length === 0) {
      throw new Error("Failed to create assets.");
    }

    // 3. Attach demo CVEs to assets as findings.
    const findingRows: Array<Record<string, unknown>> = [];
    for (const asset of assets) {
      const findingsPerAsset = randomFindingsPerAsset();
      const shuffled = [...DEMO_CVE_SEED].sort(() => Math.random() - 0.5);

      for (const cve of shuffled.slice(0, findingsPerAsset)) {
        findingRows.push({
          asset_id: asset.id,
          cve_id: cve.cveId,
          cvss_score: cve.cvssScore,
          epss_score: null,
          is_kev: cve.isKev,
          cwe_id: cve.cweId,
          status: "open",
        });
      }
    }

    const { data: insertedFindings, error: findingError } = await supabase
      .from("findings")
      .upsert(findingRows, { onConflict: "asset_id,cve_id" })
      .select("id, asset_id, cvss_score, epss_score, is_kev, cve_id");
    if (findingError) throw findingError;

    await supabase.from("ingestion_log").insert({
      source: "synthetic",
      record_count: (businessUnits?.length ?? 0) + assets.length + (insertedFindings?.length ?? 0),
      status: "success",
    });

    // 4. Compute risk immediately, so the dashboard isn't empty after this call.
    const assetById = new Map(assets.map((a) => [a.id, a]));
    const simulationFindings: SimulationFinding[] = (insertedFindings ?? []).map((f) => {
      const asset = assetById.get(f.asset_id)!;
      return {
        id: f.id,
        assetId: f.asset_id,
        assetCriticality: asset.criticality as Criticality,
        assetInternetFacing: asset.internet_facing,
        cveId: f.cve_id,
        cvssScore: f.cvss_score,
        epssScore: f.epss_score,
        isKev: f.is_kev,
      };
    });

    const result = runMonteCarloSimulation(simulationFindings);

    const { error: riskInsertError } = await supabase.from("risk_scores").insert({
      scope_type: "org",
      scope_id: null,
      eal_value: result.ealValue,
      var95_value: result.var95Value,
      top_contributors: result.perFindingContribution,
      computed_at: new Date().toISOString(),
    });
    if (riskInsertError) throw riskInsertError;

    log.info("Demo data bootstrap complete", {
      businessUnits: businessUnits.length,
      assets: assets.length,
      findings: insertedFindings?.length ?? 0,
      ealValue: result.ealValue,
    });

    return NextResponse.json({
      success: true,
      businessUnitsCreated: businessUnits.length,
      assetsCreated: assets.length,
      findingsCreated: insertedFindings?.length ?? 0,
      ealValue: result.ealValue,
      var95Value: result.var95Value,
    });
  } catch (err) {
    logServerError("ingest/demo-data", err);
    return apiError(
      "INTERNAL_ERROR",
      "Could not seed demo data. Check that all four Supabase migrations have been run."
    );
  }
}