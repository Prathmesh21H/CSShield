export type FindingStatus = "open" | "patched" | "accepted_risk";

export interface Finding {
  id: string;
  assetId: string;
  assetName: string;
  cveId: string;
  cvssScore: number | null;
  epssScore: number | null;
  isKev: boolean;
  cweId: string | null;
  status: FindingStatus;
  discoveredAt: string;
  ealContribution?: number;
}