import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:border-accent",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";