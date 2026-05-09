import type { ReactNode } from "react";
import { SettingsLayout } from "@/components/settings";

/**
 * Route layout for /settings/*. Wraps every settings sub-page in the
 * shared institutional shell (AppHeader + sticky sidebar + footer).
 * Sub-page files only render their content area.
 */
export default function SettingsRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <SettingsLayout>{children}</SettingsLayout>;
}
