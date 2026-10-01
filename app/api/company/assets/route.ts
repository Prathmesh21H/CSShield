
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import { getServerSession } from "@/lib/auth/session";
import { logger } from "@/lib/utils/logger";
import type { Criticality } from "@/types/asset";

const VALID_CRITICALITY: Criticality[] = ["low", "medium", "high", "critical"];

export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from("assets")
      .select("id, name, criticality, internet_facing, created_at, business_units!inner(id, name)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const assets = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      businessUnitId: row.business_units.id,
      businessUnitName: row.business_units.name,
      criticality: row.criticality,
      internetFacing: row.internet_facing,
    }));

    return NextResponse.json(assets);
  } catch (err) {
    logServerError("company/assets GET", err);
    return apiError("INTERNAL_ERROR", "Could not load assets.");
  }
}

/**
 * Creates a real (user-entered) asset and — critically — attaches a few
 * real cached CVEs to it as open findings, the same way the synthetic
 * generator does. Without this, an asset a user adds by hand would have
 * zero findings and therefore contribute nothing to the risk calculation,
 * which would make "add your own company data" a dead end. If the CVE
 * cache is empty, the asset is still created (so the form never just
 * fails), but a warning is returned telling the caller to seed CVE data
 * first — see POST /api/ingest/demo-data.
 */
export async function POST(request: NextRequest) {
  const user = await getServerSession();
  if (!user) {
    return apiError("UNAUTHORIZED", "Sign in to add company data.");
  }

  let body: {
    name?: string;
    businessUnitId?: string;
    criticality?: string;
    internetFacing?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const name = body.name?.trim();
  if (!name) return apiError("VALIDATION_ERROR", "name is required.");
  if (!body.businessUnitId) return apiError("VALIDATION_ERROR", "businessUnitId is required.");
  if (!body.criticality || !VALID_CRITICALITY.includes(body.criticality as Criticality)) {
    return apiError("VALIDATION_ERROR", `criticality must be one of: ${VALID_CRITICALITY.join(", ")}`);
  }

  const supabase = createServiceRoleClient();
  const log = logger("company/assets POST");

  try {
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .insert({
        name,
        business_unit_id: body.businessUnitId,
        criticality: body.criticality,
        internet_facing: body.internetFacing ?? false,
      })
      .select("id, name, criticality, internet_facing")
      .single();

    if (assetError) throw assetError;

    const { data: cachedCves, error: cveError } = await supabase
      .from("nvd_cve_cache")
      .select("cve_id, cvss_score, epss_score, is_kev, cwe_id")
      .limit(200);

    if (cveError) throw cveError;

    if (!cachedCves || cachedCves.length === 0) {
      log.warn("Asset created with no findings — CVE cache is empty", { assetId: asset.id });
      return NextResponse.json(
        {
          asset,
          findingsCreated: 0,
          warning:
            "No vulnerability data is cached yet, so this asset has no findings and won't affect risk calculations. Run 'Load demo data' or NVD ingestion, then re-add this asset or wait for the next synthetic-findings pass.",
        },
        { status: 201 }
      );
    }

    const findingCount = 1 + Math.floor(Math.random() * 5);
    const shuffled = [...cachedCves].sort(() => Math.random() - 0.5).slice(0, findingCount);

    const { data: findings, error: findingError } = await supabase
      .from("findings")
      .upsert(
        shuffled.map((c) => ({
          asset_id: asset.id,
          cve_id: c.cve_id,
          cvss_score: c.cvss_score,
          epss_score: c.epss_score,
          is_kev: c.is_kev,
          cwe_id: c.cwe_id,
          status: "open",
        })),
        { onConflict: "asset_id,cve_id" }
      )
      .select("id");

    if (findingError) throw findingError;

    log.info("Asset created with findings", { assetId: asset.id, findingsCreated: findings?.length ?? 0 });

    return NextResponse.json(
      { asset, findingsCreated: findings?.length ?? 0 },
      { status: 201 }
    );
  } catch (err) {
    logServerError("company/assets POST", err);
    return apiError("INTERNAL_ERROR", "Could not create the asset.");
  }
}