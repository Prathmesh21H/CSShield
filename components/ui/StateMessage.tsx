import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface StateMessageProps {
  tone?: "empty" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Shown instead of a card's real content when data isn't available yet —
 * never replaced with a hardcoded placeholder number. Errors state
 * plainly what happened; empty states say what to do next.
 */
export function StateMessage({
  tone = "empty",
  title,
  description,
  action,
  className,
}: StateMessageProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 border border-dashed px-4 py-6",
        tone === "error" ? "border-risk/40 bg-risk-soft/40" : "border-line",
        className
      )}
    >
      <p
        className={cn(
          "text-sm font-medium",
          tone === "error" ? "text-risk" : "text-ink"
        )}
      >
        {title}
      </p>
      {description && (
        <p className="text-sm text-ink-soft">{description}</p>
      )}
      {action}
    </div>
  );
}