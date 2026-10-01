"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function BusinessUnitForm({ onAdd }: { onAdd: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;

    setStatus("saving");
    const ok = await onAdd(name.trim());
    if (ok) {
      setName("");
      setStatus("idle");
    } else {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <div className="flex-1">
        <label htmlFor="bu-name" className="mb-1 block text-xs font-medium text-ink-soft">
          New business unit
        </label>
        <Input
          id="bu-name"
          placeholder="e.g. Claims Processing"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={status === "saving"}>
        {status === "saving" ? "Adding…" : "Add unit"}
      </Button>
      {status === "error" && <span className="text-xs text-risk">Could not add this unit.</span>}
    </form>
  );
}