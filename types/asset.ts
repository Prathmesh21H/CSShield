export type Criticality = "low" | "medium" | "high" | "critical";

export interface Asset {
  id: string;
  name: string;
  businessUnitId: string;
  businessUnitName: string;
  criticality: Criticality;
  internetFacing: boolean;
}