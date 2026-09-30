import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRecentCves } from "@/lib/external/nvdClient";
import { fetchEpssScores } from "@/lib/external/epssClient";
import { fetchKevCatalog, fetchKevCveIdSet } from "@/lib/external/kevClient";

/**
 * These tests cover the external data clients that back
 * app/api/ingest/{nvd,epss,kev}/route.ts — the actual HTTP Route Handlers
 * are thin wrappers around these clients plus Supabase writes, so testing
 * the clients in isolation (with fetch mocked — never a real network call
 * in tests) covers the logic that actually matters: parsing, retry
 * behavior, and batching. Testing the route handlers themselves end-to-end
 * would need Next's route-handler test harness or a running dev server —
 * out of scope for a unit-test suite in a 5-day prototype.
 */

const originalFetch = global.fetch;

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe("nvdClient.fetchRecentCves", () => {
  it("throws a clear error when NVD_API_KEY is not set", async () => {
    const original = process.env.NVD_API_KEY;
    delete process.env.NVD_API_KEY;

    await expect(fetchRecentCves({})).rejects.toThrow(/NVD_API_KEY/);

    process.env.NVD_API_KEY = original;
  });

  it("parses CVSS score and CWE ID out of a mocked NVD response", async () => {
    process.env.NVD_API_KEY = "test-key";

    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          totalResults: 1,
          vulnerabilities: [
            {
              cve: {
                id: "CVE-2024-0001",
                published: "2024-01-01T00:00:00.000Z",
                lastModified: "2024-01-02T00:00:00.000Z",
                descriptions: [{ lang: "en", value: "A test vulnerability." }],
                weaknesses: [{ description: [{ lang: "en", value: "CWE-79" }] }],
                metrics: { cvssMetricV31: [{ cvssData: { baseScore: 9.8 } }] },
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    const results = await fetchRecentCves({});

    expect(results).toHaveLength(1);
    expect(results[0].cveId).toBe("CVE-2024-0001");
    expect(results[0].cvssScore).toBe(9.8);
    expect(results[0].cweId).toBe("CWE-79");
  });

  it("retries on a 429 response and succeeds on a later attempt", async () => {
    process.env.NVD_API_KEY = "test-key";

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount < 2) {
        return new Response("rate limited", { status: 429 });
      }
      return new Response(JSON.stringify({ totalResults: 0, vulnerabilities: [] }), { status: 200 });
    });

    const results = await fetchRecentCves({});

    expect(callCount).toBe(2);
    expect(results).toEqual([]);
  }, 10000);

  it("does not retry on a 400 (client error is not transient)", async () => {
    process.env.NVD_API_KEY = "test-key";

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response("bad request", { status: 400 });
    });

    await expect(fetchRecentCves({})).rejects.toThrow();
    expect(callCount).toBe(1);
  });
});

describe("epssClient.fetchEpssScores", () => {
  it("returns an empty array without calling fetch for an empty CVE list", async () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await fetchEpssScores([]);

    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("batches requests in groups of 100 CVE IDs", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "OK", data: [] }), { status: 200 })
    );
    global.fetch = fetchSpy;

    const manyIds = Array.from({ length: 250 }, (_, i) => `CVE-2024-${i}`);
    await fetchEpssScores(manyIds);

    // 250 IDs at 100 per batch = 3 calls (100 + 100 + 50).
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("parses EPSS score and percentile as numbers", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "OK",
          data: [{ cve: "CVE-2024-0001", epss: "0.42", percentile: "0.91", date: "2024-01-01" }],
        }),
        { status: 200 }
      )
    );

    const result = await fetchEpssScores(["CVE-2024-0001"]);

    expect(result[0].epssScore).toBeCloseTo(0.42);
    expect(result[0].percentile).toBeCloseTo(0.91);
  });
});

describe("kevClient", () => {
  it("parses the KEV catalog and flags ransomware use correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          catalogVersion: "2024.01.01",
          dateReleased: "2024-01-01",
          count: 1,
          vulnerabilities: [
            {
              cveID: "CVE-2024-0001",
              dateAdded: "2024-01-01",
              dueDate: "2024-01-15",
              knownRansomwareCampaignUse: "Known",
            },
          ],
        }),
        { status: 200 }
      )
    );

    const results = await fetchKevCatalog();

    expect(results).toHaveLength(1);
    expect(results[0].cveId).toBe("CVE-2024-0001");
    expect(results[0].knownRansomwareUse).toBe(true);
  });

  it("fetchKevCveIdSet returns a Set for O(1) membership checks", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          catalogVersion: "1",
          dateReleased: "2024-01-01",
          count: 2,
          vulnerabilities: [
            { cveID: "CVE-A", dateAdded: "2024-01-01", knownRansomwareCampaignUse: "Unknown" },
            { cveID: "CVE-B", dateAdded: "2024-01-01", knownRansomwareCampaignUse: "Unknown" },
          ],
        }),
        { status: 200 }
      )
    );

    const set = await fetchKevCveIdSet();

    expect(set.has("CVE-A")).toBe(true);
    expect(set.has("CVE-C")).toBe(false);
  });

  it("throws when the KEV feed returns a non-OK status", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("error", { status: 500 }));
    await expect(fetchKevCatalog()).rejects.toThrow();
  });
});