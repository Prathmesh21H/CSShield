/**
 * Formats a number as Indian Rupees using lakh/crore grouping
 * (e.g. 12345678 -> "₹1,23,45,678"), which is what the intended
 * CISO/CFO/auditor audience actually reads comfortably — plain
 * Western thousands-grouping on a rupee figure reads oddly to them.
 */
export function formatINR(value: number, options?: { compact?: boolean }): string {
  if (options?.compact) {
    return formatCompactINR(value);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Compact form for dashboard headline numbers: ₹2.3 Cr, ₹85.0 L.
 * Crore = 1,00,00,000 ; Lakh = 1,00,000 — the units this platform's
 * audience actually thinks in.
 */
export function formatCompactINR(value: number): string {
  const abs = Math.abs(value);

  if (abs >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(1)} Cr`;
  }
  if (abs >= 1_00_000) {
    return `₹${(value / 1_00_000).toFixed(1)} L`;
  }
  return formatINR(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return "never";

  const diffMs = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}