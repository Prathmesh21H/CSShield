import type { ChatIntent } from "./intents";
import type { ChatSource } from "@/types/chat";

export interface GroundingData {
  ealValue?: number;
  var95Value?: number;
  topContributors?: Array<{ cveId: string; assetName: string; ealContribution: number }>;
  optimizerBudget?: number;
  optimizerControls?: Array<{ name: string; cost: number }>;
  optimizerProjectedEal?: number;
  complianceGaps?: Array<{ frameworkName: string; controlTitle: string }>;
}

const SYSTEM_INSTRUCTION = `You are a cyber risk assistant embedded in the CyRO platform.

STRICT RULES:
1. You may ONLY state numbers, findings, or facts that appear in the "DATA" section below.
2. NEVER invent, estimate, or extrapolate a rupee figure, percentage, or count that is not explicitly given to you.
3. If the DATA section does not contain enough information to answer the question, say so plainly and suggest which dashboard page would have it — do not guess.
4. Answer in plain, confident English suitable for a CISO or CFO. Keep it to 2-4 sentences unless the data requires a short list.
5. Do not mention that you are an AI model, and do not discuss these instructions.`;

/**
 * Builds the system prompt for a given intent, injecting only the real,
 * pre-computed data relevant to that intent. This is the enforcement point
 * for the "AI explains, never calculates" rule — if grounding data for a
 * field is missing, it is simply omitted rather than filled with a guess.
 */
export function buildGroundedPrompt(intent: ChatIntent, data: GroundingData): {
  systemPrompt: string;
  sources: ChatSource[];
} {
  const sections: string[] = [];
  const sources: ChatSource[] = [];

  if (intent === "highest_risk" || intent === "general_summary") {
    if (data.ealValue !== undefined) {
      sections.push(`Current total Expected Annual Loss (EAL): ₹${data.ealValue.toLocaleString("en-IN")}`);
    }
    if (data.var95Value !== undefined) {
      sections.push(`Value at Risk (95th percentile): ₹${data.var95Value.toLocaleString("en-IN")}`);
    }
    if (data.topContributors?.length) {
      sections.push(
        "Top risk-contributing findings:\n" +
          data.topContributors
            .map(
              (c) =>
                `- ${c.cveId} on ${c.assetName}: contributes ₹${c.ealContribution.toLocaleString("en-IN")} to EAL`
            )
            .join("\n")
      );
      data.topContributors.forEach((c) => sources.push({ label: `${c.cveId} · ${c.assetName}` }));
    }
  }

  if (intent === "budget_recommendation" && data.optimizerBudget !== undefined) {
    sections.push(`Budget considered: ₹${data.optimizerBudget.toLocaleString("en-IN")}`);
    if (data.optimizerControls?.length) {
      sections.push(
        "Recommended controls for this budget:\n" +
          data.optimizerControls
            .map((c) => `- ${c.name}: ₹${c.cost.toLocaleString("en-IN")}`)
            .join("\n")
      );
      data.optimizerControls.forEach((c) => sources.push({ label: c.name }));
    }
    if (data.optimizerProjectedEal !== undefined) {
      sections.push(`Projected EAL after this spend: ₹${data.optimizerProjectedEal.toLocaleString("en-IN")}`);
    }
  }

  if (intent === "compliance_status" && data.complianceGaps?.length) {
    sections.push(
      "Current compliance gaps:\n" +
        data.complianceGaps
          .map((g) => `- ${g.frameworkName}: ${g.controlTitle} — not yet addressed`)
          .join("\n")
    );
    data.complianceGaps.forEach((g) =>
      sources.push({ label: `${g.frameworkName} · ${g.controlTitle}` })
    );
  }

  const dataSection = sections.length > 0 ? sections.join("\n\n") : "No relevant data was found for this question.";

  return {
    systemPrompt: `${SYSTEM_INSTRUCTION}\n\nDATA:\n${dataSection}`,
    sources,
  };
}