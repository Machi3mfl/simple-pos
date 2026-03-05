"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  readonly checked?: boolean;
  readonly onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          if (disabled) {
            return;
          }

          onCheckedChange?.(!checked);
        }}
        className={cn(
          "inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-slate-300 bg-white text-blue-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "border-blue-500 bg-blue-600 text-white"
            : "hover:border-blue-300",
          className,
        )}
        {...props}
      >
        <Check className={cn("size-3", checked ? "opacity-100" : "opacity-0")} />
      </button>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
