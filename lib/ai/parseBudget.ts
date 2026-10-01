/**
 * Extracts a rupee amount from a natural-language question like
 * "What would a ₹50 lakh budget fix?" or "If I spend 1.5 crore...".
 * Used so the chat assistant can run the optimizer LIVE for the budget
 * actually asked about, instead of only ever reading whatever budget was
 * last set on the Optimizer page's slider — which was the root cause of
 * it falling back to "no data" for a budget nobody had entered yet.
 */
export function parseBudgetFromText(text: string): number | null {
  const croreOrLakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(crore|cr|lakhs?|l)\b/i);
  if (croreOrLakhMatch) {
    const amount = parseFloat(croreOrLakhMatch[1]);
    const unit = croreOrLakhMatch[2].toLowerCase();
    const multiplier = unit.startsWith("cr") ? 1_00_00_000 : 1_00_000;
    return Math.round(amount * multiplier);
  }

  const rupeeMatch = text.match(/₹\s*([\d,]+(?:\.\d+)?)/);
  if (rupeeMatch) {
    const amount = parseFloat(rupeeMatch[1].replace(/,/g, ""));
    if (!Number.isNaN(amount)) return Math.round(amount);
  }

  return null;
}