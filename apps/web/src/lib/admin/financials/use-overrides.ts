"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * localStorage-backed persistence for admin/financials overrides.
 *
 * Each card (CAPEX, P&L) stores its overrides under a fixed key so reloads
 * survive. Operator stays on a single device for now · Phase D will move
 * the source-of-truth to a Supabase admin_financial_settings table so
 * edits propagate across devices and survive cache clears.
 *
 * Storage shape: arbitrary JSON · the consumer defines the schema.
 * useOverrides keeps the parsed state in React state and writes it back
 * on every mutation. Returns a small API mirror of useState plus a
 * lastSavedAt timestamp + reset helper.
 */
export interface OverridesApi<T> {
  state: T;
  set: (next: T | ((prev: T) => T)) => void;
  reset: () => void;
  lastSavedAt: Date | null;
  hydrated: boolean;
}

export function useOverrides<T>(storageKey: string, defaults: T): OverridesApi<T> {
  // Start with defaults · client-only effect overrides from localStorage
  // post-hydration. Avoids SSR / hydration mismatch.
  const [state, setState] = useState<T>(defaults);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { value: T; savedAt: string };
        if (parsed && typeof parsed === "object" && "value" in parsed) {
          setState(parsed.value);
          setLastSavedAt(parsed.savedAt ? new Date(parsed.savedAt) : null);
        }
      }
    } catch {
      // Corrupt or quota-exceeded · ignore · keep defaults.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setState((prev) => {
        const value =
          typeof next === "function"
            ? (next as (p: T) => T)(prev)
            : next;
        try {
          const savedAt = new Date();
          window.localStorage.setItem(
            storageKey,
            JSON.stringify({ value, savedAt: savedAt.toISOString() }),
          );
          setLastSavedAt(savedAt);
        } catch {
          // Storage failed · keep state in memory but flag no save.
        }
        return value;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setState(defaults);
    setLastSavedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return { state, set, reset, lastSavedAt, hydrated };
}

/** Format a Date as "HH:MM · today" or "DD MMM HH:MM" for the saved indicator. */
export function formatSavedAt(d: Date | null): string {
  if (!d) return "not saved";
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return `today ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return `${d.getDate()} ${d.toLocaleString("es-ES", { month: "short" })} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
