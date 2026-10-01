"use client";

import { useCallback, useEffect, useState } from "react";
import type { Asset, Criticality } from "@/types/asset";

interface BusinessUnit {
  id: string;
  name: string;
}

interface CompanyDataState {
  businessUnits: BusinessUnit[];
  assets: Asset[];
  status: "loading" | "success" | "error";
  errorMessage: string | null;
  addBusinessUnit: (name: string) => Promise<boolean>;
  addAsset: (input: {
    name: string;
    businessUnitId: string;
    criticality: Criticality;
    internetFacing: boolean;
  }) => Promise<{ success: boolean; warning?: string }>;
  deleteAsset: (id: string) => Promise<boolean>;
  refresh: () => void;
}

export function useCompanyData(): CompanyDataState {
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [status, setStatus] = useState<CompanyDataState["status"]>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const [buRes, assetsRes] = await Promise.all([
          fetch("/api/company/business-units"),
          fetch("/api/company/assets"),
        ]);

        if (!buRes.ok || !assetsRes.ok) throw new Error("Could not load company data.");

        const buData: BusinessUnit[] = await buRes.json();
        const assetsData: Asset[] = await assetsRes.json();

        if (cancelled) return;
        setBusinessUnits(buData);
        setAssets(assetsData);
        setStatus("success");
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Could not load company data.");
        setStatus("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const addBusinessUnit = useCallback(
    async (name: string) => {
      const res = await fetch("/api/company/business-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) refresh();
      return res.ok;
    },
    [refresh]
  );

  const addAsset = useCallback(
    async (input: {
      name: string;
      businessUnitId: string;
      criticality: Criticality;
      internetFacing: boolean;
    }) => {
      const res = await fetch("/api/company/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) refresh();
      return { success: res.ok, warning: data?.warning as string | undefined };
    },
    [refresh]
  );

  const deleteAsset = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/company/assets/${id}`, { method: "DELETE" });
      if (res.ok) refresh();
      return res.ok;
    },
    [refresh]
  );

  return {
    businessUnits,
    assets,
    status,
    errorMessage,
    addBusinessUnit,
    addAsset,
    deleteAsset,
    refresh,
  };
}