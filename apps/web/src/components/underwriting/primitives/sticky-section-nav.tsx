"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Sticky section nav (left rail) · investment-memo style.
 *
 * Corporate light theme · active chip uses forest-900 (the report's
 * canonical "active state" colour, matching the active scenario pill).
 *
 * Mobile: horizontal scroll-snap chips above the section column.
 * Desktop ≥lg: sticky vertical rail.
 */
export interface NavItem {
  number: number;
  label: string;
  anchorId: string;
  hint?: string;
}

export function StickySectionNav({ items }: { items: NavItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.anchorId ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const item of items) {
      const el = document.getElementById(item.anchorId);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav
      aria-label="Underwriting sections"
      className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
    >
      <ul className="flex gap-1.5 overflow-x-auto pb-2 lg:hidden">
        {items.map((item) => (
          <li key={item.anchorId} className="shrink-0">
            <NavChip
              item={item}
              active={item.anchorId === activeId}
              compact
            />
          </li>
        ))}
      </ul>
      <ul className="hidden flex-col gap-1 lg:flex">
        {items.map((item) => (
          <li key={item.anchorId}>
            <NavChip item={item} active={item.anchorId === activeId} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavChip({
  item,
  active,
  compact,
}: {
  item: NavItem;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <a
      href={`#${item.anchorId}`}
      className={cn(
        "block rounded-md ring-1 transition-colors",
        compact ? "px-2.5 py-1" : "px-3 py-2",
        active
          ? "bg-forest-900 text-white ring-forest-900"
          : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-900",
      )}
    >
      <span className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono text-[9px] tabular-nums",
            active ? "text-white/70" : "text-slate-400",
          )}
        >
          {String(item.number).padStart(2, "0")}
        </span>
        <span className="font-headline text-[10.5px] font-bold uppercase tracking-[0.18em]">
          {item.label}
        </span>
      </span>
    </a>
  );
}
