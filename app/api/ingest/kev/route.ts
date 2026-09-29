import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchKevCatalog } from "@/lib/external/kevClient";
import { apiError, logServerError } from "@/lib/api/errors";

export async function POST() {
  // The generated Supabase schema currently does not include these tables,
  // causing their operations to be inferred as `never`.
  const supabase = createServiceRoleClient() as any;

  try {
    const kevRecords = await fetchKevCatalog();
    const kevMap = new Map(kevRecords.map((r) => [r.cveId, r]));

    const { data: cachedCves, error: fetchError } = await supabase
      .from("nvd_cve_cache")
      .select("cve_id");

    if (fetchError) throw fetchError;

    let matchedCount = 0;
    for (const row of cachedCves ?? []) {
      const kevRecord = kevMap.get(row.cve_id);
      if (!kevRecord) continue;

      const { error: updateError } = await supabase
        .from("nvd_cve_cache")
        .update({
          is_kev: true,
          kev_date_added: kevRecord.dateAdded,
        })
        .eq("cve_id", row.cve_id);

      if (updateError) throw updateError;
      matchedCount++;
    }

    await supabase.from("ingestion_log").insert({
      source: "kev",
      record_count: matchedCount,
      status: "success",
    });

    return NextResponse.json({
      success: true,
      recordCount: matchedCount,
      totalKevEntries: kevRecords.length,
    });
  } catch (err) {
    logServerError("ingest/kev", err);

    await supabase.from("ingestion_log").insert({
      source: "kev",
      record_count: 0,
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
    });

    return apiError(
      "UPSTREAM_ERROR",
      "CISA KEV ingestion failed. Exploitation flags will use the last known data."
    );
  }
}