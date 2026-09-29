import { NextRequest, NextResponse } from "next/server";
import { faker } from "@faker-js/faker";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import type { Criticality } from "@/types/asset";

/**
 * Generates a synthetic organization (business units + assets) and attaches
 * REAL cached CVEs (from nvd_cve_cache, populated by NVD/EPSS/KEV ingestion)
 * to those assets. Per the build prompt's realism rule: only the company/
 * asset layer is synthetic — the vulnerability data itself always comes
 * from the live APIs, never invented here.
 */

const BUSINESS_UNIT_NAMES = ["Retail Banking", "Corporate Treasury", "Digital Channels", "Operations"];
const CRITICALITY_WEIGHTS: Array<{ value: Criticality; weight: number }> = [
  { value: "low", weight: 0.3 },
  { value: "medium", weight: 0.35 },
  { value: "high", weight: 0.25 },
  { value: "critical", weight: 0.1 },
];

function weightedCriticality(): Criticality {
  const r = Math.random();
  let cumulative = 0;
  for (const { value, weight } of CRITICALITY_WEIGHTS) {
    cumulative += weight;
    if (r <= cumulative) return value;
  }
  return "medium";
}

export async function POST(request: NextRequest) {
  // These tables are not represented in the generated database types.
  const supabase = createServiceRoleClient() as any;

  let assetCount = 30;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.assetCount === "number") assetCount = body.assetCount;
  } catch {
    // No body provided — use the default asset count.
  }

  try {
    const { data: cachedCves, error: cveError } = await supabase
      .from("nvd_cve_cache")
      .select("cve_id, cvss_score, epss_score, is_kev, cwe_id")
      .limit(500);

    if (cveError) throw cveError;

    if (!cachedCves || cachedCves.length === 0) {
      return apiError(
        "VALIDATION_ERROR",
        "No cached CVE data available yet. Run NVD ingestion before generating synthetic assets, so findings attach to real vulnerability data rather than nothing."
      );
    }

    // Business units
    const { data: businessUnits, error: buError } = await supabase
      .from("business_units")
      .insert(BUSINESS_UNIT_NAMES.map((name) => ({ name })))
      .select("id");

    if (buError) throw buError;

    // Assets, each linked to a random business unit
    const assetRows = Array.from({ length: assetCount }).map(() => ({
      name: `${faker.hacker.noun()}-${faker.string.alphanumeric(4).toUpperCase()}`,
      business_unit_id: businessUnits[Math.floor(Math.random() * businessUnits.length)].id,
      criticality: weightedCriticality(),
      internet_facing: Math.random() < 0.35,
    }));

    const { data: assets, error: assetError } = await supabase
      .from("assets")
      .insert(assetRows)
      .select("id");

    if (assetError) throw assetError;

    // Attach 1–5 real, cached CVEs to each asset.
    const findingRows: Array<Record<string, unknown>> = [];
    for (const asset of assets) {
      const findingsPerAsset = 1 + Math.floor(Math.random() * 5);
      const shuffled = [...cachedCves].sort(() => Math.random() - 0.5);

      for (const cve of shuffled.slice(0, findingsPerAsset)) {
        findingRows.push({
          asset_id: asset.id,
          cve_id: cve.cve_id,
          cvss_score: cve.cvss_score,
          epss_score: cve.epss_score,
          is_kev: cve.is_kev,
          cwe_id: cve.cwe_id,
          status: "open",
        });
      }
    }

    const { error: findingError } = await supabase
      .from("findings")
      .upsert(findingRows, { onConflict: "asset_id,cve_id" });

    if (findingError) throw findingError;

    await supabase.from("ingestion_log").insert({
      source: "synthetic",
      record_count: assets.length + findingRows.length,
      status: "success",
    });

    return NextResponse.json({
      success: true,
      businessUnitsCreated: businessUnits.length,
      assetsCreated: assets.length,
      findingsCreated: findingRows.length,
    });
  } catch (err) {
    logServerError("ingest/synthetic-assets", err);

    await supabase.from("ingestion_log").insert({
      source: "synthetic",
      record_count: 0,
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
    });

    return apiError("INTERNAL_ERROR", "Could not generate synthetic organization data.");
  }
}