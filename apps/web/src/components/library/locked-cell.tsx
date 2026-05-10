import { Lock } from "lucide-react";

/**
 * Small lock pill rendered inside a table cell whose value is gated by
 * the viewer's tier. Today driven by `null` financials in the mock
 * dataset; future iteration: read from auth tier + report visibility.
 */
export function LockedCell() {
  return (
    <span
      aria-label="Locked — upgrade required"
      title="Upgrade required"
      className="inline-flex items-center justify-center text-blue-600"
    >
      <Lock size={12} aria-hidden />
    </span>
  );
}
