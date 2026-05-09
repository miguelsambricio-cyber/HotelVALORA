// Canonical premium-tier gating primitives.
// `UpgradeGate`     — inline blurred-row teaser embedded inside a section.
// `UpgradeCard`     — full-width upgrade promotion card.
// Both are `print:hidden` — they are removed from PDF output by design.

export { LockedGate as UpgradeGate } from "@/components/report/ui/locked-gate";
export { LockedUpgradeCard as UpgradeCard } from "@/components/report/ui/locked-upgrade-card";
