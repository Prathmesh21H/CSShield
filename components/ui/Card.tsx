import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Structural container. Deliberately sharp-cornered and border-based
 * rather than the soft-shadow rounded-card default — hierarchy in this
 * design comes from typography and the pill-radius reserved for
 * interactive elements, not from decorating every box the same way.
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "border border-line bg-surface p-6",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex items-start justify-between", className)} {...props} />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-medium text-ink-soft", className)}
      {...props}
    />
  );
}