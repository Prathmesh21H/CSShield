/**
 * NVD CVE API v2.0 client. Server-only — never import this in a
 * "use client" component (it reads NVD_API_KEY from process.env).
 * Docs: https://nvd.nist.gov/developers/vulnerabilities
 */

const NVD_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

export interface NvdCveRecord {
  cveId: string;
  cvssScore: number | null;
  cweId: string | null;
  publishedAt: string;
  lastModifiedAt: string;
  description: string;
}

interface NvdApiResponse {
  totalResults: number;
  vulnerabilities: Array<{
    cve: {
      id: string;
      published: string;
      lastModified: string;
      descriptions: Array<{ lang: string; value: string }>;
      weaknesses?: Array<{
        description: Array<{ lang: string; value: string }>;
      }>;
      metrics?: {
        cvssMetricV31?: Array<{ cvssData: { baseScore: number } }>;
        cvssMetricV30?: Array<{ cvssData: { baseScore: number } }>;
        cvssMetricV2?: Array<{ cvssData: { baseScore: number } }>;
      };
    };
  }>;
}

function extractCvssScore(cve: NvdApiResponse["vulnerabilities"][number]["cve"]): number | null {
  const metrics = cve.metrics;
  if (!metrics) return null;
  // Prefer the newest CVSS version available.
  const score =
    metrics.cvssMetricV31?.[0]?.cvssData.baseScore ??
    metrics.cvssMetricV30?.[0]?.cvssData.baseScore ??
    metrics.cvssMetricV2?.[0]?.cvssData.baseScore ??
    null;
  return score;
}

function extractCweId(cve: NvdApiResponse["vulnerabilities"][number]["cve"]): string | null {
  const weakness = cve.weaknesses?.[0]?.description.find((d) => d.lang === "en");
  return weakness?.value && weakness.value.startsWith("CWE-") ? weakness.value : null;
}

/**
 * Fetches CVEs modified since `lastModStartDate` (ISO 8601). Pass the
 * timestamp of your last successful ingestion run to pull only new/changed
 * records — never re-download the whole database on every run.
 *
 * NVD rate limits: 5 requests/30s without an API key, 50 requests/30s with
 * one. A single call here covers up to `resultsPerPage` (max 2000) CVEs,
 * which is enough for a prototype-scale pull.
 */
export async function fetchRecentCves(params: {
  lastModStartDate?: string;
  resultsPerPage?: number;
}): Promise<NvdCveRecord[]> {
  const apiKey = process.env.NVD_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NVD_API_KEY is not set. Add it to .env.local — requests without a key are heavily rate-limited and will fail under load."
    );
  }

  const searchParams = new URLSearchParams({
    resultsPerPage: String(params.resultsPerPage ?? 200),
  });

  if (params.lastModStartDate) {
    searchParams.set("lastModStartDate", params.lastModStartDate);
    searchParams.set("lastModEndDate", new Date().toISOString());
  }

  const url = `${NVD_BASE_URL}?${searchParams.toString()}`;

  const response = await fetchWithRetry(url, {
    headers: { apiKey },
  });

  if (!response.ok) {
    throw new Error(`NVD API returned ${response.status}: ${await response.text()}`);
  }

  const data: NvdApiResponse = await response.json();

  return data.vulnerabilities.map(({ cve }) => ({
    cveId: cve.id,
    cvssScore: extractCvssScore(cve),
    cweId: extractCweId(cve),
    publishedAt: cve.published,
    lastModifiedAt: cve.lastModified,
    description:
      cve.descriptions.find((d) => d.lang === "en")?.value ?? cve.descriptions[0]?.value ?? "",
  }));
}

/**
 * Fetch with exponential backoff — NVD occasionally returns 403/429 under
 * load, and a single transient failure shouldn't fail the whole ingestion run.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 4
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || (response.status < 500 && response.status !== 429)) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
    }

    if (attempt < maxAttempts) {
      const delayMs = 500 * 2 ** (attempt - 1); // 500ms, 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("NVD request failed after retries.");
}