"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Responsive expanded-detail surface for /user/admin/integrations tiles.
 *
 * Mobile (<sm)  : bottom-anchored sheet · slides up · rounded top corners
 * Desktop (sm+) : right-anchored side drawer · slides in from the right
 *
 * Uses Radix Dialog so focus management, ESC-to-close, and overlay click
 * dismiss work out of the box. The trigger is the compact tile itself —
 * exposed as a plain <button> so the whole tile is clickable. The summary
 * + detail are passed in as React nodes so each tile composes its own
 * content server-side, no client-state plumbing.
 */
export function IntegrationDetailSheet({
  title,
  summary,
  children,
}: {
  /** Used as the dialog title (a11y) and the visible header label. */
  title: string;
  /** The compact tile JSX rendered inside the clickable trigger. */
  summary: React.ReactNode;
  /** The full audit content inside the panel body. */
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Open ${title} details`}
          className={cn(
            "group block w-full cursor-pointer rounded-xl text-left transition-transform",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
            "active:scale-[0.99]",
          )}
        >
          {summary}
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-50 flex flex-col border-slate-800 bg-gradient-to-b from-forest-900 to-slate-950 shadow-2xl outline-none",
            // Mobile — bottom sheet
            "inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl border-t",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
            // Desktop — right side drawer
            "sm:inset-y-0 sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[30rem] sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0",
            "sm:data-[state=open]:slide-in-from-right sm:data-[state=closed]:slide-out-to-right",
          )}
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3.5">
            <DialogPrimitive.Title className="truncate font-headline text-[13px] font-extrabold tracking-tight text-white">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/40"
              aria-label="Close detail panel"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
