import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import type { RiskTrendPoint } from "@/types/riskScore";

/**
 * GET /api/risk/trend?days=30&scope=org&scopeId=<uuid>
 * Dedicated trend endpoint (separate from /api/risk/summary's embedded
 * short trend) for pages that need a longer or filtered history — e.g. a
 * future "compare business units" view.
 */
export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);

  const days = Number(searchParams.get("days") ?? "30");
  const scopeType = searchParams.get("scope") ?? "org";
  const scopeId = searchParams.get("scopeId");

  if (!["org", "business_unit", "asset"].includes(scopeType)) {
    return apiError("VALIDATION_ERROR", "scope must be one of: org, business_unit, asset.");
  }
  if (scopeType !== "org" && !scopeId) {
    return apiError("VALIDATION_ERROR", "scopeId is required when scope is not 'org'.");
  }

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabase
      .from("risk_scores")
      .select("eal_value, var95_value, computed_at")
      .eq("scope_type", scopeType)
      .gte("computed_at", since)
      .order("computed_at", { ascending: true });

    query = scopeId ? query.eq("scope_id", scopeId) : query.is("scope_id", null);

    const { data, error } = await query;
    if (error) throw error;

    const trend: RiskTrendPoint[] = (data ?? []).map(
      (r: { eal_value: number; computed_at: string }) => ({
        computedAt: r.computed_at,
        ealValue: Number(r.eal_value),
      })
    );

    return NextResponse.json(trend);
  } catch (err) {
    logServerError("risk/trend", err);
    return apiError("INTERNAL_ERROR", "Could not load the risk trend.");
  }
}