"use client";

import { Printer } from "lucide-react";

export function PDFExportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 bg-[#005db7] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:brightness-110 transition-all active:scale-95"
    >
      <Printer size={16} />
      Exportar PDF
    </button>
  );
}
