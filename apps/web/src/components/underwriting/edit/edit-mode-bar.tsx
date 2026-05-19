"use client";

import { Check, Eye, Undo2, Trash2 } from "lucide-react";
import {
  selectDirty,
  selectHiddenCount,
  useEditModeStore,
} from "@/lib/underwriting/edit-mode/store";
import { cn } from "@/lib/utils";

/**
 * Floating Save / Discard bar · only visible while edit mode is active.
 *
 * Surfaces:
 *   · Status line       · dirty hint OR last saved timestamp
 *   · "Mostrar ocultas" · appears when there are hidden cards
 *   · Restaurar         · wipes ALL persisted overrides + hidden cards
 *   · Descartar         · drops the current draft
 *   · Guardar           · commits draft → saved → localStorage
 */
export function EditModeBar() {
  const editMode = useEditModeStore((s) => s.editMode);
  const dirty = useEditModeStore(selectDirty);
  const hiddenCount = useEditModeStore(selectHiddenCount);
  const commit = useEditModeStore((s) => s.commit);
  const discard = useEditModeStore((s) => s.discard);
  const resetAll = useEditModeStore((s) => s.resetAll);
  const unhideAll = useEditModeStore((s) => s.unhideAll);
  const savedAt = useEditModeStore((s) => s.savedAt);

  if (!editMode) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 print:hidden">
      <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xl ring-1 ring-black/5">
        <div className="flex min-w-0 flex-col">
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#005db7]">
            Modo edición
          </span>
          <span className="font-mono text-[10.5px] text-slate-600">
            {dirty
              ? "Tienes cambios sin guardar"
              : savedAt
                ? `Último guardado · ${formatSavedAt(savedAt)}`
                : "Sin cambios"}
          </span>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={unhideAll}
              title="Restaurar las tarjetas ocultas en este borrador"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#005db7]/30 bg-blue-50 px-2.5 py-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-[#005db7] transition-colors hover:bg-blue-100"
            >
              <Eye size={12} />
              Mostrar ocultas
              <span className="rounded bg-white px-1 font-mono text-[9px] text-[#005db7] ring-1 ring-[#005db7]/30">
                {hiddenCount}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={resetAll}
            title="Borrar todas las personalizaciones guardadas"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-700"
          >
            <Trash2 size={12} />
            Restaurar
          </button>
          <button
            type="button"
            onClick={discard}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
              "border-slate-300 bg-white text-slate-700 hover:border-slate-400",
            )}
          >
            <Undo2 size={12} />
            Descartar
          </button>
          <button
            type="button"
            onClick={commit}
            disabled={!dirty}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.18em] transition-all",
              dirty
                ? "bg-[#005db7] text-white shadow-sm hover:brightness-110 active:scale-[0.98]"
                : "cursor-not-allowed bg-slate-100 text-slate-400",
            )}
          >
            <Check size={12} strokeWidth={2.75} />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSavedAt(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  const time = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `hoy ${time}`;
  return `${d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} ${time}`;
}
