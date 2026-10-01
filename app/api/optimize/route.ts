import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { optimizeControlSelection, type OptimizerControl, type OptimizerFinding } from "@/lib/optimizer/knapsack";
import { apiError, logServerError } from "@/lib/api/errors";
import type { OptimizationResult, Control } from "@/types/control";

export async function POST(request: NextRequest) {
  const supabase = createServiceRoleClient();

  let body: { budget?: number };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const budget = body.budget;
  if (typeof budget !== "number" || budget <= 0) {
    return apiError("VALIDATION_ERROR", "budget must be a positive number.");
  }

  try {
    // 1. Latest simulation's per-finding EAL contributions.
    const { data: latestScoreRow, error: scoreError } = await supabase
      .from("risk_scores")
      .select("eal_value, top_contributors")
      .eq("scope_type", "org")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (scoreError) throw scoreError;

    const latestScore = latestScoreRow as {
      eal_value: number;
      top_contributors: Array<{ findingId: string; ealContribution: number }> | null;
    } | null;

    if (!latestScore || !latestScore.top_contributors?.length) {
      return apiError(
        "VALIDATION_ERROR",
        "No risk calculation available yet. Compute the risk summary before running the optimizer."
      );
    }

    const contributions: Array<{ findingId: string; ealContribution: number }> =
      latestScore.top_contributors;
    const findingIds = contributions.map((c) => c.findingId);

    // 2. CWE category for each contributing finding (needed to match against controls).
    const { data: findingRows, error: findingError } = await supabase
      .from("findings")
      .select("id, cwe_id")
      .in("id", findingIds);

    if (findingError) throw findingError;

    const cweById = new Map<string, string | null>(
      (findingRows ?? []).map(
        (f: { id: string; cwe_id: string | null }): [string, string | null] => [f.id, f.cwe_id]
      )
    );

    const optimizerFindings: OptimizerFinding[] = contributions.map((c) => ({
      id: c.findingId,
      cweId: cweById.get(c.findingId) ?? null,
      ealContribution: c.ealContribution,
    }));

    // 3. Control catalog.
    const { data: controlRows, error: controlError } = await supabase
      .from("controls")
      .select("id, name, cost, est_risk_reduction_pct, mitigates_cwe_ids, framework_refs");

    if (controlError) throw controlError;

    const optimizerControls: OptimizerControl[] = (controlRows ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      cost: Number(c.cost),
      estRiskReductionPct: Number(c.est_risk_reduction_pct),
      mitigatesCweIds: c.mitigates_cwe_ids ?? [],
    }));

    // 4. Solve.
    const solved = optimizeControlSelection(optimizerControls, optimizerFindings, budget);

    const selectedControls: Control[] = (controlRows ?? [])
      .filter((c: any) => solved.selectedControlIds.includes(c.id))
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        cost: Number(c.cost),
        estRiskReductionPct: Number(c.est_risk_reduction_pct),
        frameworkRefs: c.framework_refs ?? {},
      }));

    // 5. Persist the run for audit trail.
    const { error: insertError } = await (supabase.from("optimization_runs") as any).insert({
      budget,
      selected_control_ids: solved.selectedControlIds,
      eal_before: solved.ealBefore,
      projected_eal: solved.projectedEal,
      rosi: solved.rosi,
    });

    if (insertError) throw insertError;

    const result: OptimizationResult = {
      budget,
      selectedControls,
      projectedEal: solved.projectedEal,
      ealBefore: solved.ealBefore,
      rosi: solved.rosi,
      computedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    logServerError("optimize", err);
    return apiError("INTERNAL_ERROR", "Could not compute an investment recommendation.");
  }
}