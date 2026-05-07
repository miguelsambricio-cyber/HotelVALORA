"use client";

import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { ReportSidebar } from "./report-sidebar";
import { ReportHeader } from "./report-header";
import { cn } from "@/lib/utils";

interface ReportLayoutProps {
  reportId: string;
  children: ReactNode;
}

export function ReportLayout({ reportId, children }: ReportLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden print:block print:h-auto print:bg-white print:overflow-visible">

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col w-60 bg-white border-r border-slate-200 transition-transform duration-200 shrink-0",
          "lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "print:hidden"
        )}
      >
        {/* Brand bar */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-slate-100 shrink-0">
          <span className="text-sm font-bold text-forest-700 tracking-tight">
            VALORA
          </span>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
            className="lg:hidden text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <ReportSidebar reportId={reportId} />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0">
          <p className="text-[10px] text-slate-400 text-center leading-tight">
            HotelVALORA Intelligence Platform
          </p>
        </div>
      </aside>

      {/* ── Main column ───────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:block print:overflow-visible">

        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white lg:hidden print:hidden shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-slate-700">Informe de Valoración</span>
        </div>

        {/* Report header (hotel name + export actions) */}
        <ReportHeader />

        {/* Scrollable section content */}
        <main
          id="report-content"
          className="flex-1 overflow-y-auto overscroll-contain print:overflow-visible"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
