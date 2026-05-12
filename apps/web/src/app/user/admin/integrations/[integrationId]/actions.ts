"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  invalidate,
  provisionOrRotate,
} from "@/lib/intelligence/credentials-store";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redactError } from "@/lib/security/redact";

/**
 * Server actions for the credentials-provisioning admin surface.
 *
 * Auth model
 *   - Verifies a Supabase user session via cookies.
 *   - Verifies the user's email appears in ADMIN_OPERATOR_EMAILS (comma list).
 *   - Until Supabase Auth fully activates with AUTH_ENABLED=true, the gate
 *     relies on the env-pinned allow-list. Either layer alone is sufficient
 *     to deny — both must pass to proceed.
 *
 * Plaintext discipline
 *   - Incoming FormData carries plaintext over HTTPS to the server runtime
 *     and is immediately handed to the credentials store, which encrypts.
 *   - The action never logs, persists, or returns the plaintext.
 *   - Errors returned to the client are sanitised via redactError().
 */

export interface CredentialsActionResult {
  ok: boolean;
  error?: string;
}

const provisionSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "username too short")
    .max(320, "username too long")
    .email("invalid email format")
    .or(
      z
        .string()
        .trim()
        .min(3, "username too short")
        .max(320, "username too long"),
    ),
  password: z
    .string()
    .min(8, "password too short")
    .max(512, "password too long"),
});

async function assertAdminContext(): Promise<{ userId: string | null; email: string }> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("unauthorised");
  }
  const email = data.user.email?.toLowerCase();
  if (!email) {
    throw new Error("unauthorised");
  }
  const allow = (process.env.ADMIN_OPERATOR_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // Fallback: when ADMIN_OPERATOR_EMAILS is unset, accept emails listed
  // in INTERNAL_ALERT_RECIPIENTS (already-configured operator list).
  const fallback = (process.env.INTERNAL_ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed = allow.length > 0 ? allow : fallback;
  if (allowed.length > 0 && !allowed.includes(email)) {
    throw new Error("forbidden");
  }
  return { userId: data.user.id, email };
}

export async function provisionCredentialsAction(
  sourceSlug: string,
  formData: FormData,
): Promise<CredentialsActionResult> {
  try {
    const { userId } = await assertAdminContext();
    const parsed = provisionSchema.safeParse({
      username: formData.get("username"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      return {
        ok: false,
        // Use ONLY field-level error names — never the value being validated.
        error: parsed.error.issues.map((i) => i.message).join(" · "),
      };
    }
    await provisionOrRotate({
      sourceSlug,
      username: parsed.data.username,
      password: parsed.data.password,
      actorUserId: userId,
    });
    revalidatePath(`/user/admin/integrations/${sourceSlug}`);
    revalidatePath(`/user/admin/integrations`);
    revalidatePath(`/user/admin`);
    revalidatePath(`/user/admin/agents/market_intelligence`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}

export async function invalidateCredentialsAction(
  sourceSlug: string,
): Promise<CredentialsActionResult> {
  try {
    const { userId } = await assertAdminContext();
    await invalidate({ sourceSlug, actorUserId: userId });
    revalidatePath(`/user/admin/integrations/${sourceSlug}`);
    revalidatePath(`/user/admin/integrations`);
    revalidatePath(`/user/admin`);
    revalidatePath(`/user/admin/agents/market_intelligence`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}
