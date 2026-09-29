import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { fetchRecentCves } from "@/lib/external/nvdClient";
import { apiError, logServerError } from "@/lib/api/errors";

/**
 * Pulls CVEs modified since the last successful NVD ingestion run
 * (incremental, not a full re-download — see the live-data addendum).
 * Writes raw CVE metadata; findings are only created once these CVEs are
 * attached to a specific asset (see the synthetic-assets ingestion route,
 * which links generated assets to a sample of currently known CVEs).
 */
export async function POST() {
  const supabase = createServiceRoleClient();

  try {
    const { data: lastRun } = (await supabase
      .from("ingestion_log")
      .select("ran_at")
      .eq("source", "nvd")
      .eq("status", "success")
      .order("ran_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as unknown as {
      data: { ran_at: string } | null;
    };

    const cves = await fetchRecentCves({
      lastModStartDate: lastRun?.ran_at ?? undefined,
      resultsPerPage: 200,
    });

    // Upsert into a staging area the findings-generation step reads from.
    // We reuse the `findings` table's cve metadata columns are populated
    // when a finding referencing this CVE is created — here we just cache
    // the CVE's own attributes (cvss/cwe) so later steps don't refetch NVD.
    if (cves.length > 0) {
      const { error: upsertError } = await (supabase.from("nvd_cve_cache") as any).upsert(
        cves.map((c) => ({
          cve_id: c.cveId,
          cvss_score: c.cvssScore,
          cwe_id: c.cweId,
          published_at: c.publishedAt,
          last_modified_at: c.lastModifiedAt,
          description: c.description,
        })),
        { onConflict: "cve_id" }
      );

      if (upsertError) throw upsertError;
    }

    const ingestionLog = supabase.from("ingestion_log") as any;

    await ingestionLog.insert({
      source: "nvd",
      record_count: cves.length,
      status: "success",
    });

    return NextResponse.json({ success: true, recordCount: cves.length });
  } catch (err) {
    logServerError("ingest/nvd", err);

    const ingestionLog = supabase.from("ingestion_log") as any;

    await ingestionLog.insert({
      source: "nvd",
      record_count: 0,
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
    });

    return apiError(
      "UPSTREAM_ERROR",
      "NVD ingestion failed. The dashboard will continue showing the last successfully ingested data."
    );
  }
}