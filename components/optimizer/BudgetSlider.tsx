"use client";

import { formatCompactINR } from "@/lib/utils/formatCurrency";

interface BudgetSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

export function BudgetSlider({ value, min, max, step, onChange }: BudgetSliderProps) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label htmlFor="budget" className="text-sm font-medium text-ink-soft">
          Available security budget
        </label>
        <span className="font-figures text-2xl font-semibold text-ink">
          {formatCompactINR(value)}
        </span>
      </div>
      <input
        id="budget"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none bg-line accent-accent"
      />
      <div className="mt-1 flex justify-between text-xs text-ink-soft">
        <span>{formatCompactINR(min)}</span>
        <span>{formatCompactINR(max)}</span>
      </div>
    </div>
  );
}