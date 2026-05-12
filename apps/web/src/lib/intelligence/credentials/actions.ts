"use server";
import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { activeKekId, encryptString } from "../crypto";
import { emitCredentialEvent } from "./audit";
import { getCredentialStatus } from "./store.server";
import type { CredentialActionResult } from "./types";
import { EMPTY_CREDENTIAL_DESCRIPTOR } from "./types";

/**
 * Server actions for the T1.5 credential layer.
 *
 * Every action:
 *   1. Validates input with Zod (rejects on any malformation)
 *   2. Verifies the operator token against INTELLIGENCE_REFRESH_TOKEN
 *      using a constant-time comparison
 *   3. Encrypts username + password with INTELLIGENCE_SESSION_ENC_KEY
 *   4. Writes via service-role Supabase client
 *   5. Emits an audit event (no credential surface)
 *   6. Returns a frontend-safe descriptor — NEVER echoes any input
 *
 * The plaintext form values exist in this module's heap for the duration
 * of the encrypt step only. After the call to encryptString returns, the
 * locals are explicitly reassigned to defend against heap-dump exfil.
 */

// ─── Input schemas ──────────────────────────────────────────────────────────

const ProvisionSchema = z.object({
  sourceSlug: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  operatorToken: z.string().min(8).max(256),
  username: z.string().min(1).max(320), // RFC 5321 max email length
  password: z.string().min(1).max(1024),
});

const InvalidateSchema = z.object({
  sourceSlug: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
  operatorToken: z.string().min(8).max(256),
  reason: z.string().min(1).max(200).optional(),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function verifyOperatorToken(supplied: string): boolean {
  const expected = process.env.INTELLIGENCE_REFRESH_TOKEN;
  if (!expected) return false;
  if (supplied.length !== expected.length) return false;
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ supplied.charCodeAt(i);
  }
  return mismatch === 0;
}

async function getSourceIdBySlug(slug: string): Promise<string | null> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("sources")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

function revalidateIntegration(slug: string): void {
  revalidatePath(`/user/admin/integrations/${slug}`);
  revalidatePath("/user/admin/integrations");
}

// ─── Provision / rotate (single action — upsert semantics) ──────────────────

/**
 * Provisions credentials for a source, or rotates them if a row already
 * exists. Idempotent on the result: the active row reflects the latest
 * submission, the rotation_count increments, the previous row is moved
 * to status='rotated' as a forensic trail.
 */
export async function provisionCredentialsAction(
  formData: FormData,
): Promise<CredentialActionResult> {
  // Stage 1 — parse / validate. Never log the parsed object as a whole.
  const parsed = ProvisionSchema.safeParse({
    sourceSlug: formData.get("sourceSlug"),
    operatorToken: formData.get("operatorToken"),
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const { sourceSlug, operatorToken } = parsed.data;
  let username: string | null = parsed.data.username;
  let password: string | null = parsed.data.password;

  // Stage 2 — auth gate.
  if (!verifyOperatorToken(operatorToken)) {
    username = null;
    password = null;
    await emitCredentialEvent(sourceSlug, "credential.auth_attempt_failed");
    return { ok: false, error: "unauthorized" };
  }

  // Stage 3 — resolve source id.
  const sourceId = await getSourceIdBySlug(sourceSlug);
  if (!sourceId) {
    username = null;
    password = null;
    return { ok: false, error: "validation" };
  }

  // Stage 4 — encrypt (separate envelopes, distinct IVs).
  let userEnvelope, passEnvelope;
  try {
    userEnvelope = encryptString(username);
    passEnvelope = encryptString(password);
  } catch {
    username = null;
    password = null;
    return { ok: false, error: "encryption" };
  } finally {
    // Defence-in-depth: drop plaintext references as early as possible.
    username = null;
    password = null;
  }

  // Stage 5 — check existing active row (so we increment rotation_count).
  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from("intelligence_source_credentials")
    .select("id, rotation_count")
    .eq("source_slug", sourceSlug)
    .eq("status", "active")
    .maybeSingle();

  let kindEmitted: "credential.provisioned" | "credential.rotated" = "credential.provisioned";
  let nextRotationCount = 1;

  if (existing) {
    nextRotationCount = existing.rotation_count + 1;
    kindEmitted = "credential.rotated";
    // Demote the existing active row to status='rotated' so the partial
    // unique index on (source_slug WHERE status='active') tolerates the
    // new insert.
    const { error: demoteErr } = await sb
      .from("intelligence_source_credentials")
      .update({ status: "rotated" })
      .eq("id", existing.id);
    if (demoteErr) return { ok: false, error: "storage" };
  }

  // Stage 6 — insert the new active row.
  const encKeyId = activeKekId();
  const { error: insertErr } = await sb
    .from("intelligence_source_credentials")
    .insert({
      source_id: sourceId,
      source_slug: sourceSlug,
      username_encrypted: userEnvelope.ciphertext,
      username_iv: userEnvelope.iv,
      username_auth_tag: userEnvelope.authTag,
      password_encrypted: passEnvelope.ciphertext,
      password_iv: passEnvelope.iv,
      password_auth_tag: passEnvelope.authTag,
      enc_key_id: encKeyId,
      status: "active",
      rotation_count: nextRotationCount,
      last_rotated_at: new Date().toISOString(),
    } as never);

  if (insertErr) return { ok: false, error: "storage" };

  // Stage 7 — audit + revalidate + return safe descriptor.
  await emitCredentialEvent(sourceSlug, kindEmitted, {
    rotationCountAfter: nextRotationCount,
    encKeyId,
  });
  revalidateIntegration(sourceSlug);
  const descriptor = await getCredentialStatus(sourceSlug);
  return { ok: true, descriptor };
}

// ─── Invalidate ─────────────────────────────────────────────────────────────

export async function invalidateCredentialsAction(
  formData: FormData,
): Promise<CredentialActionResult> {
  const parsed = InvalidateSchema.safeParse({
    sourceSlug: formData.get("sourceSlug"),
    operatorToken: formData.get("operatorToken"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const { sourceSlug, operatorToken, reason } = parsed.data;

  if (!verifyOperatorToken(operatorToken)) {
    await emitCredentialEvent(sourceSlug, "credential.auth_attempt_failed");
    return { ok: false, error: "unauthorized" };
  }

  const sb = getSupabaseAdmin();
  const { data: existing } = await sb
    .from("intelligence_source_credentials")
    .select("id, rotation_count")
    .eq("source_slug", sourceSlug)
    .eq("status", "active")
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "not_provisioned" };
  }

  const { error } = await sb
    .from("intelligence_source_credentials")
    .update({
      status: "invalidated",
      invalidated_at: new Date().toISOString(),
      invalidated_reason: reason ?? "operator_action",
    })
    .eq("id", existing.id);

  if (error) return { ok: false, error: "storage" };

  await emitCredentialEvent(sourceSlug, "credential.invalidated", {
    rotationCountAfter: existing.rotation_count,
    reason: reason ?? "operator_action",
  });
  revalidateIntegration(sourceSlug);
  return { ok: true, descriptor: EMPTY_CREDENTIAL_DESCRIPTOR };
}
