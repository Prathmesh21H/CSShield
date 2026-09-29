import type { Criticality } from "@/types/asset";

/**
 * Impact cost bands, per the build prompt's realism rule: these are NOT
 * arbitrary. They approximate the order of magnitude reported in:
 *   - IBM Cost of a Data Breach Report (global average cost per breach,
 *     broken down loosely by organization/data sensitivity tier)
 *   - Verizon DBIR (breach frequency and cost distribution by org size)
 *
 * IBM's reports have put the global average cost of a data breach in the
 * few-million-US-dollar range, with wide variance by sector and severity —
 * financial services and healthcare skew well above the average, while a
 * breach of a low-criticality internal system costs far less. We map that
 * reported variance onto four criticality tiers rather than using one flat
 * number, so an asset holding customer PII (criticality: critical) and an
 * internal wiki (criticality: low) are not treated as equally risky.
 *
 * min/mode/max define a triangular distribution used by the Monte Carlo
 * simulation (see monteCarlo.ts) — mode is the most likely single-incident
 * cost, min/max bound the realistic range. Figures are in INR, converted
 * at an approximate long-run USD/INR rate and rounded to a clean order of
 * magnitude — this is a defensible approximation for a prototype, not a
 * claim of precision.
 */
export interface ImpactBand {
  min: number;
  mode: number;
  max: number;
}

export const IMPACT_BANDS_INR: Record<Criticality, ImpactBand> = {
  // Low-criticality: internal tooling, non-customer-facing, low blast radius.
  low: { min: 500000, mode: 2000000, max: 8000000 },
  // Medium: internal business systems with some operational dependency.
  medium: { min: 2000000, mode: 8000000, max: 30000000 },
  // High: customer-facing systems, or systems holding business-sensitive data.
  high: { min: 8000000, mode: 30000000, max: 90000000 },
  // Critical: systems holding regulated/PII data, core revenue infrastructure —
  // this tier is calibrated toward the higher end of IBM's reported range,
  // reflecting regulatory fines (e.g. under India's DPDP Act) stacking on
  // top of direct breach-response cost.
  critical: { min: 30000000, mode: 90000000, max: 250000000 },
};

/**
 * Internet-facing assets have materially higher realized breach frequency
 * in the Verizon DBIR's incident patterns (external actors exploiting
 * externally-reachable vulnerabilities is consistently the dominant breach
 * pattern year over year). We apply a modest multiplier to the impact
 * range's mode for internet-facing assets to reflect that such incidents,
 * when they occur, tend to be discovered later and cost more to contain.
 */
export const INTERNET_FACING_IMPACT_MULTIPLIER = 1.25;

export function getImpactBand(criticality: Criticality, internetFacing: boolean): ImpactBand {
  const base = IMPACT_BANDS_INR[criticality];
  if (!internetFacing) return base;

  return {
    min: base.min,
    mode: Math.round(base.mode * INTERNET_FACING_IMPACT_MULTIPLIER),
    max: Math.round(base.max * INTERNET_FACING_IMPACT_MULTIPLIER),
  };
}