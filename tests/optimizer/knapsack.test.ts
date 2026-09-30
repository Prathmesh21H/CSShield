import { describe, it, expect } from "vitest";
import { optimizeControlSelection, type OptimizerControl, type OptimizerFinding } from "@/lib/optimizer/knapsack";

const FINDINGS: OptimizerFinding[] = [
  { id: "f1", cweId: "CWE-79", ealContribution: 4_000_000 }, // XSS
  { id: "f2", cweId: "CWE-89", ealContribution: 3_000_000 }, // SQLi
  { id: "f3", cweId: "CWE-287", ealContribution: 2_000_000 }, // Auth
  { id: "f4", cweId: null, ealContribution: 1_000_000 }, // no CWE — nothing should match this
];

const CONTROLS: OptimizerControl[] = [
  {
    id: "waf",
    name: "WAF",
    cost: 500_000,
    estRiskReductionPct: 0.5, // removes half the EAL of findings it mitigates
    mitigatesCweIds: ["CWE-79", "CWE-89"],
  },
  {
    id: "pam",
    name: "PAM",
    cost: 1_000_000,
    estRiskReductionPct: 0.8,
    mitigatesCweIds: ["CWE-287"],
  },
  {
    id: "expensive-noop",
    name: "Expensive control matching nothing open",
    cost: 200_000,
    estRiskReductionPct: 1.0,
    mitigatesCweIds: ["CWE-611"], // no open finding has this CWE
  },
];

describe("optimizeControlSelection", () => {
  it("selects nothing and reports full EAL as ealBefore when budget is zero-ish", () => {
    const result = optimizeControlSelection(CONTROLS, FINDINGS, 1); // effectively no budget
    expect(result.selectedControlIds).toEqual([]);
    expect(result.ealBefore).toBe(10_000_000);
    expect(result.projectedEal).toBe(10_000_000);
  });

  it("never spends more than the given budget", () => {
    const budget = 900_000;
    const result = optimizeControlSelection(CONTROLS, FINDINGS, budget);
    expect(result.totalCost).toBeLessThanOrEqual(budget);
  });

  it("prefers the control with real risk-reduction value over an equally-priced control matching no open findings", () => {
    // Budget fits exactly one of: WAF (500k, real value) or expensive-noop (200k, zero real value) + leftover.
    const result = optimizeControlSelection(CONTROLS, FINDINGS, 500_000);
    expect(result.selectedControlIds).toContain("waf");
    expect(result.selectedControlIds).not.toContain("expensive-noop");
  });

  it("selects both WAF and PAM when the budget covers both, maximizing total risk reduction", () => {
    const result = optimizeControlSelection(CONTROLS, FINDINGS, 1_500_000);
    expect(result.selectedControlIds.sort()).toEqual(["pam", "waf"].sort());
  });

  it("computes projectedEal as ealBefore minus the selected controls' matched risk reduction", () => {
    const result = optimizeControlSelection(CONTROLS, FINDINGS, 500_000);
    // WAF mitigates f1 (4M) + f2 (3M) = 7M matched EAL, at 50% reduction = 3.5M removed.
    const expectedReduction = (4_000_000 + 3_000_000) * 0.5;
    expect(result.projectedEal).toBeCloseTo(result.ealBefore - expectedReduction, 0);
  });

  it("never recommends a control that matches zero currently-open findings when a better option exists", () => {
    const result = optimizeControlSelection(CONTROLS, FINDINGS, 2_000_000);
    expect(result.selectedControlIds).not.toContain("expensive-noop");
  });

  it("returns rosi as a finite number even when totalCost is zero (no controls selected)", () => {
    const result = optimizeControlSelection(CONTROLS, FINDINGS, 0);
    expect(Number.isFinite(result.rosi)).toBe(true);
    expect(result.rosi).toBe(0);
  });
});