"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  invalidate,
  provisionOrRotate,
} from "@/lib/intelligence/credentials-store";
import { redactError } from "@/lib/security/redact";
import { requireOperator } from "@/lib/security/operator-guard";

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

async function assertAdminContext(): Promise<{ userId: string | null; email: string | null }> {
  // Central, fail-closed operator guard. See lib/security/operator-guard.ts.
  const ctx = await requireOperator();
  return { userId: ctx.userId, email: ctx.email };
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
