// Compatibility re-export — kept so existing imports continue to resolve
// while the codebase migrates to `@/components/layout/app-header` directly.
//
// New consumers should import `AppHeader` from `@/components/layout/app-header`.

export { AppHeader as LandingHeader } from "@/components/layout/app-header";
export type { AppHeaderProps as LandingHeaderProps } from "@/components/layout/app-header";
