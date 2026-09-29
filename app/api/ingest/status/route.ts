import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";

/**
 * Expected staleness thresholds, matched to each source's real-world
 * update frequency (see the live-data addendum) — this is what decides
 * whether the admin page shows "Up to date" or "Stale" for each source.
 */
const STALE_THRESHOLD_MS: Record<"nvd" | "epss" | "kev", number> = {
  nvd: 6 * 60 * 60 * 1000, // 6 hours
  epss: 30 * 60 * 60 * 1000, // 30 hours (EPSS updates daily; a little slack)
  kev: 12 * 60 * 60 * 1000, // 12 hours
};

export async function GET() {
  const supabase = createServiceRoleClient();

  try {
    const sources: Array<"nvd" | "epss" | "kev"> = ["nvd", "epss", "kev"];

    type IngestionLogRow = {
      ran_at: string;
      record_count: number | null;
      status: string;
    };

    const results = await Promise.all(
      sources.map(async (source) => {
        const { data, error } = (await supabase
          .from("ingestion_log")
          .select("ran_at, record_count, status")
          .eq("source", source)
          .order("ran_at", { ascending: false })
          .limit(1)
          .maybeSingle()) as {
          data: IngestionLogRow | null;
          error: unknown;
        };

        const lastRun = data;

        if (error) throw error;

        if (!lastRun) {
          return { id: source, lastRunAt: null, recordCount: null, status: "failed" as const };
        }

        if (lastRun.status === "failed") {
          return {
            id: source,
            lastRunAt: lastRun.ran_at,
            recordCount: lastRun.record_count,
            status: "failed" as const,
          };
        }

        const age = Date.now() - new Date(lastRun.ran_at).getTime();
        const isStale = age > STALE_THRESHOLD_MS[source];

        return {
          id: source,
          lastRunAt: lastRun.ran_at,
          recordCount: lastRun.record_count,
          status: (isStale ? "stale" : "success") as "stale" | "success",
        };
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    logServerError("ingest/status", err);
    return apiError("INTERNAL_ERROR", "Could not load ingestion status.");
  }
}