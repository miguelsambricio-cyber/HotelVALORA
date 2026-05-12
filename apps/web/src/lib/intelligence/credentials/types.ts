/**
 * Public types for the T1.5 credential layer.
 *
 * NOTE: every type here is safe to expose to the browser. None of them
 * include encrypted bytea fields, KEK identifiers used for crypto, or
 * any other secret material. The encrypted columns live exclusively in
 * server-side modules.
 */

export type CredentialLifecycleStatus =
  | "active"        // provisioned, presumed valid
  | "invalidated"   // operator cleared
  | "auth_failure"  // refresh script reported login failure
  | "rotated";      // superseded by a newer active row

/**
 * Operator-facing descriptor — what the admin UI renders. NEVER includes
 * the actual credential values, encrypted bytes, or KEK material.
 */
export interface CredentialStatusDescriptor {
  /** Whether an active row exists for this source. */
  provisioned: boolean;
  /** Active-row status when provisioned, null otherwise. */
  status: CredentialLifecycleStatus | null;
  /** When the active row was last written (provision or rotation). */
  lastRotatedAt: string | null;
  /** When the refresh script last consumed these credentials. */
  lastUsedAt: string | null;
  /** Monotonic rotation counter (1 = first provision). */
  rotationCount: number;
  /** Active-KEK identifier — surfaced for forensics, not a secret. */
  encKeyId: string | null;
  /** When invalidated. */
  invalidatedAt: string | null;
  /** Operator-facing invalidation reason — never a credential fragment. */
  invalidatedReason: string | null;
}

export const EMPTY_CREDENTIAL_DESCRIPTOR: CredentialStatusDescriptor = {
  provisioned: false,
  status: null,
  lastRotatedAt: null,
  lastUsedAt: null,
  rotationCount: 0,
  encKeyId: null,
  invalidatedAt: null,
  invalidatedReason: null,
};

/**
 * Result of a credential server action — kept narrow so the response
 * payload reveals nothing about input validity, just success/failure.
 */
export type CredentialActionResult =
  | { ok: true; descriptor: CredentialStatusDescriptor }
  | { ok: false; error: "unauthorized" | "validation" | "storage" | "encryption" | "not_provisioned" };
