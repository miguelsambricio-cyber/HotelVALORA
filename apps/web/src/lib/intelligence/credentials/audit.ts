import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Audit-event emission for credential operations.
 *
 * Every provision / rotation / invalidation / auth_failure writes a row
 * into public.ai_events. The row carries the source_slug + the operation
 * name + a small non-sensitive payload (rotation_count_after, status). It
 * NEVER carries a credential value, a username, or a password fragment.
 *
 * The CEO / Orchestration Agent subscribes to these events. The QA /
 * Monitoring Agent picks up auth_failure events and routes Resend digests
 * to INTERNAL_ALERT_RECIPIENTS.
 */

export type CredentialEventKind =
  | "credential.provisioned"
  | "credential.rotated"
  | "credential.invalidated"
  | "credential.auth_failure_detected"
  | "credential.auth_attempt_failed"; // failed operator-token check

export interface CredentialAuditPayload {
  /** Monotonic rotation count AFTER the event (post-state). */
  rotationCountAfter?: number;
  /** Operator-facing reason — for invalidation events. */
  reason?: string;
  /** Active-KEK identifier — for forensics. */
  encKeyId?: string;
}

export async function emitCredentialEvent(
  sourceSlug: string,
  kind: CredentialEventKind,
  payload: CredentialAuditPayload = {},
): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    // Map credential operations onto the existing ai_event_kind taxonomy.
    // We deliberately reuse `system_alert` (a safe generic) for now —
    // a future migration can extend the enum with credential-specific kinds.
    await sb.from("ai_events").insert({
      kind: "system_alert",
      severity: kind === "credential.auth_failure_detected" ? "warning" : "info",
      payload: {
        category: "credential",
        operation: kind,
        source_slug: sourceSlug,
        ...payload,
      },
      // We never reference an agent here because credential operations are
      // operator-driven, not agent-driven. Audit trail is operator-side.
    } as never);
  } catch {
    // Audit failure must not block the credential operation. The
    // operation already succeeded server-side; missing the audit row is
    // recoverable (operator can manually reconstruct from DB state).
    // We intentionally swallow — but the catch is here so we never
    // accidentally leak the payload via an unhandled rejection.
  }
}
