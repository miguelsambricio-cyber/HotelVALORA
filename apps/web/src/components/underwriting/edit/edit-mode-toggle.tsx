"use client";

import { Pencil, X } from "lucide-react";
import { useEditModeStore } from "@/lib/underwriting/edit-mode/store";
import { cn } from "@/lib/utils";

/**
 * Header button · enters / exits underwriting edit mode.
 *
 * In edit mode the page reveals card-reorder arrows + inline-editable
 * text. Toggling off without committing drops drafts (mirrors a Discard).
 */
export function EditModeToggle() {
  const editMode = useEditModeStore((s) => s.editMode);
  const toggleEditMode = useEditModeStore((s) => s.toggleEditMode);

  return (
    <button
      type="button"
      onClick={toggleEditMode}
      aria-pressed={editMode}
      title={editMode ? "Salir del modo edición" : "Editar layout y textos"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.18em] transition-colors print:hidden",
        editMode
          ? "border-[#005db7] bg-[#005db7] text-white hover:brightness-110"
          : "border-slate-300 bg-white text-slate-700 hover:border-[#005db7] hover:text-[#005db7]",
      )}
    >
      {editMode ? <X size={12} strokeWidth={2.5} /> : <Pencil size={12} strokeWidth={2.5} />}
      <span>{editMode ? "Cerrar edición" : "Editar página"}</span>
    </button>
  );
}
