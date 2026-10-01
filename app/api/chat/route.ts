import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { classifyIntent } from "@/lib/ai/intents";
import { buildGroundedPrompt, type GroundingData } from "@/lib/ai/promptBuilder";
import { callBedrock } from "@/lib/ai/bedrockClient";
import { apiError, logServerError } from "@/lib/api/errors";
import type { ChatSource } from "@/types/chat";

/**
 * The only Route Handler allowed to call an LLM. Per the build prompt's
 * grounding rule: this function gathers real, already-computed numbers
 * from Supabase FIRST, then hands them to Bedrock purely to be phrased —
 * Bedrock never sees this request without that data already attached,
 * and the system prompt explicitly forbids introducing new figures.
 */
export async function POST(request: NextRequest) {
  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const question = body.question?.trim();
  if (!question) {
    return apiError("VALIDATION_ERROR", "question is required.");
  }

  const supabase = createServiceRoleClient();
  const intent = classifyIntent(question);

  try {
    const groundingData = await gatherGroundingData(supabase, intent);
    const { systemPrompt, sources } = buildGroundedPrompt(intent, groundingData);

    let answer: string;
    try {
      const bedrockResult = await callBedrock({ systemPrompt, userMessage: question });
      answer = bedrockResult.text;
    } catch (bedrockErr) {
      // Per the build prompt's Bedrock-specific rule: degrade gracefully
      // rather than crash the request — the raw data is still valid even
      // if the phrasing layer is unavailable.
      logServerError("chat (bedrock)", bedrockErr);
      return apiError(
        "UPSTREAM_ERROR",
        "Assistant is temporarily unavailable — the raw dashboard data is still accurate. " +
          (bedrockErr instanceof Error ? bedrockErr.message : "")
      );
    }

    return NextResponse.json({ answer, sources });
  } catch (err) {
    logServerError("chat", err);
    return apiError("INTERNAL_ERROR", "Could not process this question.");
  }
}

async function gatherGroundingData(
  supabase: ReturnType<typeof createServiceRoleClient>,
  intent: ReturnType<typeof classifyIntent>
): Promise<GroundingData> {
  type RiskScoreRow = {
    eal_value: number | string | null;
    var95_value: number | string | null;
    top_contributors: Array<{ findingId: string; ealContribution: number }> | null;
  };
  type OptimizationRunRow = {
    budget: number | string | null;
    selected_control_ids: string[] | null;
    projected_eal: number | string | null;
  };

  const data: GroundingData = {};

  if (intent === "highest_risk" || intent === "general_summary") {
    const { data: latestScore } = await supabase
      .from("risk_scores")
      .select("eal_value, var95_value, top_contributors")
      .eq("scope_type", "org")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const score = latestScore as RiskScoreRow | null;
    if (score) {
      data.ealValue = Number(score.eal_value);
      data.var95Value = Number(score.var95_value);

      const topFive = [...(score.top_contributors ?? [])]
        .sort((a, b) => b.ealContribution - a.ealContribution)
        .slice(0, 5);

      if (topFive.length > 0) {
        const findingIds = topFive.map((c: { findingId: string }) => c.findingId);
        const { data: findingRows } = await supabase
          .from("findings")
          .select("id, cve_id, assets!inner(name)")
          .in("id", findingIds);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const byId = new Map<string, any>(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (findingRows ?? []).map((r: any): [string, any] => [r.id, r])
        );
        data.topContributors = topFive.map((c: { findingId: string; ealContribution: number }) => {
          const row = byId.get(c.findingId);
          return {
            cveId: row?.cve_id ?? "unknown CVE",
            assetName: row?.assets?.name ?? "unknown asset",
            ealContribution: c.ealContribution,
          };
        });
      }
    }
  }

  if (intent === "budget_recommendation") {
    const { data: latestRun } = await supabase
      .from("optimization_runs")
      .select("budget, selected_control_ids, projected_eal")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const optimizationRun = latestRun as OptimizationRunRow | null;
    if (optimizationRun) {
      data.optimizerBudget = Number(optimizationRun.budget);
      data.optimizerProjectedEal = Number(optimizationRun.projected_eal);

      const { data: controlRows } = await supabase
        .from("controls")
        .select("id, name, cost")
        .in("id", optimizationRun.selected_control_ids ?? []);

      data.optimizerControls = (controlRows ?? []).map((c: any) => ({
        name: c.name,
        cost: Number(c.cost),
      }));
    }
  }

  if (intent === "compliance_status") {
    // Reuse the same coverage logic as the compliance matrix endpoint,
    // scoped to gaps only, across the default framework — kept intentionally
    // simple here (NIST CSF only) rather than duplicating the full matrix
    // logic; the Compliance page is the place for a complete breakdown.
    const { data: framework } = (await supabase
      .from("frameworks")
      .select("id, name")
      .eq("name", "NIST CSF")
      .maybeSingle()) as { data: { id: string; name: string } | null };

    if (framework) {
      const { data: frameworkControls } = await supabase
        .from("framework_controls")
        .select("control_ref, control_title")
        .eq("framework_id", framework.id);

      const { data: controls } = await supabase
        .from("controls")
        .select("id, mitigates_cwe_ids, framework_refs");

      const { data: openFindings } = await supabase
        .from("findings")
        .select("cwe_id")
        .eq("status", "open");

      const { data: latestRun } = await supabase
        .from("optimization_runs")
        .select("selected_control_ids")
        .order("computed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const selectedIds = new Set<string>(
        (latestRun as Pick<OptimizationRunRow, "selected_control_ids"> | null)
          ?.selected_control_ids ?? []
      );
      const openCweIds = new Set((openFindings ?? []).map((f: any) => f.cwe_id).filter(Boolean));

      data.complianceGaps = (frameworkControls ?? [])
        .filter((fc: any) => {
          const matching = (controls ?? []).filter((c: any) =>
            (c.framework_refs?.["NIST CSF"] ?? []).includes(fc.control_ref)
          );
          const relevant = matching.some((c: any) =>
            (c.mitigates_cwe_ids ?? []).some((cwe: string) => openCweIds.has(cwe))
          );
          const anySelected = matching.some((c: any) => selectedIds.has(c.id));
          return relevant && !anySelected;
        })
        .map((fc: any) => ({ frameworkName: "NIST CSF", controlTitle: fc.control_title }));
    }
  }

  return data;
}