/**
 * Hand-worked sanity check for the risk engine, per the build prompt's
 * rule: "compute a small example by hand... confirm the code's output is
 * in the same ballpark" before trusting the engine.
 *
 * Run with: npx tsx scripts/validateRiskEngine.ts
 * (or: node --loader ts-node/esm scripts/validateRiskEngine.ts)
 */
import { runMonteCarloSimulation, type SimulationFinding } from "../lib/risk-engine/monteCarlo";
import { calculateAnnualizedLikelihood } from "../lib/risk-engine/likelihood";
import { getImpactBand } from "../lib/risk-engine/impactBands";

// --- A small, fixed 3-finding example -------------------------------------
const testFindings: SimulationFinding[] = [
  {
    id: "f1",
    assetId: "a1",
    assetCriticality: "critical",
    assetInternetFacing: true,
    cveId: "CVE-TEST-0001",
    cvssScore: 9.8,
    epssScore: 0.6, // high EPSS
    isKev: true, // confirmed actively exploited
  },
  {
    id: "f2",
    assetId: "a2",
    assetCriticality: "medium",
    assetInternetFacing: false,
    cveId: "CVE-TEST-0002",
    cvssScore: 5.3,
    epssScore: 0.02,
    isKev: false,
  },
  {
    id: "f3",
    assetId: "a3",
    assetCriticality: "low",
    assetInternetFacing: false,
    cveId: "CVE-TEST-0003",
    cvssScore: 3.1,
    epssScore: 0.001,
    isKev: false,
  },
];

// --- Hand calculation (expected value method, not simulation) -------------
// Expected loss for one finding ≈ likelihood × expected impact, where
// expected impact of a triangular(min, mode, max) distribution is
// (min + mode + max) / 3. Summing across independent findings gives the
// expected total — this is the same quantity EAL should converge to.
function triangularMean(min: number, mode: number, max: number): number {
  return (min + mode + max) / 3;
}

let handCalculatedEAL = 0;
console.log("--- Hand calculation ---");
for (const f of testFindings) {
  const likelihood = calculateAnnualizedLikelihood({
    epssScore: f.epssScore,
    isKev: f.isKev,
    cvssScore: f.cvssScore,
    internetFacing: f.assetInternetFacing,
  });
  const band = getImpactBand(f.assetCriticality, f.assetInternetFacing);
  const expectedImpact = triangularMean(band.min, band.mode, band.max);
  const expectedLoss = likelihood * expectedImpact;
  handCalculatedEAL += expectedLoss;

  console.log(
    `${f.cveId}: likelihood=${likelihood.toFixed(3)}, expectedImpact=₹${expectedImpact.toLocaleString(
      "en-IN"
    )}, expectedLoss=₹${expectedLoss.toLocaleString("en-IN")}`
  );
}
console.log(`Hand-calculated total EAL: ₹${handCalculatedEAL.toLocaleString("en-IN")}`);

// --- Simulation -------------------------------------------------------------
console.log("\n--- Monte Carlo simulation (20,000 iterations) ---");
const result = runMonteCarloSimulation(testFindings, 20000);
console.log(`Simulated EAL: ₹${result.ealValue.toLocaleString("en-IN")}`);
console.log(`Simulated VaR95: ₹${result.var95Value.toLocaleString("en-IN")}`);

// --- Comparison --------------------------------------------------------------
const percentDiff = (Math.abs(result.ealValue - handCalculatedEAL) / handCalculatedEAL) * 100;
console.log(`\nDifference from hand calculation: ${percentDiff.toFixed(1)}%`);

if (percentDiff > 5) {
  console.error(
    "FAIL: simulated EAL diverges from the hand-calculated expected value by more than 5%. " +
      "With enough iterations these should converge closely — investigate before trusting the engine."
  );
  process.exit(1);
} else {
  console.log("PASS: simulation converges to the hand-calculated expected value within tolerance.");
}