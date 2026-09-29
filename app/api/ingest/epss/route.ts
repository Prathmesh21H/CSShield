import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchEpssScores } from "@/lib/external/epssClient";
import { apiError, logServerError } from "@/lib/api/errors";

/**
 * EPSS recalculates once daily (see the live-data addendum) — this route
 * is cheap to call more often than that since it only updates cached CVEs
 * already known from NVD, but calling it more than once a day will just
 * re-write the same scores.
 */
export async function POST() {
  // These ingestion tables are not represented in the generated Supabase
  // types, so mutation payloads are otherwise inferred as `never`.
  const supabase = createServiceRoleClient() as any;

  try {
    const { data: cachedCves, error: fetchError } = await supabase
      .from("nvd_cve_cache")
      .select("cve_id");

    if (fetchError) throw fetchError;

    const cveIds = (cachedCves ?? []).map((r: { cve_id: string }) => r.cve_id);

    if (cveIds.length === 0) {
      await supabase.from("ingestion_log").insert({
        source: "epss",
        record_count: 0,
        status: "success",
      });
      return NextResponse.json({
        success: true,
        recordCount: 0,
        note: "No cached CVEs yet — run NVD ingestion first.",
      });
    }

    const epssRecords = await fetchEpssScores(cveIds);

    for (const record of epssRecords) {
      const { error: updateError } = await supabase
        .from("nvd_cve_cache")
        .update({ epss_score: record.epssScore })
        .eq("cve_id", record.cveId);

      if (updateError) throw updateError;
    }

    await supabase.from("ingestion_log").insert({
      source: "epss",
      record_count: epssRecords.length,
      status: "success",
    });

    return NextResponse.json({ success: true, recordCount: epssRecords.length });
  } catch (err) {
    logServerError("ingest/epss", err);

    await supabase.from("ingestion_log").insert({
      source: "epss",
      record_count: 0,
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
    });

    return apiError(
      "UPSTREAM_ERROR",
      "EPSS ingestion failed. Likelihood calculations will use the last known scores."
    );
  }
}