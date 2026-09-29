/**
 * CISA Known Exploited Vulnerabilities (KEV) Catalog client.
 * Public feed, no auth required. Updated irregularly as CISA adds entries.
 * Docs: https://www.cisa.gov/known-exploited-vulnerabilities-catalog
 */

const KEV_FEED_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

export interface KevRecord {
  cveId: string;
  dateAdded: string;
  requiredActionDueDate: string | null;
  knownRansomwareUse: boolean;
}

interface KevApiResponse {
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: Array<{
    cveID: string;
    dateAdded: string;
    dueDate?: string;
    knownRansomwareCampaignUse: string; // "Known" | "Unknown"
  }>;
}

/**
 * Fetches the full KEV catalog. It's small enough (a few thousand entries)
 * to pull in full each run — filter by dateAdded against your last
 * successful ingestion timestamp before writing, to keep it idempotent.
 */
export async function fetchKevCatalog(): Promise<KevRecord[]> {
  const response = await fetch(KEV_FEED_URL, {
    // Revalidate at most once an hour even if called more often —
    // KEV doesn't update more frequently than that in practice.
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`CISA KEV feed returned ${response.status}`);
  }

  const data: KevApiResponse = await response.json();

  return data.vulnerabilities.map((v) => ({
    cveId: v.cveID,
    dateAdded: v.dateAdded,
    requiredActionDueDate: v.dueDate ?? null,
    knownRansomwareUse: v.knownRansomwareCampaignUse === "Known",
  }));
}

/** Convenience helper: just the set of CVE IDs currently in KEV. */
export async function fetchKevCveIdSet(): Promise<Set<string>> {
  const records = await fetchKevCatalog();
  return new Set(records.map((r) => r.cveId));
}