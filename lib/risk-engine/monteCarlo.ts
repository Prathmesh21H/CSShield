import { calculateAnnualizedLikelihood } from "./likelihood";
import { getImpactBand, type ImpactBand } from "./impactBands";
import type { Criticality } from "@/types/asset";

export interface SimulationFinding {
  id: string;
  assetId: string;
  assetCriticality: Criticality;
  assetInternetFacing: boolean;
  cveId: string;
  cvssScore: number | null;
  epssScore: number | null;
  isKev: boolean;
}

export interface SimulationResult {
  ealValue: number; // Expected Annual Loss — mean of simulated annual losses
  var95Value: number; // Value at Risk — 95th percentile of simulated annual losses
  perFindingContribution: Array<{ findingId: string; ealContribution: number }>;
}

const DEFAULT_ITERATIONS = 8000;

/**
 * Runs the FAIR-style Monte Carlo simulation described in the build prompt.
 * For each iteration, every open finding independently "occurs" according
 * to its annualized likelihood; if it occurs, a loss amount is sampled from
 * a triangular distribution over that asset's impact band. Summing across
 * all findings per iteration, then aggregating iterations, produces EAL
 * (the mean) and VaR95 (the 95th percentile) — not a single deterministic
 * guess, but a distribution of plausible annual outcomes.
 *
 * This is intentionally vectorized with typed arrays rather than nested
 * object loops — at 8,000 iterations × a few hundred findings, a naive
 * per-object-property implementation is noticeably slower and unnecessary.
 */
export function runMonteCarloSimulation(
  findings: SimulationFinding[],
  iterations: number = DEFAULT_ITERATIONS
): SimulationResult {
  if (findings.length === 0) {
    return { ealValue: 0, var95Value: 0, perFindingContribution: [] };
  }

  const n = findings.length;
  const likelihoods = new Float64Array(n);
  const impactMins = new Float64Array(n);
  const impactModes = new Float64Array(n);
  const impactMaxs = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const f = findings[i];
    likelihoods[i] = calculateAnnualizedLikelihood({
      epssScore: f.epssScore,
      isKev: f.isKev,
      cvssScore: f.cvssScore,
      internetFacing: f.assetInternetFacing,
    });

    const band: ImpactBand = getImpactBand(f.assetCriticality, f.assetInternetFacing);
    impactMins[i] = band.min;
    impactModes[i] = band.mode;
    impactMaxs[i] = band.max;
  }

  const annualLossTotals = new Float64Array(iterations);
  const contributionSums = new Float64Array(n);

  for (let iter = 0; iter < iterations; iter++) {
    let iterationTotal = 0;

    for (let i = 0; i < n; i++) {
      if (Math.random() < likelihoods[i]) {
        const loss = sampleTriangular(impactMins[i], impactModes[i], impactMaxs[i]);
        iterationTotal += loss;
        contributionSums[i] += loss;
      }
    }

    annualLossTotals[iter] = iterationTotal;
  }

  const ealValue = mean(annualLossTotals);
  const var95Value = percentile(annualLossTotals, 0.95);

  const perFindingContribution = findings.map((f, i) => ({
    findingId: f.id,
    // Average simulated contribution per iteration — this is what
    // "top risk contributors" ranks by, so it must sum consistently
    // with ealValue (contributionSums / iterations ≈ ealValue in total).
    ealContribution: contributionSums[i] / iterations,
  }));

  return { ealValue, var95Value, perFindingContribution };
}

/** Samples from a triangular distribution — standard for FAIR-style impact modeling. */
function sampleTriangular(min: number, mode: number, max: number): number {
  const u = Math.random();
  const f = (mode - min) / (max - min);

  if (u < f) {
    return min + Math.sqrt(u * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function mean(values: Float64Array): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
}

function percentile(values: Float64Array, p: number): number {
  const sorted = Float64Array.from(values).sort();
  const index = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[index];
}