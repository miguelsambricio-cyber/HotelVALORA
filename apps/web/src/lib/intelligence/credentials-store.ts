import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  assertCryptoConfigured,
  decryptSecret,
  encryptSecret,
} from "./crypto";
import { redact, redactError } from "@/lib/security/redact";

/**
 * Server-only T1 credentials store. The only module that touches
 * raw plaintext credentials. Every other module talks to the store
 * via the public surface below — which exposes status metadata only,
 * never the underlying plaintext.
 *
 * Boundaries
 *   - Plaintext flows INTO this module via `provisionOrRotate({...})`
 *     and OUT only through `getDecryptedCredentials(slug)` (server-only,
 *     callable from the refresh script context).
 *   - Status views (`getCredentialsStatus`) return strictly non-secret
 *     metadata for the admin UI.
 *   - Audit writes go to `public.intelligence_credentials_audit` with
 *     pre-redacted detail + error fields.
 */

export interface CredentialsStatusView {
  /** Whether ANY active credential exists for the source. */
  configured: boolean;
  /** Current state of the active row, or null when configured=false. */
  status: "active" | "rotated" | "invalidated" | null;
  /** When the active row was last rotated (ISO). */
  lastRotatedAt: string | null;
  /** Total rotations across the source's lifetime (sum of active+rotated). */
  rotationCount: number;
  /** KEK identifier wrapping the active row (e.g., "v1"). */
  encKeyId: string | null;
  /** Last successful login telemetry. */
  lastLoginAt: string | null;
  lastLoginStatus: "success" | "failure" | null;
  /** Sanitised error (audit-grade — no credential fragments). */
  lastLoginError: string | null;
}

export interface DecryptedCredentials {
  username: string;
  password: string;
  encKeyId: string;
  credentialId: string;
}

export interface AuditEntry {
  id: string;
  eventKind:
    | "provisioned"
    | "rotated"
    | "invalidated"
    | "auth_success"
    | "auth_failure"
    | "decryption_error";
  createdAt: string;
  actorUserId: string | null;
  error: string | null;
  /** Pre-redacted detail — safe to render in operator UI. */
  detail: Record<string, unknown>;
}

const EMPTY_STATUS: CredentialsStatusView = {
  configured: false,
  status: null,
  lastRotatedAt: null,
  rotationCount: 0,
  encKeyId: null,
  lastLoginAt: null,
  lastLoginStatus: null,
  lastLoginError: null,
};

// ── bytea serialisation helpers ─────────────────────────────────────────────
// Postgres bytea round-trips through PostgREST as the canonical
// `\x<hex>` string (default `bytea_output = hex`). Supabase-js does NOT
// auto-marshal Buffers — sending a Buffer in JSON would be serialised as
// {"type":"Buffer","data":[…]} which PostgREST rejects with a bytea-parse
// error. These helpers keep the encoding contract in one place.

function bufferToBytea(buf: Buffer): string {
  return `\\x${buf.toString("hex")}`;
}

function byteaToBuffer(value: unknown): Buffer {
  if (typeof value !== "string") {
    throw new Error("intelligence: expected bytea string from supabase");
  }
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  return Buffer.from(hex, "hex");
}

// ── Status (UI surface) ─────────────────────────────────────────────────────

/**
 * Returns the non-secret status view for an integration's credentials.
 * Safe to call from a Server Component — returns nothing sensitive.
 */
export async function getCredentialsStatus(
  sourceSlug: string,
): Promise<CredentialsStatusView> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("intelligence_source_credentials")
      .select(
        "status, last_rotated_at, rotation_count, enc_key_id, last_login_at, last_login_status, last_login_error",
      )
      .eq("source_slug", sourceSlug)
      .eq("status", "active")
      .maybeSingle();
    if (error) {
      // PostgREST returns an error when the table doesn't yet exist
      // (e.g., migration 0010 not applied). Don't fail the page — treat as
      // "not configured" so the operator UI gracefully renders the empty state.
      return EMPTY_STATUS;
    }
    if (!data) return EMPTY_STATUS;
    const row = data as {
      status: "active" | "rotated" | "invalidated";
      last_rotated_at: string;
      rotation_count: number;
      enc_key_id: string;
      last_login_at: string | null;
      last_login_status: "success" | "failure" | null;
      last_login_error: string | null;
    };
    return {
      configured: true,
      status: row.status,
      lastRotatedAt: row.last_rotated_at,
      rotationCount: row.rotation_count,
      encKeyId: row.enc_key_id,
      lastLoginAt: row.last_login_at,
      lastLoginStatus: row.last_login_status,
      lastLoginError: row.last_login_error,
    };
  } catch {
    return EMPTY_STATUS;
  }
}

/**
 * Recent audit entries for an integration. Returns at most `limit` rows,
 * pre-sanitised — no plaintext, no ciphertext, no IVs. Caller is free
 * to render directly.
 */
export async function getCredentialsAudit(
  sourceSlug: string,
  limit = 10,
): Promise<AuditEntry[]> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("intelligence_credentials_audit")
      .select("id, event_kind, created_at, actor_user_id, error, detail")
      .eq("source_slug", sourceSlug)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Array<{
      id: string;
      event_kind: AuditEntry["eventKind"];
      created_at: string;
      actor_user_id: string | null;
      error: string | null;
      detail: Record<string, unknown>;
    }>).map((r) => ({
      id: r.id,
      eventKind: r.event_kind,
      createdAt: r.created_at,
      actorUserId: r.actor_user_id,
      error: r.error,
      detail: r.detail ?? {},
    }));
  } catch {
    return [];
  }
}

// ── Mutations ───────────────────────────────────────────────────────────────

interface ProvisionInput {
  sourceSlug: string;
  username: string;
  password: string;
  actorUserId: string | null;
}

interface ProvisionResult {
  ok: true;
  credentialId: string;
  rotationCount: number;
}

/**
 * Provision a new credential row (or rotate an existing one).
 *
 * Behaviour
 *   - If an `active` row already exists for the slug, mark it `rotated`
 *     and insert a new `active` row (so the partial unique index holds).
 *   - Bump rotation_count of the new row to (previous rotation_count + 1).
 *   - Insert a `provisioned` OR `rotated` audit entry.
 *   - Plaintext NEVER persisted; only AES-256-GCM ciphertext + IVs + auth tags.
 *   - Server action layer enforces auth + Zod validation before calling.
 */
export async function provisionOrRotate(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  assertCryptoConfigured();
  const sb = getSupabaseAdmin();

  // Resolve the source row to attach the FK.
  const { data: sourceRow, error: sourceErr } = await sb
    .from("sources")
    .select("id")
    .eq("slug", input.sourceSlug)
    .maybeSingle();
  if (sourceErr || !sourceRow) {
    throw new Error(`source ${input.sourceSlug} not registered`);
  }
  const sourceId = (sourceRow as { id: string }).id;

  // Find an existing active row to determine event kind + carry forward
  // the rotation counter.
  const { data: existingRow } = await sb
    .from("intelligence_source_credentials")
    .select("id, rotation_count")
    .eq("source_slug", input.sourceSlug)
    .eq("status", "active")
    .maybeSingle();
  const existing = existingRow as
    | { id: string; rotation_count: number }
    | null
    | undefined;
  const isRotation = Boolean(existing);
  const nextRotationCount = (existing?.rotation_count ?? 0) + 1;

  // Encrypt independently — separate IV + auth tag for each field.
  const u = encryptSecret(input.username);
  const p = encryptSecret(input.password);

  // Two-step write: mark previous active row as 'rotated', then INSERT
  // the new active row. The unique constraint where status='active'
  // prevents two active rows ever coexisting.
  if (existing) {
    const { error } = await sb
      .from("intelligence_source_credentials")
      .update({ status: "rotated" })
      .eq("id", existing.id);
    if (error) throw new Error(`failed to mark previous credential rotated: ${error.message}`);
  }

  const { data: inserted, error: insertErr } = await sb
    .from("intelligence_source_credentials")
    .insert({
      source_id: sourceId,
      source_slug: input.sourceSlug,
      username_encrypted: bufferToBytea(u.ciphertext),
      username_iv: bufferToBytea(u.iv),
      username_auth_tag: bufferToBytea(u.authTag),
      password_encrypted: bufferToBytea(p.ciphertext),
      password_iv: bufferToBytea(p.iv),
      password_auth_tag: bufferToBytea(p.authTag),
      enc_key_id: u.encKeyId,
      status: "active",
      last_rotated_at: new Date().toISOString(),
      last_rotated_by: input.actorUserId,
      rotation_count: nextRotationCount,
    })
    .select("id")
    .single();
  if (insertErr || !inserted) {
    throw new Error(`failed to insert credentials: ${insertErr?.message ?? "unknown"}`);
  }
  const credentialId = (inserted as { id: string }).id;

  await writeAudit({
    sourceSlug: input.sourceSlug,
    sourceId,
    credentialId,
    eventKind: isRotation ? "rotated" : "provisioned",
    actorUserId: input.actorUserId,
    detail: { enc_key_id: u.encKeyId, rotation_count: nextRotationCount },
  });

  return { ok: true, credentialId, rotationCount: nextRotationCount };
}

interface InvalidateInput {
  sourceSlug: string;
  actorUserId: string | null;
}

/** Mark the active credential row as invalidated. No-op when none exists. */
export async function invalidate(input: InvalidateInput): Promise<{ ok: true }> {
  const sb = getSupabaseAdmin();
  const { data: existingRow } = await sb
    .from("intelligence_source_credentials")
    .select("id, source_id")
    .eq("source_slug", input.sourceSlug)
    .eq("status", "active")
    .maybeSingle();
  const existing = existingRow as { id: string; source_id: string } | null | undefined;
  if (!existing) return { ok: true };
  const { error } = await sb
    .from("intelligence_source_credentials")
    .update({ status: "invalidated" })
    .eq("id", existing.id);
  if (error) throw new Error(`failed to invalidate: ${error.message}`);
  await writeAudit({
    sourceSlug: input.sourceSlug,
    sourceId: existing.source_id,
    credentialId: existing.id,
    eventKind: "invalidated",
    actorUserId: input.actorUserId,
    detail: {},
  });
  return { ok: true };
}

// ── Decrypted read (refresh script only) ────────────────────────────────────

/**
 * Decrypt and return the active credentials for a source. Used by the
 * refresh-script context only. Never call from a Server Component that
 * renders UI — the return value is plaintext.
 */
export async function getDecryptedCredentials(
  sourceSlug: string,
): Promise<DecryptedCredentials | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("intelligence_source_credentials")
    .select(
      "id, username_encrypted, username_iv, username_auth_tag, password_encrypted, password_iv, password_auth_tag, enc_key_id",
    )
    .eq("source_slug", sourceSlug)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  const row = data as {
    id: string;
    username_encrypted: string;
    username_iv: string;
    username_auth_tag: string;
    password_encrypted: string;
    password_iv: string;
    password_auth_tag: string;
    enc_key_id: string;
  };
  try {
    const username = decryptSecret({
      ciphertext: byteaToBuffer(row.username_encrypted),
      iv: byteaToBuffer(row.username_iv),
      authTag: byteaToBuffer(row.username_auth_tag),
      encKeyId: row.enc_key_id,
    });
    const password = decryptSecret({
      ciphertext: byteaToBuffer(row.password_encrypted),
      iv: byteaToBuffer(row.password_iv),
      authTag: byteaToBuffer(row.password_auth_tag),
      encKeyId: row.enc_key_id,
    });
    return { username, password, encKeyId: row.enc_key_id, credentialId: row.id };
  } catch (err) {
    await writeAudit({
      sourceSlug,
      sourceId: null,
      credentialId: row.id,
      eventKind: "decryption_error",
      actorUserId: null,
      detail: {},
      error: redactError(err),
    });
    throw new Error("intelligence: credential decryption failed");
  }
}

// ── Audit writer ────────────────────────────────────────────────────────────

interface AuditWriteInput {
  sourceSlug: string;
  sourceId: string | null;
  credentialId: string | null;
  eventKind: AuditEntry["eventKind"];
  actorUserId: string | null;
  detail?: Record<string, unknown>;
  error?: string;
}

async function writeAudit(input: AuditWriteInput): Promise<void> {
  const sb = getSupabaseAdmin();
  // redact() returns a structurally-equivalent JSON value; the cast is
  // safe because the Database column type is `Json` (any JSON-encodable).
  const safeDetail = redact(input.detail ?? {}) as Record<string, unknown> as never;
  await sb.from("intelligence_credentials_audit").insert({
    source_slug: input.sourceSlug,
    source_id: input.sourceId,
    credential_id: input.credentialId,
    event_kind: input.eventKind,
    actor_user_id: input.actorUserId,
    detail: safeDetail,
    error: input.error ?? null,
  });
}
