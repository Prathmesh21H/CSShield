/**
 * CLI equivalent of POST /api/ingest/synthetic-assets — generates a
 * synthetic organization and attaches REAL cached CVEs to it, without
 * needing the Next.js dev server running. Useful for quickly (re-)seeding
 * a local or CI Supabase instance.
 *
 * Shares its generation logic with the API route via
 * supabase/seed/syntheticOrgSeed.ts — the two will never drift apart.
 *
 * Run with: npm run seed:synthetic -- --assets=40
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../lib/utils/logger";
import {
  BUSINESS_UNIT_NAMES,
  generateSyntheticAssetSeeds,
  randomFindingsPerAsset,
} from "../supabase/seed/syntheticOrgSeed";

const log = logger("generateSyntheticAssets");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local — cannot seed."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function parseAssetCountArg(): number {
  const arg = process.argv.find((a) => a.startsWith("--assets="));
  const parsed = arg ? parseInt(arg.split("=")[1], 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

async function main() {
  const assetCount = parseAssetCountArg();
  log.info(`Generating synthetic organization with ${assetCount} assets...`);

  const { data: cachedCves, error: cveError } = await supabase
    .from("nvd_cve_cache")
    .select("cve_id, cvss_score, epss_score, is_kev, cwe_id")
    .limit(500);

  if (cveError) {
    log.error("Failed to read cached CVEs", { error: cveError.message });
    process.exit(1);
  }

  if (!cachedCves || cachedCves.length === 0) {
    console.error(
      "No cached CVE data available yet. Run NVD ingestion (POST /api/ingest/nvd) " +
        "before generating synthetic assets — findings must attach to real vulnerability data."
    );
    process.exit(1);
  }

  const { data: businessUnits, error: buError } = await supabase
    .from("business_units")
    .insert(BUSINESS_UNIT_NAMES.map((name) => ({ name })))
    .select("id");

  if (buError || !businessUnits) {
    log.error("Failed to create business units", { error: buError?.message });
    process.exit(1);
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
    .select("id");

  if (assetError || !assets) {
    log.error("Failed to create assets", { error: assetError?.message });
    process.exit(1);
  }

  const findingRows: Array<Record<string, unknown>> = [];
  for (const asset of assets) {
    const findingsPerAsset = randomFindingsPerAsset();
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

  if (findingError) {
    log.error("Failed to create findings", { error: findingError.message });
    process.exit(1);
  }

  await supabase.from("ingestion_log").insert({
    source: "synthetic",
    record_count: assets.length + findingRows.length,
    status: "success",
  });

  log.info("Synthetic organization generated successfully", {
    businessUnits: businessUnits.length,
    assets: assets.length,
    findings: findingRows.length,
  });
}

main().catch((err) => {
  log.error("Unhandled error", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});