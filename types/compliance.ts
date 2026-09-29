export type CoverageStatus = "addressed" | "partial" | "gap";

export interface FrameworkControlCoverage {
  frameworkId: string;
  frameworkName: string;
  controlId: string;
  controlTitle: string;
  status: CoverageStatus;
  relatedFindingIds: string[];
}

export interface ComplianceMatrix {
  frameworkName: string;
  rows: FrameworkControlCoverage[];
  generatedAt: string;
}