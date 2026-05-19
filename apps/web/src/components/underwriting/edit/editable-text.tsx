"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { selectText, useEditModeStore } from "@/lib/underwriting/edit-mode/store";
import { cn } from "@/lib/utils";

/**
 * EditableText · renders `defaultText` (or the persisted override) as plain
 * text; switches to a contentEditable span in edit mode so the operator
 * can rewrite labels inline. Changes flow into the draft store; Save
 * commits them to localStorage.
 *
 * `textId` is the stable lookup key — must be unique across the page.
 *
 * Children are an optional fallback for when no override is desired
 * (e.g. node trees), but the editable-mode branch only handles plain text.
 */
export function EditableText({
  textId,
  defaultText,
  as: As = "span" as ElementType,
  className,
  multiline = false,
  children,
}: {
  textId: string;
  defaultText: string;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  children?: ReactNode;
}) {
  const editMode = useEditModeStore((s) => s.editMode);
  const effective = useEditModeStore((s) => selectText(s, textId, defaultText));
  const setText = useEditModeStore((s) => s.setText);
  const ref = useRef<HTMLElement>(null);

  // Keep DOM in sync when the store value changes from outside (Discard, etc.)
  useEffect(() => {
    if (!editMode) return;
    const el = ref.current;
    if (el && el.textContent !== effective) el.textContent = effective;
  }, [editMode, effective]);

  if (!editMode) {
    return <As className={className}>{effective || children}</As>;
  }

  return (
    <As
      ref={ref as never}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={`Editar ${textId}`}
      onBlur={(e: { currentTarget: HTMLElement }) => {
        const next = (e.currentTarget.textContent ?? "").trim();
        if (next !== effective) setText(textId, next);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      className={cn(
        className,
        "rounded-sm outline-none ring-1 ring-dashed ring-[#005db7]/50 ring-offset-2 ring-offset-white",
        "focus:bg-blue-50/60 focus:ring-2 focus:ring-[#005db7]",
      )}
    >
      {effective}
    </As>
  );
}
