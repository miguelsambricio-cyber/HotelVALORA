import "server-only";
import { getDefaultFromAddress, getResend } from "@/lib/email/client";
import type { RunContext } from "./types";
import { logStep } from "./audit";

/**
 * Escalation channel — Resend-backed internal alerts.
 *
 * Phase 2 directive: NO Slack / PagerDuty. Internal operator alerts go
 * through Resend to the closed list in INTERNAL_ALERT_RECIPIENTS (env,
 * comma-separated). Falls back to miguel.sambricio@metcub.com if unset.
 *
 * Cooldown: agent config `alert_cooldown_minutes` (default 15) gates
 * repeat sends for the same `dedup_key`. The cooldown is maintained in
 * ai_memory under scope=agent_global content="escalation:<dedup_key>".
 */

const FALLBACK_RECIPIENT = "miguel.sambricio@metcub.com";

export type Severity = "info" | "warning" | "critical";

export interface EscalationInput {
  severity: Severity;
  subject: string;
  summary: string;
  dedup_key?: string;
  meta?: Record<string, unknown>;
}

function parseRecipients(): string[] {
  const raw = process.env.INTERNAL_ALERT_RECIPIENTS ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /.+@.+\..+/.test(s));
  return list.length ? list : [FALLBACK_RECIPIENT];
}

async function withinCooldown(
  ctx: RunContext,
  dedupKey: string,
  cooldownMinutes: number,
): Promise<boolean> {
  if (cooldownMinutes <= 0) return false;
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - cooldownMinutes * 60_000).toISOString();
  const { data } = await admin
    .from("ai_memory")
    .select("id, created_at")
    .eq("agent_id", ctx.agent_id)
    .eq("scope", "agent_global")
    .eq("content", `escalation:${dedupKey}`)
    .gte("created_at", cutoff)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

async function recordEscalation(
  ctx: RunContext,
  dedupKey: string,
  meta: Record<string, unknown>,
): Promise<void> {
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const admin = getSupabaseAdmin();
  await admin.from("ai_memory").insert({
    agent_id: ctx.agent_id,
    scope: "agent_global",
    content: `escalation:${dedupKey}`,
    importance_score: 0.95,
    meta: meta as never,
  });
}

function renderHtml(severity: Severity, subject: string, summary: string): string {
  const tint =
    severity === "critical" ? "#b91c1c" : severity === "warning" ? "#b45309" : "#0369a1";
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <div style="border-left:4px solid ${tint};padding:8px 14px;margin-bottom:14px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.12em;color:${tint};text-transform:uppercase">HOTELVALORA · ${severity.toUpperCase()}</div>
    <h2 style="margin:6px 0 0;font-size:18px;line-height:1.25">${escapeHtml(subject)}</h2>
  </div>
  <pre style="white-space:pre-wrap;font:13px/1.55 ui-monospace,Menlo,Consolas,monospace;background:#f8fafc;padding:14px;border-radius:8px;border:1px solid #e2e8f0">${escapeHtml(summary)}</pre>
  <p style="margin-top:16px;font-size:11px;color:#64748b">Sent by the AI Operations Layer · Resend channel · automated, no per-send approval.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Send an internal escalation. Logs the step on the run, applies the
 * cooldown, and returns the Resend message id. NEVER throws — failure
 * to escalate must not break the agent run.
 */
export async function escalate(
  ctx: RunContext,
  input: EscalationInput,
): Promise<{ sent: boolean; resend_id?: string; reason?: string }> {
  const dedup = input.dedup_key ?? `${input.severity}:${input.subject}`;
  const cooldown = ctx.config.alert_cooldown_minutes ?? 15;
  try {
    if (await withinCooldown(ctx, dedup, cooldown)) {
      logStep(ctx, {
        step: "escalation",
        status: "skipped",
        reason: "cooldown_active",
        meta: { dedup_key: dedup, cooldown_minutes: cooldown },
      });
      return { sent: false, reason: "cooldown_active" };
    }

    const recipients = parseRecipients();
    let resendId: string | undefined;
    try {
      const resend = getResend();
      const { html } = { html: renderHtml(input.severity, input.subject, input.summary) };
      const res = await resend.emails.send({
        from: getDefaultFromAddress(),
        to: recipients,
        subject: `[${input.severity.toUpperCase()}] ${input.subject}`,
        html,
        text: `${input.subject}\n\n${input.summary}`,
        tags: [
          { name: "kind", value: "ai-ops-escalation" },
          { name: "agent", value: ctx.agent_id },
          { name: "severity", value: input.severity },
        ],
      });
      resendId = res.data?.id;
    } catch (err) {
      logStep(ctx, {
        step: "escalation",
        status: "failed",
        reason: err instanceof Error ? err.message : String(err),
        meta: { dedup_key: dedup, recipients },
      });
      return {
        sent: false,
        reason: err instanceof Error ? err.message : "resend_failed",
      };
    }

    await recordEscalation(ctx, dedup, {
      severity: input.severity,
      recipients,
      resend_id: resendId,
      sent_at: new Date().toISOString(),
      ...input.meta,
    });

    logStep(ctx, {
      step: "escalation",
      tool_id: "monitoring.escalate.email",
      status: "ok",
      meta: { severity: input.severity, recipients, resend_id: resendId },
    });

    return { sent: true, resend_id: resendId };
  } catch (err) {
    // Last-resort catch — escalation must not break the run.
    logStep(ctx, {
      step: "escalation",
      status: "failed",
      reason: err instanceof Error ? err.message : String(err),
    });
    return { sent: false, reason: "escalation_outer_failure" };
  }
}
