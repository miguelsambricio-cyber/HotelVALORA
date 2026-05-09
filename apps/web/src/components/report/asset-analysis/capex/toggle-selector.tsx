"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ToggleSelectorOption<T extends string = string> {
  id: T;
  label: string;
}

export interface ToggleSelectorProps<T extends string = string> {
  options: ToggleSelectorOption<T>[];
  /** Initially selected option id */
  defaultSelectedId?: T;
  /** Controlled selected id (when provided, component is fully controlled) */
  selectedId?: T;
  onChange?: (id: T) => void;
  /** Visual size — `md` matches the CAPEX tabs, `lg` matches the open/closed control */
  size?: "md" | "lg";
  /** Hide from PDF (defaults to true — these are interactive controls) */
  hideOnPrint?: boolean;
  className?: string;
}

const SIZE_OUTER: Record<NonNullable<ToggleSelectorProps["size"]>, string> = {
  md: "p-1 bg-slate-100 rounded-lg",
  lg: "p-1 bg-slate-100 rounded-xl border border-slate-200",
};

const SIZE_BUTTON: Record<NonNullable<ToggleSelectorProps["size"]>, string> = {
  md: "px-6 py-2 text-sm font-bold rounded-md",
  lg: "h-[38px] w-[100px] px-4 text-sm font-bold rounded-lg inline-flex items-center justify-center",
};

export function ToggleSelector<T extends string = string>({
  options,
  defaultSelectedId,
  selectedId,
  onChange,
  size = "md",
  hideOnPrint = true,
  className,
}: ToggleSelectorProps<T>) {
  const [internal, setInternal] = useState<T>(
    (defaultSelectedId ?? options[0]?.id) as T,
  );
  const isControlled = selectedId !== undefined;
  const current = isControlled ? selectedId : internal;

  const handleSelect = (id: T) => {
    if (!isControlled) setInternal(id);
    onChange?.(id);
  };

  return (
    <div
      role="tablist"
      className={cn(
        "flex w-fit",
        SIZE_OUTER[size],
        hideOnPrint && "print:hidden",
        className,
      )}
    >
      {options.map((option) => {
        const isActive = option.id === current;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelect(option.id)}
            className={cn(
              SIZE_BUTTON[size],
              "transition-all",
              isActive
                ? "bg-forest-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
