import type { ReactNode } from "react";
import { LibraryShell } from "@/components/library";

/**
 * Route layout for /library/*. Wraps every library sub-page in the
 * institutional kiosk shell (AppHeader + body row + slim footer). Sub-
 * pages render their content directly into the body row — typically a
 * sidebar + map (favorites-map) or sidebar + table (future "all reports"
 * page).
 */
export default function LibraryRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <LibraryShell>{children}</LibraryShell>;
}
