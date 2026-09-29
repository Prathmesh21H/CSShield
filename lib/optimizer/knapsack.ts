export interface OptimizerControl {
  id: string;
  name: string;
  cost: number;
  estRiskReductionPct: number; // 0–1, this control's share of matched EAL it removes
  mitigatesCweIds: string[];
}

export interface OptimizerFinding {
  id: string;
  cweId: string | null;
  ealContribution: number;
}

export interface OptimizerResult {
  selectedControlIds: string[];
  totalCost: number;
  ealBefore: number;
  projectedEal: number;
  rosi: number; // (risk reduction ₹ − cost) / cost
}

/**
 * Solves a 0/1 knapsack: choose the subset of controls, within budget,
 * that maximizes total risk reduction. Risk reduction for a control is
 * computed against the specific findings it mitigates (matched by CWE
 * category, per the controls.mitigates_cwe_ids column) — not an abstract
 * percentage applied to the whole EAL, so recommendations stay traceable
 * to real findings.
 *
 * Uses integer-rupee dynamic programming (classic knapsack DP), which is
 * exact and fast enough at prototype scale (a handful of controls, budgets
 * up to a few crore). Costs are bucketed to the nearest ₹10,000 to keep the
 * DP table a manageable size — negligible precision loss for a budgeting
 * decision at this scale.
 */
export function optimizeControlSelection(
  controls: OptimizerControl[],
  findings: OptimizerFinding[],
  budget: number
): OptimizerResult {
  const ealBefore = findings.reduce((sum, f) => sum + f.ealContribution, 0);

  const BUCKET = 10000;
  const bucketedBudget = Math.floor(budget / BUCKET);

  // Precompute each control's ₹ risk-reduction value against currently
  // matched findings.
  const items = controls.map((control) => {
    const matchedFindings = findings.filter(
      (f) => f.cweId !== null && control.mitigatesCweIds.includes(f.cweId)
    );
    const matchedEal = matchedFindings.reduce((sum, f) => sum + f.ealContribution, 0);
    const riskReductionValue = matchedEal * control.estRiskReductionPct;

    return {
      id: control.id,
      bucketedCost: Math.max(1, Math.round(control.cost / BUCKET)),
      actualCost: control.cost,
      value: riskReductionValue,
    };
  });

  // Standard 0/1 knapsack DP: dp[w] = best value achievable within bucketed
  // weight w. keep[i][w] tracks whether item i was taken, for backtracking.
  const dp = new Float64Array(bucketedBudget + 1);
  const keep: Uint8Array[] = items.map(() => new Uint8Array(bucketedBudget + 1));

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    for (let w = bucketedBudget; w >= item.bucketedCost; w--) {
      const candidate = dp[w - item.bucketedCost] + item.value;
      if (candidate > dp[w]) {
        dp[w] = candidate;
        keep[i][w] = 1;
      }
    }
  }

  // Backtrack to find which controls were selected.
  const selected: typeof items = [];
  let w = bucketedBudget;
  for (let i = items.length - 1; i >= 0; i--) {
    if (keep[i][w] === 1) {
      selected.push(items[i]);
      w -= items[i].bucketedCost;
    }
  }

  const totalCost = selected.reduce((sum, i) => sum + i.actualCost, 0);
  const totalRiskReductionValue = selected.reduce((sum, i) => sum + i.value, 0);
  const projectedEal = Math.max(0, ealBefore - totalRiskReductionValue);
  const rosi = totalCost > 0 ? (totalRiskReductionValue - totalCost) / totalCost : 0;

  return {
    selectedControlIds: selected.map((i) => i.id),
    totalCost,
    ealBefore,
    projectedEal,
    rosi,
  };
}