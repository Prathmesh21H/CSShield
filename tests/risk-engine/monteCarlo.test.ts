import { describe, it, expect } from "vitest";
import { runMonteCarloSimulation, type SimulationFinding } from "@/lib/risk-engine/monteCarlo";
import { calculateAnnualizedLikelihood } from "@/lib/risk-engine/likelihood";
import { getImpactBand } from "@/lib/risk-engine/impactBands";

/**
 * These tests encode the same hand-worked sanity check required by the
 * build prompt (see scripts/validateRiskEngine.ts) as an automated,
 * CI-runnable assertion — so a future change to the simulation that
 * breaks its statistical correctness fails a test, not just a manual
 * script someone forgot to re-run.
 */

function triangularMean(min: number, mode: number, max: number): number {
  return (min + mode + max) / 3;
}

const KEV_FINDING: SimulationFinding = {
  id: "f1",
  assetId: "a1",
  assetCriticality: "critical",
  assetInternetFacing: true,
  cveId: "CVE-TEST-0001",
  cvssScore: 9.8,
  epssScore: 0.6,
  isKev: true,
};

const LOW_RISK_FINDING: SimulationFinding = {
  id: "f2",
  assetId: "a2",
  assetCriticality: "low",
  assetInternetFacing: false,
  cveId: "CVE-TEST-0002",
  cvssScore: 3.1,
  epssScore: 0.001,
  isKev: false,
};

describe("calculateAnnualizedLikelihood", () => {
  it("floors likelihood at 0.85 for KEV-confirmed findings, per the build prompt's hard-signal rule", () => {
    const likelihood = calculateAnnualizedLikelihood({
      epssScore: 0.01, // deliberately low EPSS to prove KEV overrides it
      isKev: true,
      cvssScore: 9.8,
      internetFacing: false,
    });
    expect(likelihood).toBeGreaterThanOrEqual(0.85);
  });

  it("returns a low likelihood for a low-EPSS, non-KEV, internal finding", () => {
    const likelihood = calculateAnnualizedLikelihood({
      epssScore: 0.001,
      isKev: false,
      cvssScore: 3.1,
      internetFacing: false,
    });
    expect(likelihood).toBeLessThan(0.05);
  });

  it("never exceeds 1 even after the internet-facing multiplier", () => {
    const likelihood = calculateAnnualizedLikelihood({
      epssScore: 0.99,
      isKev: true,
      cvssScore: 10,
      internetFacing: true,
    });
    expect(likelihood).toBeLessThanOrEqual(1);
  });
});

describe("getImpactBand", () => {
  it("applies the internet-facing multiplier to mode and max, not min", () => {
    const internal = getImpactBand("high", false);
    const facing = getImpactBand("high", true);

    expect(facing.min).toBe(internal.min);
    expect(facing.mode).toBeGreaterThan(internal.mode);
    expect(facing.max).toBeGreaterThan(internal.max);
  });

  it("orders bands monotonically by criticality tier", () => {
    const low = getImpactBand("low", false);
    const medium = getImpactBand("medium", false);
    const high = getImpactBand("high", false);
    const critical = getImpactBand("critical", false);

    expect(low.mode).toBeLessThan(medium.mode);
    expect(medium.mode).toBeLessThan(high.mode);
    expect(high.mode).toBeLessThan(critical.mode);
  });
});

describe("runMonteCarloSimulation", () => {
  it("returns zeroed results for an empty findings list", () => {
    const result = runMonteCarloSimulation([], 1000);
    expect(result.ealValue).toBe(0);
    expect(result.var95Value).toBe(0);
    expect(result.perFindingContribution).toEqual([]);
  });

  it("converges to the hand-calculated expected value within 5% at 20,000 iterations", () => {
    const findings = [KEV_FINDING, LOW_RISK_FINDING];

    let handCalculatedEAL = 0;
    for (const f of findings) {
      const likelihood = calculateAnnualizedLikelihood({
        epssScore: f.epssScore,
        isKev: f.isKev,
        cvssScore: f.cvssScore,
        internetFacing: f.assetInternetFacing,
      });
      const band = getImpactBand(f.assetCriticality, f.assetInternetFacing);
      handCalculatedEAL += likelihood * triangularMean(band.min, band.mode, band.max);
    }

    const result = runMonteCarloSimulation(findings, 20000);
    const percentDiff = Math.abs(result.ealValue - handCalculatedEAL) / handCalculatedEAL;

    expect(percentDiff).toBeLessThan(0.05);
  });

  it("VaR95 is always greater than or equal to EAL (a right-skewed loss distribution)", () => {
    const result = runMonteCarloSimulation([KEV_FINDING, LOW_RISK_FINDING], 10000);
    expect(result.var95Value).toBeGreaterThanOrEqual(result.ealValue);
  });

  it("per-finding contributions sum to approximately the total EAL", () => {
    const findings = [KEV_FINDING, LOW_RISK_FINDING];
    const result = runMonteCarloSimulation(findings, 20000);

    const summed = result.perFindingContribution.reduce((sum, c) => sum + c.ealContribution, 0);
    const percentDiff = Math.abs(summed - result.ealValue) / result.ealValue;

    expect(percentDiff).toBeLessThan(0.02);
  });

  it("a KEV-confirmed critical finding contributes more than an unexploited low-criticality one", () => {
    const result = runMonteCarloSimulation([KEV_FINDING, LOW_RISK_FINDING], 20000);
    const kevContribution = result.perFindingContribution.find((c) => c.findingId === "f1")!;
    const lowContribution = result.perFindingContribution.find((c) => c.findingId === "f2")!;

    expect(kevContribution.ealContribution).toBeGreaterThan(lowContribution.ealContribution);
  });
});