import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { apiError, logServerError } from "@/lib/api/errors";
import type { ComplianceMatrix, CoverageStatus, FrameworkControlCoverage } from "@/types/compliance";

/**
 * Coverage logic (explicit and explainable, not a black box):
 *  - "addressed": either no currently-open finding maps to this control's
 *     mitigated CWE categories (nothing to fix), OR a control covering
 *     this framework control ID was selected in the most recent
 *     optimization run (the org has committed budget to it).
 *  - "gap": open findings map to this control's CWE categories, and no
 *     covering control has been selected in the most recent optimization run.
 *  - "partial": some, but not all, currently-open findings mapped to this
 *     framework control's underlying controls are covered by a selected control.
 */
export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const { searchParams } = new URL(request.url);
  const frameworkName = searchParams.get("framework") ?? "NIST CSF";

  try {
    const { data: framework, error: frameworkError } = await supabase
      .from("frameworks")
      .select("id, name")
      .eq("name", frameworkName)
      .maybeSingle();

    if (frameworkError) throw frameworkError;
    if (!framework) {
      return apiError("NOT_FOUND", `Unknown framework: ${frameworkName}`);
    }

    const { data: frameworkControls, error: fcError } = await supabase
      .from("framework_controls")
      .select("control_ref, control_title")
      .eq("framework_id", framework.id);

    if (fcError) throw fcError;

    const { data: controls, error: controlsError } = await supabase
      .from("controls")
      .select("id, mitigates_cwe_ids, framework_refs");

    if (controlsError) throw controlsError;

    const { data: openFindings, error: findingsError } = await supabase
      .from("findings")
      .select("id, cwe_id")
      .eq("status", "open");

    if (findingsError) throw findingsError;

    const { data: latestRun } = await supabase
      .from("optimization_runs")
      .select("selected_control_ids")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const selectedControlIds = new Set<string>(latestRun?.selected_control_ids ?? []);

    const rows: FrameworkControlCoverage[] = (frameworkControls ?? []).map(
      (fc: { control_ref: string; control_title: string }) => {
        // Find which controls in our catalog reference this framework control ID.
        const matchingControls = (controls ?? []).filter((c: any) =>
          (c.framework_refs?.[frameworkName] ?? []).includes(fc.control_ref)
        );

        const relevantCweIds = new Set(matchingControls.flatMap((c: any) => c.mitigates_cwe_ids ?? []));

        const relatedFindings = (openFindings ?? []).filter(
          (f: { cwe_id: string | null }) => f.cwe_id && relevantCweIds.has(f.cwe_id)
        );

        let status: CoverageStatus;
        if (relatedFindings.length === 0) {
          status = "addressed"; // nothing currently open maps here
        } else {
          const anySelected = matchingControls.some((c: any) => selectedControlIds.has(c.id));
          const allSelected =
            matchingControls.length > 0 && matchingControls.every((c: any) => selectedControlIds.has(c.id));

          status = allSelected ? "addressed" : anySelected ? "partial" : "gap";
        }

        return {
          frameworkId: framework.id,
          frameworkName: framework.name,
          controlId: fc.control_ref,
          controlTitle: fc.control_title,
          status,
          relatedFindingIds: relatedFindings.map((f: { id: string }) => f.id),
        };
      }
    );

    const matrix: ComplianceMatrix = {
      frameworkName: framework.name,
      rows,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(matrix);
  } catch (err) {
    logServerError("compliance/matrix", err);
    return apiError("INTERNAL_ERROR", "Could not generate the compliance matrix.");
  }
}