/**
 * FIRST EPSS (Exploit Prediction Scoring System) API client.
 * Docs: https://www.first.org/epss/api
 *
 * EPSS recalculates once daily — there is no point polling this more
 * than once every ~24h (see the ingestion schedule in the addendum doc).
 */

const EPSS_BASE_URL = "https://api.first.org/data/v1/epss";

export interface EpssRecord {
  cveId: string;
  epssScore: number; // 0–1 probability of exploitation in the next 30 days
  percentile: number;
  date: string;
}

interface EpssApiResponse {
  status: string;
  data: Array<{ cve: string; epss: string; percentile: string; date: string }>;
}

/**
 * Fetches EPSS scores for a specific set of CVE IDs (batched, max ~100 per
 * call to keep URLs reasonable). Use this to enrich CVEs already ingested
 * from NVD rather than pulling the entire EPSS dataset.
 */
export async function fetchEpssScores(cveIds: string[]): Promise<EpssRecord[]> {
  if (cveIds.length === 0) return [];

  const results: EpssRecord[] = [];
  const batchSize = 100;

  for (let i = 0; i < cveIds.length; i += batchSize) {
    const batch = cveIds.slice(i, i + batchSize);
    const url = `${EPSS_BASE_URL}?cve=${batch.join(",")}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`EPSS API returned ${response.status}: ${await response.text()}`);
    }

    const data: EpssApiResponse = await response.json();
    results.push(
      ...data.data.map((r) => ({
        cveId: r.cve,
        epssScore: parseFloat(r.epss),
        percentile: parseFloat(r.percentile),
        date: r.date,
      }))
    );
  }

  return results;
}

/**
 * Fetches the full current EPSS snapshot (paginated). Only use this for
 * the initial seed or a full daily resync — for incremental updates,
 * prefer fetchEpssScores() scoped to the CVEs you actually track.
 */
export async function fetchFullEpssSnapshot(maxRecords = 5000): Promise<EpssRecord[]> {
  const results: EpssRecord[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (results.length < maxRecords) {
    const url = `${EPSS_BASE_URL}?limit=${pageSize}&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`EPSS API returned ${response.status}: ${await response.text()}`);
    }

    const data: EpssApiResponse = await response.json();
    if (data.data.length === 0) break;

    results.push(
      ...data.data.map((r) => ({
        cveId: r.cve,
        epssScore: parseFloat(r.epss),
        percentile: parseFloat(r.percentile),
        date: r.date,
      }))
    );

    offset += pageSize;
  }

  return results.slice(0, maxRecords);
}