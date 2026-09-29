export interface Control {
  id: string;
  name: string;
  cost: number;
  estRiskReductionPct: number;
  frameworkRefs: Record<string, string[]>;
}

export interface OptimizationResult {
  budget: number;
  selectedControls: Control[];
  projectedEal: number;
  ealBefore: number;
  rosi: number;
  computedAt: string;
}