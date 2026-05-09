// Compatibility re-export — `ReportTopNav` is now the canonical
// `AppHeader` from `@/components/layout/app-header`. The report shell
// imports through this path; new code should import AppHeader directly.

export { AppHeader as ReportTopNav } from "@/components/layout/app-header";
