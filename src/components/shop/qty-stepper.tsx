"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function QtyStepper({
  value,
  min = 1,
  max,
  onChange,
  label = "Quantity",
  size = "md",
  className,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const button =
    "inline-flex items-center justify-center rounded-full text-ink hover:bg-peach-soft disabled:pointer-events-none disabled:opacity-35";
  const box = size === "sm" ? "size-9" : "size-11";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex items-center rounded-full border border-input bg-white", className)}
    >
      <button
        type="button"
        className={cn(button, box)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="size-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className={cn("text-center font-medium tabular-nums", size === "sm" ? "w-7 text-sm" : "w-9")}>
        {value}
      </output>
      <button
        type="button"
        className={cn(button, box)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <PlusIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
