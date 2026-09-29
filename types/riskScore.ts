export type RiskScope = "org" | "business_unit" | "asset";

export interface RiskScore {
  scopeType: RiskScope;
  scopeId: string | null;
  ealValue: number;
  var95Value: number;
  computedAt: string;
}

export interface RiskTrendPoint {
  computedAt: string;
  ealValue: number;
}

export interface RiskSummary {
  current: RiskScore;
  trend: RiskTrendPoint[];
  dataFreshness: {
    nvd: string | null;
    epss: string | null;
    kev: string | null;
    isStale: boolean;
  };
}