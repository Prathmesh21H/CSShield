"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { BudgetSlider } from "@/components/optimizer/BudgetSlider";
import { RecommendedControlsList } from "@/components/optimizer/RecommendedControlsList";
import { RiskReductionChart } from "@/components/optimizer/RiskReductionChart";
import { useOptimizer } from "@/hooks/useOptimizer";

const MIN_BUDGET = 5_00_000; // ₹5 lakh
const MAX_BUDGET = 2_00_00_000; // ₹2 crore
const STEP = 5_00_000;

export default function OptimizerPage() {
  const [budget, setBudget] = useState(50_00_000);
  const { result, status, errorMessage, runOptimization } = useOptimizer();

  function handleChange(value: number) {
    setBudget(value);
    runOptimization(value);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink">Investment optimizer</h1>
        <p className="text-sm text-ink-soft">
          Set a budget to see the combination of controls that reduces the most risk for the money.
        </p>
      </div>

      <Card>
        <BudgetSlider value={budget} min={MIN_BUDGET} max={MAX_BUDGET} step={STEP} onChange={handleChange} />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommended controls</CardTitle>
          </CardHeader>
          <RecommendedControlsList result={result} status={status} errorMessage={errorMessage} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projected exposure</CardTitle>
          </CardHeader>
          {result ? (
            <RiskReductionChart result={result} />
          ) : (
            <p className="py-8 text-center text-sm text-ink-soft">
              Move the slider to see the projected reduction.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}