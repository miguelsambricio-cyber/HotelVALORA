"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Calendar, Loader2, Mail, Phone, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { sendTourRequestAction } from "@/lib/email/actions";
import type { LibraryReport } from "@/types/library";

const POPOVER_WIDTH = 320;
const POPOVER_GAP = 16;

export interface ContactCellProps {
  report: LibraryReport;
}

/**
 * Contact column cell. The Mail icon stays grey for any report without
 * `contactInfo` (the rule: only top-promoted reports surface a contact
 * channel). For reports that *do* have it, the icon goes forest-700 and
 * hovering it pops a glass-style account-manager card to the LEFT of
 * the cell.
 *
 * The popover renders via React Portal directly into `document.body`
 * so the `overflow:auto` on the parent table doesn't clip it. Position
 * is captured at hover-enter from `getBoundingClientRect()` and pinned
 * with `position: fixed` until mouse-leave.
 */
export function ContactCell({ report }: ContactCellProps) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isSending, startSending] = useTransition();

  useEffect(() => setMounted(true), []);

  const handleScheduleTour = () => {
    if (!report.contactInfo) return;
    startSending(async () => {
      const result = await sendTourRequestAction({
        accountManagerName: report.contactInfo!.accountManager,
        accountManagerEmail: report.contactInfo!.email,
        hotelName: report.hotelName,
        classification: report.classification,
        rooms: report.rooms,
        city: report.city,
        referenceCode: report.referenceCode,
        // Future: pull from authenticated user (Auth.js session)
      });
      if (result.ok) {
        toast.success("Tour request sent", {
          description: `${report.contactInfo!.accountManager} will be in touch shortly.`,
        });
      } else {
        toast.error("Could not send tour request", {
          description: result.error,
        });
      }
    });
  };

  if (!report.contactInfo) {
    return (
      <Mail
        size={16}
        aria-hidden
        className="text-slate-300"
      />
    );
  }

  const info = report.contactInfo;

  const handleEnter = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    setCoords({
      top: r.top,
      left: r.left - POPOVER_WIDTH - POPOVER_GAP,
    });
  };

  const handleLeave = () => setCoords(null);

  const subject = `${report.hotelName} ${report.starRating}* · ${report.rooms} rooms, ${report.city}`;

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-flex cursor-pointer items-center justify-center"
      >
        <Mail
          size={16}
          aria-label={`Contact ${info.accountManager}`}
          className="text-forest-700 transition-transform group-hover:scale-110"
        />
      </span>

      {mounted && coords && createPortal(
        <article
          role="dialog"
          aria-label="Contact card"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          style={{ top: coords.top, left: coords.left, width: POPOVER_WIDTH }}
          className="fixed z-[1000] overflow-hidden rounded-xl border border-slate-100 bg-white text-left shadow-2xl"
        >
          <header className="bg-forest-900 p-5 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest opacity-70">
                  Account Manager
                </span>
                <h3 className="font-headline text-xl font-extrabold leading-tight">
                  {info.accountManager}
                </h3>
                <p className="mt-1 text-[11px] opacity-80">
                  ID: {info.accountManagerId} — {report.listing.role}
                </p>
              </div>
              <UserCircle2
                size={28}
                aria-hidden
                className="shrink-0 opacity-50"
              />
            </div>
          </header>

          <div className="space-y-4 p-5">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Asunto
              </span>
              <p className="text-[13px] font-semibold text-forest-900">
                {subject}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Objective
                </span>
                <p className="text-[13px] font-medium text-slate-700">
                  {report.listing.objective}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Role
                </span>
                <p className="text-[13px] font-medium text-slate-700">
                  {report.listing.role}
                </p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <a
                href={`mailto:${info.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:text-forest-900"
              >
                <Mail size={14} aria-hidden className="text-forest-700" />
                <span className="truncate underline decoration-forest-700/30 underline-offset-4">
                  {info.email}
                </span>
              </a>
              <div className="flex items-center gap-2.5 text-[13px] font-medium text-slate-600">
                <Phone size={14} aria-hidden className="text-forest-700" />
                <span>{info.phone}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSending}
              onClick={(e) => {
                e.stopPropagation();
                handleScheduleTour();
              }}
              className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-forest-900 transition-colors hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
            >
              {isSending ? (
                <Loader2 size={12} aria-hidden className="animate-spin" />
              ) : (
                <Calendar size={12} aria-hidden />
              )}
              {isSending ? "Sending…" : "Schedule a Tour"}
            </button>
          </div>
        </article>,
        document.body,
      )}
    </>
  );
}
