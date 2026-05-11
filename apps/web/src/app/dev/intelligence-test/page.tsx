import type { Metadata } from "next";
import { Check, X, AlertCircle } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseAdminConfigured } from "@/lib/supabase/auth-helpers";

export const metadata: Metadata = {
  title: "Intelligence · Dev",
  description: "Hospitality Intelligence Engine probe — sources, recent runs, corpus size.",
};

export const dynamic = "force-dynamic";

/**
 * /dev/intelligence-test — engineering probe for the Hospitality
 * Intelligence Engine. Reports:
 *
 *   1. Are admin env vars set? (CRON_SECRET + admin client)
 *   2. Sources catalogued + enabled per kind (rss / scrape / api / manual)
 *   3. Last 10 news_ingestion_runs across all sources
 *   4. Corpus headline counts by category (last 30d)
 */
export default async function IntelligenceTestPage() {
  const adminOk = isSupabaseAdminConfigured();
  const hasCronSecret = Boolean(process.env.CRON_SECRET);
  const hasInternalRecipients = Boolean(process.env.INTERNAL_ALERT_RECIPIENTS);

  let sourcesByKind: Record<string, { enabled: number; total: number }> = {};
  let recentRuns: Array<{
    slug: string;
    status: string;
    started: string;
    seen: number;
    ins: number;
    upd: number;
    err: string | null;
  }> = [];
  let corpusByCategory: Array<{ category: string; n: number }> = [];
  let probeError: string | null = null;

  if (adminOk) {
    try {
      const admin = getSupabaseAdmin();
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const [{ data: sources }, { data: runs }, { data: corpusRows }] = await Promise.all([
        admin.from("sources").select("ingestion_kind, enabled"),
        admin
          .from("news_ingestion_runs")
          .select(
            "status, run_started_at, items_seen, items_inserted, items_updated, error_message, source_id, sources(slug)",
          )
          .order("run_started_at", { ascending: false })
          .limit(10),
        admin.from("market_news").select("category").gte("first_seen_at", since),
      ]);

      (sources ?? []).forEach((s) => {
        const k = String(s.ingestion_kind);
        sourcesByKind[k] = sourcesByKind[k] ?? { enabled: 0, total: 0 };
        sourcesByKind[k].total += 1;
        if (s.enabled) sourcesByKind[k].enabled += 1;
      });

      recentRuns = (runs ?? []).map((r) => ({
        slug: ((r as unknown as { sources: { slug: string } | null }).sources?.slug) ?? "—",
        status: String(r.status),
        started: String(r.run_started_at),
        seen: r.items_seen ?? 0,
        ins: r.items_inserted ?? 0,
        upd: r.items_updated ?? 0,
        err: r.error_message ?? null,
      }));

      const tally: Record<string, number> = {};
      (corpusRows ?? []).forEach((r) => {
        const c = String(r.category);
        tally[c] = (tally[c] ?? 0) + 1;
      });
      corpusByCategory = Object.entries(tally)
        .map(([category, n]) => ({ category, n }))
        .sort((a, b) => b.n - a.n);
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err);
    }
  }

  const total30d = corpusByCategory.reduce((a, r) => a + r.n, 0);
  const totalRunsToday = recentRuns.filter((r) => {
    const today = new Date().toISOString().slice(0, 10);
    return r.started.startsWith(today);
  }).length;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="space-y-1.5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded bg-forest-900 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-widest text-lime-300">
          Dev · Probe
        </span>
        <h1 className="font-headline text-3xl font-extrabold uppercase tracking-tighter text-forest-900">
          Hospitality Intelligence
        </h1>
        <p className="text-[13px] text-slate-500">
          Runtime probe — env config · sources catalogued · last 10 ingestion
          runs · corpus by category (30d). No data is mutated.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
        <h2 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Environment
        </h2>
        <ul className="divide-y divide-slate-100 text-[13px]">
          <ProbeRow label="SUPABASE_SERVICE_ROLE_KEY" ok={adminOk} valueWhenOk="OK" valueWhenMissing="Not set" />
          <ProbeRow label="CRON_SECRET" ok={hasCronSecret} valueWhenOk="OK" valueWhenMissing="Not set — cron route unprotected on non-prod" />
          <ProbeRow label="INTERNAL_ALERT_RECIPIENTS" ok={hasInternalRecipients} valueWhenOk="OK" valueWhenMissing="Falls back to miguel.sambricio@metcub.com" />
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
        <h2 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Sources
        </h2>
        {Object.keys(sourcesByKind).length === 0 ? (
          <p className="text-[12px] text-slate-400">No sources catalogued.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
            {(["rss", "scrape", "api", "manual"] as const).map((kind) => {
              const v = sourcesByKind[kind] ?? { enabled: 0, total: 0 };
              return (
                <li key={kind} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {kind}
                  </div>
                  <div className="mt-0.5 font-mono text-[13px] text-slate-700">
                    {v.enabled}/{v.total}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
        <h2 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Recent ingestion runs · last 10 · {totalRunsToday} today
        </h2>
        {recentRuns.length === 0 ? (
          <p className="text-[12px] text-slate-400">
            No runs yet. The daily cron fires at 07:48 UTC (≈ 08:48 Madrid). Trigger manually via
            <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
              curl -H &quot;authorization: Bearer $CRON_SECRET&quot; https://hotelvalora.com/api/cron/hospitality-intel
            </code>
          </p>
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-left text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="py-1.5">Source</th>
                <th>Status</th>
                <th className="text-right">Seen</th>
                <th className="text-right">Ins</th>
                <th className="text-right">Upd</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentRuns.map((r, i) => (
                <tr key={i} className="font-mono">
                  <td className="py-1.5">{r.slug}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-right">{r.seen}</td>
                  <td className="text-right">{r.ins}</td>
                  <td className="text-right">{r.upd}</td>
                  <td className="text-[11px] text-slate-500">{r.started.slice(0, 16).replace("T", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
        <h2 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Corpus by category · last 30 days · {total30d} rows
        </h2>
        {corpusByCategory.length === 0 ? (
          <p className="text-[12px] text-slate-400">Empty — no news rows yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-1.5 text-[12px] sm:grid-cols-3">
            {corpusByCategory.map((r) => (
              <li key={r.category} className="flex justify-between rounded bg-slate-50 px-2 py-1 font-mono">
                <span className="text-slate-600">{r.category}</span>
                <span className="font-bold text-forest-900">{r.n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

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

function ProbeRow({ label, ok, valueWhenOk, valueWhenMissing }: { label: string; ok: boolean; valueWhenOk: string; valueWhenMissing: string }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2.5">
        {ok ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100"><Check size={12} aria-hidden className="text-emerald-700" /></span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100"><X size={12} aria-hidden className="text-slate-500" /></span>
        )}
        <span className="font-mono text-[12px] text-slate-700">{label}</span>
      </span>
      <span className={`truncate font-mono text-[11px] ${ok ? "text-forest-700" : "text-slate-400"}`}>{ok ? valueWhenOk : valueWhenMissing}</span>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tint =
    status === "success" ? "bg-emerald-100 text-emerald-700"
    : status === "running" ? "bg-sky-100 text-sky-700"
    : status === "partial" ? "bg-amber-100 text-amber-700"
    : status === "failed" ? "bg-rose-100 text-rose-700"
    : "bg-slate-100 text-slate-500";
  return <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tint}`}>{status}</span>;
}
