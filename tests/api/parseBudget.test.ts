import { describe, it, expect } from "vitest";
import { parseBudgetFromText } from "@/lib/ai/parseBudget";

describe("parseBudgetFromText", () => {
  it("parses '₹50 lakh' as 50 lakh rupees", () => {
    expect(parseBudgetFromText("What would a ₹50 lakh budget fix?")).toBe(50_00_000);
  });

  it("parses plain '50 lakh' without the ₹ sign", () => {
    expect(parseBudgetFromText("If I had 50 lakh to spend")).toBe(50_00_000);
  });

  it("parses the compact '50L' form", () => {
    expect(parseBudgetFromText("with a 50L budget")).toBe(50_00_000);
  });

  it("parses crore amounts, including decimals", () => {
    expect(parseBudgetFromText("spend 1.5 crore on security")).toBe(1_50_00_000);
  });

  it("parses a bare ₹ figure with commas", () => {
    expect(parseBudgetFromText("budget of ₹50,00,000")).toBe(50_00_000);
  });

  it("returns null when no amount is present", () => {
    expect(parseBudgetFromText("What is our biggest risk today?")).toBeNull();
  });
});