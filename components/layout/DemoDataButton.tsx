"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * A compact, always-reachable version of the demo-data bootstrap action,
 * placed in the navbar next to the account/role info rather than buried
 * on one page — someone can seed a working demo from literally any
 * screen in the app without hunting for the Company Data or Admin pages.
 */
export function DemoDataButton() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleClick() {
    setStatus("loading");
    try {
      const res = await fetch("/api/ingest/demo-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetCount: 25 }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setStatus("error");
    } finally {
      setTimeout(() => setStatus("idle"), 2500);
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={status === "loading"}
      title="Seed a sample organization with real CVE data and compute its first risk score"
    >
      {status === "loading" ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Sparkles size={14} />
      )}
      {status === "loading"
        ? "Loading…"
        : status === "done"
          ? "Loaded ✓"
          : status === "error"
            ? "Failed — try again"
            : "Load demo data"}
    </Button>
  );
}