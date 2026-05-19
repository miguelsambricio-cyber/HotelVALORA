"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, GripVertical, X } from "lucide-react";
import { useEditModeStore } from "@/lib/underwriting/edit-mode/store";
import { cn } from "@/lib/utils";

/**
 * SortableGrid · ordered card container that respects the edit-mode store.
 *
 * Out of edit mode it renders exactly like the plain grid it replaces. In
 * edit mode it overlays each card with ← → controls + an X (hide) button
 * so the operator can shuffle the order and remove tiles they don't want
 * to see. All gestures are mouse + touch friendly · no DnD library.
 *
 * Hidden cards stay registered in the store and re-appear from the
 * EditModeBar's "Mostrar ocultas" action.
 *
 * Subscription discipline: subscribe to raw persisted/draft slices (stable
 * refs unless they actually change) and reconcile against `defaultOrder`
 * + the hidden list inside `useMemo`. Selectors that synthesize new
 * arrays on every render would loop-render the page.
 */
export interface SortableGridItem {
  id: string;
  content: ReactNode;
}

function uniqueOrdered(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

function reconcile(defaultOrder: string[], savedOrder: string[] | undefined): string[] {
  if (!savedOrder || savedOrder.length === 0) return defaultOrder;
  const known = new Set(defaultOrder);
  const kept = savedOrder.filter((id) => known.has(id));
  const appended = defaultOrder.filter((id) => !kept.includes(id));
  return uniqueOrdered([...kept, ...appended]);
}

export function SortableGrid({
  gridId,
  items,
  className,
}: {
  gridId: string;
  items: SortableGridItem[];
  className?: string;
}) {
  const defaultOrder = useMemo(() => items.map((i) => i.id), [items]);

  const editMode = useEditModeStore((s) => s.editMode);
  const savedOrder = useEditModeStore((s) => s.savedOrders[gridId]);
  const draftOrder = useEditModeStore((s) => s.draftOrders[gridId]);
  const savedHidden = useEditModeStore((s) => s.savedHidden[gridId]);
  const draftHidden = useEditModeStore((s) => s.draftHidden[gridId]);
  const registerGrid = useEditModeStore((s) => s.registerGrid);
  const moveCard = useEditModeStore((s) => s.moveCard);
  const hideCard = useEditModeStore((s) => s.hideCard);

  useEffect(() => {
    registerGrid(gridId, defaultOrder);
  }, [gridId, defaultOrder, registerGrid]);

  const effective = useMemo(() => {
    const source = editMode ? (draftOrder ?? savedOrder) : savedOrder;
    return reconcile(defaultOrder, source);
  }, [editMode, draftOrder, savedOrder, defaultOrder]);

  const hiddenSet = useMemo(() => {
    const hiddenSource = editMode ? (draftHidden ?? []) : (savedHidden ?? []);
    return new Set(hiddenSource);
  }, [editMode, draftHidden, savedHidden]);

  const visibleItems = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    return effective
      .filter((id) => !hiddenSet.has(id))
      .map((id) => byId.get(id))
      .filter((x): x is SortableGridItem => Boolean(x));
  }, [items, effective, hiddenSet]);

  return (
    <div className={className}>
      {visibleItems.map((item, idx) => (
        <SortableCard
          key={item.id}
          editing={editMode}
          isFirst={idx === 0}
          isLast={idx === visibleItems.length - 1}
          onMoveLeft={() => moveCard(gridId, idx, idx - 1)}
          onMoveRight={() => moveCard(gridId, idx, idx + 1)}
          onHide={() => hideCard(gridId, item.id)}
        >
          {item.content}
        </SortableCard>
      ))}
    </div>
  );
}

function SortableCard({
  editing,
  isFirst,
  isLast,
  onMoveLeft,
  onMoveRight,
  onHide,
  children,
}: {
  editing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onHide: () => void;
  children: ReactNode;
}) {
  if (!editing) return <>{children}</>;

  return (
    <div className="relative rounded-md ring-2 ring-dashed ring-[#005db7]/40 ring-offset-2 ring-offset-white">
      {children}
      {/* Top-right · destructive hide */}
      <button
        type="button"
        onClick={onHide}
        aria-label="Ocultar tarjeta"
        title="Ocultar tarjeta"
        className="absolute -right-2 -top-2 inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-300 bg-white text-rose-600 shadow-sm transition-all hover:bg-rose-600 hover:text-white active:scale-95"
      >
        <X size={12} strokeWidth={2.75} />
      </button>
      {/* Bottom · reorder controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-1.5">
        <ArrowButton
          direction="left"
          disabled={isFirst}
          onClick={onMoveLeft}
          ariaLabel="Mover tarjeta a la izquierda"
        />
        <div className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#005db7]/10 text-[#005db7]">
          <GripVertical size={12} />
        </div>
        <ArrowButton
          direction="right"
          disabled={isLast}
          onClick={onMoveRight}
          ariaLabel="Mover tarjeta a la derecha"
        />
      </div>
    </div>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
  ariaLabel,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-all",
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
          : "border-[#005db7] bg-white text-[#005db7] hover:bg-[#005db7] hover:text-white active:scale-95",
      )}
    >
      <Icon size={14} strokeWidth={2.5} />
    </button>
  );
}
