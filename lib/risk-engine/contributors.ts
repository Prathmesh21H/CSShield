import type { SimulationResult } from "./monteCarlo";

export interface RankedContributor {
  findingId: string;
  ealContribution: number;
  shareOfTotal: number;
}

/**
 * Ranks findings by their simulated contribution to total EAL, descending.
 * shareOfTotal lets the UI show "this finding accounts for 18% of your
 * total exposure" — a more intuitive framing than the raw ₹ figure alone.
 */
export function rankContributors(
  result: SimulationResult,
  limit = 10
): RankedContributor[] {
  const total = result.ealValue;

  return [...result.perFindingContribution]
    .sort((a, b) => b.ealContribution - a.ealContribution)
    .slice(0, limit)
    .map((c) => ({
      findingId: c.findingId,
      ealContribution: c.ealContribution,
      shareOfTotal: total > 0 ? c.ealContribution / total : 0,
    }));
}