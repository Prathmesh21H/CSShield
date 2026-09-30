import { faker } from "@faker-js/faker";
import type { Criticality } from "@/types/asset";

/**
 * Shared synthetic-org generation config. Kept separate from any single
 * caller (the /api/ingest/synthetic-assets route AND
 * scripts/generateSyntheticAssets.ts both import from here) so the two
 * never drift into generating organizations with different shapes.
 *
 * Per the build prompt's realism rule: only this layer — business unit
 * names, asset names, criticality distribution — is synthetic. Nothing
 * in here invents vulnerability data; that always comes from the live
 * NVD/EPSS/KEV clients and is attached to these assets by the caller.
 */

export const BUSINESS_UNIT_NAMES = [
  "Retail Banking",
  "Corporate Treasury",
  "Digital Channels",
  "Operations",
] as const;

/**
 * Roughly reflects a typical mid-size financial-services asset inventory:
 * most systems are low/medium criticality (internal tooling, back-office),
 * a meaningful minority are high (customer-facing), and a small critical
 * core holds regulated data or revenue-critical infrastructure. This
 * shape — not a uniform distribution — is what keeps the EAL calculation
 * from being dominated evenly by everything at once, matching how real
 * organizations' risk concentrates in a handful of systems.
 */
export const CRITICALITY_WEIGHTS: Array<{ value: Criticality; weight: number }> = [
  { value: "low", weight: 0.3 },
  { value: "medium", weight: 0.35 },
  { value: "high", weight: 0.25 },
  { value: "critical", weight: 0.1 },
];

export function weightedCriticality(): Criticality {
  const r = Math.random();
  let cumulative = 0;
  for (const { value, weight } of CRITICALITY_WEIGHTS) {
    cumulative += weight;
    if (r <= cumulative) return value;
  }
  return "medium";
}

export interface SyntheticAssetSeed {
  name: string;
  criticality: Criticality;
  internetFacing: boolean;
}

/**
 * Generates the asset shells only (no business_unit_id, no DB IDs — the
 * caller assigns those after inserting business units, since IDs don't
 * exist until Supabase generates them). ~35% internet-facing reflects a
 * typical split between internal-only systems and customer/partner-facing
 * ones for a mid-size org.
 */
export function generateSyntheticAssetSeeds(count: number): SyntheticAssetSeed[] {
  return Array.from({ length: count }).map(() => ({
    name: `${faker.hacker.noun()}-${faker.string.alphanumeric(4).toUpperCase()}`,
    criticality: weightedCriticality(),
    internetFacing: Math.random() < 0.35,
  }));
}

/** How many real CVEs to attach per synthetic asset — 1 to 5, uniformly. */
export function randomFindingsPerAsset(): number {
  return 1 + Math.floor(Math.random() * 5);
}