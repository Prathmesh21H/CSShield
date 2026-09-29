"use client";

import { useEffect, useState, useCallback } from "react";
import type { RiskSummary } from "@/types/riskScore";
import type { Finding } from "@/types/finding";

interface RiskSummaryState {
  summary: RiskSummary | null;
  topContributors: Finding[];
  status: "loading" | "success" | "empty" | "error";
  errorMessage: string | null;
  refresh: () => void;
}

/**
 * Reads the last-computed risk score, never triggers a live recomputation.
 * The Monte Carlo engine runs on its own schedule (see /api/ingest/*) —
 * this hook only reads whatever is currently stored in Supabase.
 */
export function useRiskSummary(): RiskSummaryState {
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [topContributors, setTopContributors] = useState<Finding[]>([]);
  const [status, setStatus] = useState<RiskSummaryState["status"]>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const [summaryRes, contributorsRes] = await Promise.all([
          fetch("/api/risk/summary"),
          fetch("/api/risk/contributors"),
        ]);

        if (!summaryRes.ok || !contributorsRes.ok) {
          throw new Error("Risk service returned an error response.");
        }

        const summaryData: RiskSummary = await summaryRes.json();
        const contributorsData: Finding[] = await contributorsRes.json();

        if (cancelled) return;

        setSummary(summaryData);
        setTopContributors(contributorsData);
        setStatus(summaryData ? "success" : "empty");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err instanceof Error ? err.message : "Could not load risk data."
        );
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return { summary, topContributors, status, errorMessage, refresh };
}