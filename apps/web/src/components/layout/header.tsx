// Compatibility re-export — the dashboard's old `Header` (search /
// theme toggle / bell / avatar from the initial scaffold) is replaced
// by the unified institutional `AppHeader`. Search and notifications
// will move into AppHeader's optional slots when wired up.

export { AppHeader as Header } from "@/components/layout/app-header";
