"use client";

import { useCallback, useRef, useState } from "react";
import type { OptimizationResult } from "@/types/control";

interface OptimizerState {
  result: OptimizationResult | null;
  status: "idle" | "loading" | "success" | "error";
  errorMessage: string | null;
  runOptimization: (budget: number) => void;
}

const DEBOUNCE_MS = 400;

/**
 * Debounces budget-slider changes before calling the optimizer endpoint —
 * firing a solve on every pixel of slider movement would feel laggy and
 * waste backend compute.
 */
export function useOptimizer(): OptimizerState {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [status, setStatus] = useState<OptimizerState["status"]>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runOptimization = useCallback((budget: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setStatus("loading");
      setErrorMessage(null);

      try {
        const response = await fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error?.message ?? "Optimizer request failed.");
        }

        const data: OptimizationResult = await response.json();
        setResult(data);
        setStatus("success");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Could not compute a recommendation."
        );
        setStatus("error");
      }
    }, DEBOUNCE_MS);
  }, []);

  return { result, status, errorMessage, runOptimization };
}