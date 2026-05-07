"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { ReportContextValue, ReportMetadata } from "@/types/report";

const ReportContext = createContext<ReportContextValue | null>(null);

interface ReportProviderProps {
  report: ReportMetadata | null;
  isLoading?: boolean;
  children: ReactNode;
}

export function ReportProvider({
  report,
  isLoading = false,
  children,
}: ReportProviderProps) {
  const [isPrintMode, setIsPrintMode] = useState(false);

  return (
    <ReportContext.Provider
      value={{
        report,
        isLoading,
        isPrintMode,
        togglePrintMode: () => setIsPrintMode((v) => !v),
      }}
    >
      {children}
    </ReportContext.Provider>
  );
}

export function useReport(): ReportContextValue {
  const ctx = useContext(ReportContext);
  if (!ctx) throw new Error("useReport must be used inside <ReportProvider>");
  return ctx;
}
