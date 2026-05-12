import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptString } from "../crypto";
import type {
  CredentialLifecycleStatus,
  CredentialStatusDescriptor,
} from "./types";
import { EMPTY_CREDENTIAL_DESCRIPTOR } from "./types";

/**
 * Server-side reader for intelligence_source_credentials.
 *
 * Two surfaces:
 *   - getCredentialStatus(sourceSlug)
 *       returns a frontend-safe descriptor (no ciphertext, no KEK)
 *       used by the admin UI on every render
 *
 *   - getDecryptedCredentials(sourceSlug)
 *       returns { username, password } in plaintext, ONLY for the
 *       refresh script. Callers MUST discard the plaintext immediately
 *       after use. NEVER serialise / log / persist the return value.
 *
 * Both functions go through the service-role client. PostgREST cannot
 * reach this table (RLS-on, zero policies).
 */

interface CredentialRow {
  source_slug: string;
  status: CredentialLifecycleStatus;
  last_rotated_at: string;
  last_used_at: string | null;
  rotation_count: number;
  enc_key_id: string;
  invalidated_at: string | null;
  invalidated_reason: string | null;
  username_encrypted: string; // base64 from postgrest
  username_iv: string;
  username_auth_tag: string;
  password_encrypted: string;
  password_iv: string;
  password_auth_tag: string;
}

/**
 * Frontend-safe descriptor. Encrypted bytes are NEVER on the return path.
 */
export async function getCredentialStatus(
  sourceSlug: string,
): Promise<CredentialStatusDescriptor> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("intelligence_source_credentials")
    // Explicit narrow select — never include the bytea columns when only
    // the operator-facing descriptor is needed.
    .select(
      "status, last_rotated_at, last_used_at, rotation_count, enc_key_id, invalidated_at, invalidated_reason",
    )
    .eq("source_slug", sourceSlug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return EMPTY_CREDENTIAL_DESCRIPTOR;

  return {
    provisioned: true,
    status: data.status as CredentialLifecycleStatus,
    lastRotatedAt: data.last_rotated_at,
    lastUsedAt: data.last_used_at,
    rotationCount: data.rotation_count,
    encKeyId: data.enc_key_id,
    invalidatedAt: data.invalidated_at,
    invalidatedReason: data.invalidated_reason,
  };
}

/**
 * Decrypted credential reader. ONLY for the refresh script.
 *
 * Returns null if no active row exists. Throws on tamper detection
 * (GCM auth-tag verification failure).
 *
 * The plaintext is in memory for as long as the caller holds the
 * returned object — the caller is responsible for discarding it
 * immediately after use.
 */
export async function getDecryptedCredentials(
  sourceSlug: string,
): Promise<{ username: string; password: string; encKeyId: string } | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("intelligence_source_credentials")
    .select(
      "username_encrypted, username_iv, username_auth_tag, password_encrypted, password_iv, password_auth_tag, enc_key_id",
    )
    .eq("source_slug", sourceSlug)
    .eq("status", "active")
    .maybeSingle<CredentialRow>();

  if (error || !data) return null;

  const username = decryptString({
    ciphertext: bytea(data.username_encrypted),
    iv: bytea(data.username_iv),
    authTag: bytea(data.username_auth_tag),
  });
  const password = decryptString({
    ciphertext: bytea(data.password_encrypted),
    iv: bytea(data.password_iv),
    authTag: bytea(data.password_auth_tag),
  });
  return { username, password, encKeyId: data.enc_key_id };
}

/**
 * Postgres `bytea` round-trips through PostgREST as a hex-encoded string
 * with a leading `\x` prefix. Convert back to Buffer.
 */
function bytea(input: string | Buffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input);
  if (typeof input === "string") {
    if (input.startsWith("\\x")) {
      return Buffer.from(input.slice(2), "hex");
    }
    // Some PostgREST configs return base64.
    return Buffer.from(input, "base64");
  }
  throw new Error("bytea: unsupported input type");
}

/**
 * Update last_used_at on the active row after the refresh script
 * successfully decrypted and used these credentials. Non-fatal — if it
 * fails the credential is still usable; we just lose freshness signal.
 */
export async function markCredentialUsed(sourceSlug: string): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    await sb
      .from("intelligence_source_credentials")
      .update({ last_used_at: new Date().toISOString() })
      .eq("source_slug", sourceSlug)
      .eq("status", "active");
  } catch {
    // Intentionally ignored — see comment in audit.ts.
  }
}
