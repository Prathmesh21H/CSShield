/**
 * Fixed intents for the chat assistant. Keyword-matched rather than
 * classified by the LLM itself — this keeps intent routing deterministic
 * and auditable, and means a misclassification can never cause the model
 * to fetch the wrong (or no) grounding data.
 */
export type ChatIntent =
  | "highest_risk"
  | "budget_recommendation"
  | "compliance_status"
  | "what_if_patch"
  | "general_summary";

const INTENT_KEYWORDS: Record<ChatIntent, string[]> = {
  highest_risk: ["biggest risk", "highest risk", "top risk", "worst", "riskiest"],
  budget_recommendation: ["budget", "spend", "invest", "afford", "recommend"],
  compliance_status: ["compliance", "framework", "nist", "iso", "rbi", "sebi", "audit"],
  what_if_patch: ["what if", "patch", "fix this", "remediate"],
  general_summary: [], // fallback — matched last
};

export function classifyIntent(question: string): ChatIntent {
  const lower = question.toLowerCase();

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [ChatIntent, string[]][]) {
    if (intent === "general_summary") continue;
    if (keywords.some((kw) => lower.includes(kw))) {
      return intent;
    }
  }

  return "general_summary";
}