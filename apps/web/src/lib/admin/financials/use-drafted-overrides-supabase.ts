"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  dbRowToPanelState,
  panelStateToOverrides,
  type EffectiveTemplateRow,
  type PnlDbColumn,
  type PnlPanelState,
} from "./pnl-line-mapping";
import type { PnlForecastRow } from "./defaults";

/**
 * FASE 3 sub-paso 5 · Supabase-backed drafted overrides for the P&L panel.
 *
 * Mirrors the surface of `useDraftedOverrides` (sub-paso 1 OLD) so the
 * panel migration in sub-paso 6 stays surgical · adds 4 new states the
 * old hook didn't need (loading · saving · error · server-derived
 * metadata) and replaces localStorage with the 2 API routes from
 * sub-pasos 2 + 4.
 *
 * Design (operator-firmed 2026-05-28 · 7-point plan):
 *
 *   1. Filters come from the panel via prop. Hook is INERT when filters=null.
 *      Panel owns "no filter yet" UX during cascade bootstrap.
 *
 *   2. setFilters(new) starts a re-fetch. Panel must handle the isDirty
 *      modal BEFORE calling setFilters (modal-of-3 = panel responsibility).
 *
 *   3. Concurrency: AbortController on every fetch + sequence counter
 *      belt-and-braces. Old responses never overwrite newer state.
 *
 *   4. Errors typed by kind · `fetch_failed` (clears draft) ·
 *      `save_failed` (preserves draft + isDirty=true) · `reset_failed` ·
 *      `template_not_found` · `auth`. Panel switches UX on kind.
 *
 *   5. lastSavedAt is IN-SESSION ONLY (null on mount even if overrides
 *      exist). Backlog #23: add last_override_updated_at to view for
 *      multi-operator UX.
 *
 *   6. overriddenLines exposed RAW (PnlDbColumn[] from view). Base value
 *      for revert tooltip deferred to sub-paso 6 decision (backlog #24).
 *
 *   7. reset() POSTs `overrides: []` directly. Panel owns the confirm
 *      modal with the override count visible.
 *
 * The hook does NOT touch use-overrides.ts (still serving CAPEX,
 * AcquisitionCosts, DynamicCapRate, FinancialStructure cards) · sub-paso
 * 6 is where the panel rewires.
 */

// ── Types ───────────────────────────────────────────────────────────────

export interface DimensionTuple {
  country: string;
  market: string | null;
  submarket: string | null;
  class: string | null;
  segmentation_type: "hotel" | "apartahotel" | "hostel" | null;
}

export type DataSource =
  | "costar_submarket_aggregate"
  | "costar_national"
  | "derived_mvp_rule"
  | "pending_costar";

export type HookErrorKind =
  | "fetch_failed"
  | "save_failed"
  | "reset_failed"
  | "template_not_found"
  | "auth";

export interface HookError {
  kind: HookErrorKind;
  message: string;
  retriable: boolean;
}

export interface UseDraftedOverridesSupabaseApi {
  // ── Edit state ──
  draft: PnlPanelState;
  isDirty: boolean;
  hydrated: boolean;
  loading: boolean;
  saving: boolean;
  error: HookError | null;

  // ── Server snapshot (read-only · panel renders badge/tint from these) ──
  template: EffectiveTemplateRow | null;
  dataSource: DataSource | null;
  overriddenLines: PnlDbColumn[];
  lastSavedAt: Date | null;

  // ── Actions ──
  setDraft: (next: PnlPanelState | ((prev: PnlPanelState) => PnlPanelState)) => void;
  setFilters: (newFilters: DimensionTuple | null) => void;
  save: () => Promise<void>;
  discard: () => void;
  reset: () => Promise<void>;
  retry: () => Promise<void>;
}

// ── URL builder ─────────────────────────────────────────────────────────

function buildTemplateUrl(filters: DimensionTuple): string {
  const u = new URL("/api/admin/financials/pnl-template", window.location.origin);
  u.searchParams.set("country", filters.country);
  if (filters.market !== null) u.searchParams.set("market", filters.market);
  if (filters.submarket !== null) u.searchParams.set("submarket", filters.submarket);
  if (filters.class !== null) u.searchParams.set("class", filters.class);
  if (filters.segmentation_type !== null)
    u.searchParams.set("segmentation_type", filters.segmentation_type);
  return u.pathname + u.search;
}

// ── Empty draft helper ──────────────────────────────────────────────────

function buildSeedDraft(rows: ReadonlyArray<PnlForecastRow>): PnlPanelState {
  const out: PnlPanelState = {};
  for (const r of rows) {
    if (!r.assump) continue;
    out[r.id] = { value: r.assump.value, sub: r.assump.sub ?? "" };
  }
  return out;
}

// ── Hook ────────────────────────────────────────────────────────────────

export function useDraftedOverridesSupabase(
  filters: DimensionTuple | null,
  rows: ReadonlyArray<PnlForecastRow>,
): UseDraftedOverridesSupabaseApi {
  // Server snapshot (the merged template returned by GET pnl-template)
  const [template, setTemplate] = useState<EffectiveTemplateRow | null>(null);
  // Draft = operator's current edits · diverges from `template`-derived state when isDirty
  const [draft, setDraftRaw] = useState<PnlPanelState>(() => buildSeedDraft(rows));
  // Server-derived panel state (draft snapshot when not dirty)
  const [serverState, setServerState] = useState<PnlPanelState>(() => buildSeedDraft(rows));

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [error, setError] = useState<HookError | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // ── Internal filter state (mirror prop · setFilters mutates) ──
  const [activeFilters, setActiveFilters] = useState<DimensionTuple | null>(filters);
  useEffect(() => {
    setActiveFilters(filters);
  }, [filters]);

  // ── Concurrency guards ──
  const inFlightRef = useRef<AbortController | null>(null);
  const fetchSeqRef = useRef<number>(0);
  const saveSeqRef = useRef<number>(0);

  // Refs for retry() · stores last operation kind + payload
  const lastOpRef = useRef<{ kind: "fetch" | "save" | "reset" } | null>(null);

  // ── Fetcher ─────────────────────────────────────────────────────────
  const doFetch = useCallback(
    async (f: DimensionTuple): Promise<void> => {
      lastOpRef.current = { kind: "fetch" };
      inFlightRef.current?.abort();
      const ctrl = new AbortController();
      inFlightRef.current = ctrl;
      const mySeq = ++fetchSeqRef.current;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(buildTemplateUrl(f), {
          signal: ctrl.signal,
          credentials: "include",
        });
        if (mySeq !== fetchSeqRef.current) return;

        if (res.status === 403) {
          setError({ kind: "auth", message: "Sesión expirada", retriable: false });
          return;
        }
        if (res.status === 404) {
          setTemplate(null);
          setServerState(buildSeedDraft(rows));
          setDraftRaw(buildSeedDraft(rows));
          setError({
            kind: "template_not_found",
            message: "Sin datos para esta combinación",
            retriable: false,
          });
          return;
        }
        if (!res.ok) {
          setError({
            kind: "fetch_failed",
            message: `HTTP ${res.status}`,
            retriable: true,
          });
          return;
        }
        const body = (await res.json()) as { ok: boolean; template?: EffectiveTemplateRow };
        if (mySeq !== fetchSeqRef.current) return;
        if (!body.ok || !body.template) {
          setError({
            kind: "fetch_failed",
            message: "respuesta sin template",
            retriable: true,
          });
          return;
        }
        const tpl = body.template;
        const next = dbRowToPanelState(tpl, rows);
        setTemplate(tpl);
        setServerState(next);
        setDraftRaw(next);
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        if (mySeq !== fetchSeqRef.current) return;
        setError({
          kind: "fetch_failed",
          message: err instanceof Error ? err.message : String(err),
          retriable: true,
        });
      } finally {
        if (mySeq === fetchSeqRef.current) {
          setLoading(false);
          setHydrated(true);
        }
      }
    },
    [rows],
  );

  // ── Mount + filter-change effect ────────────────────────────────────
  useEffect(() => {
    if (activeFilters === null) {
      setHydrated(true);
      return;
    }
    void doFetch(activeFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeFilters?.country,
    activeFilters?.market,
    activeFilters?.submarket,
    activeFilters?.class,
    activeFilters?.segmentation_type,
  ]);

  // ── Setters ─────────────────────────────────────────────────────────
  const setDraft = useCallback((next: PnlPanelState | ((prev: PnlPanelState) => PnlPanelState)) => {
    setDraftRaw((prev) => (typeof next === "function" ? (next as (p: PnlPanelState) => PnlPanelState)(prev) : next));
  }, []);

  const setFilters = useCallback((newFilters: DimensionTuple | null) => {
    setActiveFilters(newFilters);
  }, []);

  // ── save() · POST overrides + refresh ───────────────────────────────
  const save = useCallback(async (): Promise<void> => {
    if (!template) return;
    lastOpRef.current = { kind: "save" };
    const overrides = panelStateToOverrides(draft, template);
    const body = {
      template_id: template.id,
      overrides: overrides.map((o) => ({ line_item: o.line_item, override_value: o.override_value })),
    };
    const mySeq = ++saveSeqRef.current;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/financials/pnl-overrides", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (mySeq !== saveSeqRef.current) return;
      if (!res.ok) {
        setError({
          kind: "save_failed",
          message: `HTTP ${res.status}`,
          retriable: true,
        });
        return;
      }
      setLastSavedAt(new Date());
      // Refresh from server so overriddenLines + effective values are authoritative
      if (activeFilters !== null) await doFetch(activeFilters);
    } catch (err) {
      if (mySeq !== saveSeqRef.current) return;
      setError({
        kind: "save_failed",
        message: err instanceof Error ? err.message : String(err),
        retriable: true,
      });
    } finally {
      if (mySeq === saveSeqRef.current) setSaving(false);
    }
  }, [template, draft, activeFilters, doFetch]);

  // ── discard() · revert draft to last server snapshot ────────────────
  const discard = useCallback(() => {
    setDraftRaw(serverState);
    setError(null);
  }, [serverState]);

  // ── reset() · POST empty array + refresh ────────────────────────────
  const reset = useCallback(async (): Promise<void> => {
    if (!template) return;
    lastOpRef.current = { kind: "reset" };
    const mySeq = ++saveSeqRef.current;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/financials/pnl-overrides", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template_id: template.id, overrides: [] }),
      });
      if (mySeq !== saveSeqRef.current) return;
      if (!res.ok) {
        setError({
          kind: "reset_failed",
          message: `HTTP ${res.status}`,
          retriable: true,
        });
        return;
      }
      setLastSavedAt(null);
      if (activeFilters !== null) await doFetch(activeFilters);
    } catch (err) {
      if (mySeq !== saveSeqRef.current) return;
      setError({
        kind: "reset_failed",
        message: err instanceof Error ? err.message : String(err),
        retriable: true,
      });
    } finally {
      if (mySeq === saveSeqRef.current) setSaving(false);
    }
  }, [template, activeFilters, doFetch]);

  // ── retry() · re-execute the last failed operation ──────────────────
  const retry = useCallback(async (): Promise<void> => {
    const op = lastOpRef.current;
    if (!op) return;
    if (op.kind === "fetch" && activeFilters !== null) await doFetch(activeFilters);
    else if (op.kind === "save") await save();
    else if (op.kind === "reset") await reset();
  }, [activeFilters, doFetch, save, reset]);

  // ── Derived ─────────────────────────────────────────────────────────
  const isDirty = JSON.stringify(draft) !== JSON.stringify(serverState);
  const overriddenLines: PnlDbColumn[] = template?.overridden_lines ?? [];
  const dataSource: DataSource | null = template?.data_source ?? null;

  return {
    draft,
    isDirty,
    hydrated,
    loading,
    saving,
    error,
    template,
    dataSource,
    overriddenLines,
    lastSavedAt,
    setDraft,
    setFilters,
    save,
    discard,
    reset,
    retry,
  };
}
