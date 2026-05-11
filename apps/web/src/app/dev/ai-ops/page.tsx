import type { Metadata } from "next";
import { AlertCircle, Check, X } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/auth-helpers";

export const metadata: Metadata = {
  title: "AI Operations · Dev",
  description: "AI Operations Layer probe — runs, events, cost caps, pending approvals.",
};

export const dynamic = "force-dynamic";

/**
 * /dev/ai-ops — engineering probe for the AI Operations Layer.
 *
 *   1. Agent registry (status, enabled, daily cap, today's spend)
 *   2. Last 15 agent runs (status, duration, cost, steps count)
 *   3. Last 15 events (kind, source, age)
 *   4. Pending human_review queue (count + age)
 *   5. Recent escalations (last 24h)
 *
 * Read-only. Service-role queries. No mutation surface.
 */
export default async function AiOpsDevPage() {
  const adminOk = isSupabaseAdminConfigured();
  let probeError: string | null = null;

  const data: {
    agents: Array<{ id: string; status: string; enabled: boolean; cap: number; today: number; pct: number }>;
    runs: Array<{ id: string; agent: string; status: string; started: string; duration_ms: number; cost: number; steps: number }>;
    events: Array<{ id: string; kind: string; source: string; occurred: string }>;
    approvals: Array<{ id: string; agent: string; reason: string | null; age_hours: number; status: string }>;
    escalations: Array<{ content: string; agent: string; created: string; meta: Record<string, unknown> | null }>;
  } = { agents: [], runs: [], events: [], approvals: [], escalations: [] };

  if (adminOk) {
    try {
      const admin = getSupabaseAdmin();
      const dayStart = new Date();
      dayStart.setUTCHours(0, 0, 0, 0);
      const since24h = new Date(Date.now() - 86400_000).toISOString();

      const [
        { data: agents },
        { data: todayRuns },
        { data: runs },
        { data: events },
        { data: approvals },
        { data: escalationMems },
      ] = await Promise.all([
        admin.from("ai_agents").select("id, status, enabled, config").order("id"),
        admin.from("ai_agent_runs").select("agent_id, cost_usd").gte("run_started_at", dayStart.toISOString()),
        admin
          .from("ai_agent_runs")
          .select("id, agent_id, status, run_started_at, run_completed_at, cost_usd, steps")
          .order("run_started_at", { ascending: false })
          .limit(15),
        admin
          .from("ai_events")
          .select("id, kind, source, occurred_at")
          .order("occurred_at", { ascending: false })
          .limit(15),
        admin
          .from("ai_human_review")
          .select("id, agent_id, reason, status, created_at")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20),
        admin
          .from("ai_memory")
          .select("agent_id, content, created_at, meta")
          .ilike("content", "escalation:%")
          .gte("created_at", since24h)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      const spendByAgent: Record<string, number> = {};
      (todayRuns ?? []).forEach((r) => {
        const a = String(r.agent_id);
        spendByAgent[a] = (spendByAgent[a] ?? 0) + Number(r.cost_usd ?? 0);
      });

      data.agents = (agents ?? []).map((a) => {
        const cap =
          ((a.config as Record<string, unknown> | null)?.daily_cost_usd_cap as number | undefined) ?? 0;
        const today = spendByAgent[String(a.id)] ?? 0;
        return {
          id: String(a.id),
          status: String(a.status),
          enabled: Boolean(a.enabled),
          cap,
          today,
          pct: cap > 0 ? today / cap : 0,
        };
      });

      data.runs = (runs ?? []).map((r) => {
        const start = new Date(r.run_started_at).getTime();
        const end = r.run_completed_at ? new Date(r.run_completed_at).getTime() : Date.now();
        return {
          id: String(r.id),
          agent: String(r.agent_id),
          status: String(r.status),
          started: r.run_started_at as string,
          duration_ms: end - start,
          cost: Number(r.cost_usd ?? 0),
          steps: Array.isArray(r.steps) ? r.steps.length : 0,
        };
      });

      data.events = (events ?? []).map((e) => ({
        id: String(e.id),
        kind: String(e.kind),
        source: String(e.source),
        occurred: e.occurred_at as string,
      }));

      data.approvals = (approvals ?? []).map((p) => ({
        id: String(p.id),
        agent: String(p.agent_id),
        reason: p.reason ?? null,
        status: String(p.status),
        age_hours: (Date.now() - new Date(p.created_at).getTime()) / 3600_000,
      }));

      data.escalations = (escalationMems ?? []).map((m) => ({
        content: String(m.content).replace(/^escalation:/, ""),
        agent: String(m.agent_id),
        created: m.created_at as string,
        meta: (m.meta as Record<string, unknown> | null) ?? null,
      }));
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-10">
      <header className="space-y-1.5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded bg-forest-900 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-widest text-lime-300">
          Dev · Probe
        </span>
        <h1 className="font-headline text-3xl font-extrabold uppercase tracking-tighter text-forest-900">
          AI Operations Layer
        </h1>
        <p className="text-[13px] text-slate-500">
          Runtime probe — agent registry · today&apos;s cost · last 15 runs · last 15 events · pending approvals · escalations (24h).
        </p>
      </header>

      <Section title="Agent registry">
        {data.agents.length === 0 ? (
          <Empty hint="No agents in the registry yet." />
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="py-1.5">Agent</th>
                <th>Status</th>
                <th>Enabled</th>
                <th className="text-right">Today $</th>
                <th className="text-right">Cap $</th>
                <th className="text-right">Pct</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.agents.map((a) => (
                <tr key={a.id} className="font-mono">
                  <td className="py-1.5">{a.id}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{a.enabled ? <Check size={12} className="text-emerald-700" /> : <X size={12} className="text-slate-400" />}</td>
                  <td className="text-right">{a.today.toFixed(4)}</td>
                  <td className="text-right">{a.cap.toFixed(4)}</td>
                  <td className={`text-right ${a.pct >= 1 ? "text-rose-700" : a.pct >= 0.8 ? "text-amber-700" : "text-slate-500"}`}>
                    {(a.pct * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Recent agent runs · last 15`}>
        {data.runs.length === 0 ? (
          <Empty hint="No agent runs yet. Trigger the daily cron or call /api/cron/* with the CRON_SECRET." />
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="py-1.5">Agent</th>
                <th>Status</th>
                <th className="text-right">Steps</th>
                <th className="text-right">Duration</th>
                <th className="text-right">Cost $</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.runs.map((r) => (
                <tr key={r.id} className="font-mono">
                  <td className="py-1.5">{r.agent}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-right">{r.steps}</td>
                  <td className="text-right">{(r.duration_ms / 1000).toFixed(2)}s</td>
                  <td className="text-right">{r.cost.toFixed(4)}</td>
                  <td className="text-[11px] text-slate-500">{r.started.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title={`Recent events · last 15`}>
        {data.events.length === 0 ? (
          <Empty hint="No events yet." />
        ) : (
          <ul className="divide-y divide-slate-100 font-mono text-[12px]">
            {data.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-1.5">
                <span className="flex items-center gap-2">
                  <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">{e.kind}</span>
                  <span className="text-slate-700">{e.source}</span>
                </span>
                <span className="text-[11px] text-slate-500">{e.occurred.slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Pending approvals · ${data.approvals.length}`}>
        {data.approvals.length === 0 ? (
          <Empty hint="No pending approvals — destructive tools are gated but none have been requested." />
        ) : (
          <ul className="divide-y divide-slate-100 font-mono text-[12px]">
            {data.approvals.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{a.agent}</span>
                  <span className={`text-[11px] ${a.age_hours >= 24 ? "text-rose-700" : "text-slate-500"}`}>{a.age_hours.toFixed(1)}h ago</span>
                </div>
                {a.reason && <p className="text-[11px] text-slate-600">{a.reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Recent escalations · last 24h · ${data.escalations.length}`}>
        {data.escalations.length === 0 ? (
          <Empty hint="No escalations in the last 24h. QA / Monitoring escalates via Resend with a 15-min cooldown." />
        ) : (
          <ul className="divide-y divide-slate-100 font-mono text-[12px]">
            {data.escalations.map((e, i) => (
              <li key={i} className="flex flex-col gap-1 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{e.agent} · {e.content}</span>
                  <span className="text-[11px] text-slate-500">{e.created.slice(0, 16).replace("T", " ")}</span>
                </div>
                {e.meta && (
                  <pre className="overflow-x-auto rounded bg-slate-50 px-2 py-1 text-[10px] text-slate-600">{JSON.stringify(e.meta, null, 2)}</pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {probeError && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <h2 className="mb-2 flex items-center gap-2 font-headline text-[10px] font-bold uppercase tracking-widest text-amber-800">
            <AlertCircle size={12} /> Probe error
          </h2>
          <pre className="overflow-x-auto rounded bg-white p-2 font-mono text-[11px] text-amber-900">{probeError}</pre>
        </section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
      <h2 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ hint }: { hint: string }) {
  return <p className="text-[12px] text-slate-400">{hint}</p>;
}

function StatusBadge({ status }: { status: string }) {
  const tint =
    status === "success" || status === "active" ? "bg-emerald-100 text-emerald-700"
    : status === "running" ? "bg-sky-100 text-sky-700"
    : status === "beta" ? "bg-lime-100 text-lime-800"
    : status === "partial" || status === "queued" ? "bg-amber-100 text-amber-700"
    : status === "awaiting_approval" ? "bg-violet-100 text-violet-700"
    : status === "failed" ? "bg-rose-100 text-rose-700"
    : status === "planned" ? "bg-slate-100 text-slate-500"
    : "bg-slate-100 text-slate-500";
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tint}`}>{status}</span>;
}
