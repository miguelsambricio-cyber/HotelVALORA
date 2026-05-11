import type { Metadata } from "next";
import { Check, X } from "lucide-react";
import {
  getSupabaseUser,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from "@/lib/supabase/auth-helpers";

export const metadata: Metadata = {
  title: "Supabase · Dev",
  description: "Connection + env probe for the Supabase integration.",
};

// Always run on the server (no caching, every refresh re-probes).
export const dynamic = "force-dynamic";

/**
 * /dev/supabase-test — engineering probe surface.
 *
 * Reports four things:
 *   1. Are the three env vars set? (URL · anon · service-role)
 *   2. Can the server client construct? (probe call)
 *   3. Is there a current session? (anonymous expected until login wires)
 *   4. Where to paste credentials when missing
 *
 * Renders gracefully when nothing is configured — no thrown error.
 */
export default async function SupabaseTestPage() {
  const configured = isSupabaseConfigured();
  const adminConfigured = isSupabaseAdminConfigured();
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  let user: Awaited<ReturnType<typeof getSupabaseUser>> = null;
  let probeError: string | null = null;

  if (configured) {
    try {
      user = await getSupabaseUser();
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="space-y-1.5">
        <span className="inline-flex w-fit items-center gap-1.5 rounded bg-forest-900 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-widest text-lime-300">
          Dev · Probe
        </span>
        <h1 className="font-headline text-3xl font-extrabold uppercase tracking-tighter text-forest-900">
          Supabase Connection
        </h1>
        <p className="text-[13px] text-slate-500">
          Runtime probe — confirms env vars, server-client construction and the
          current auth session. No data is mutated.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
        <h2 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Environment
        </h2>
        <ul className="divide-y divide-slate-100 text-[13px]">
          <ProbeRow
            label="NEXT_PUBLIC_SUPABASE_URL"
            ok={hasUrl}
            valueWhenOk={mask(process.env.NEXT_PUBLIC_SUPABASE_URL, 28)}
            valueWhenMissing="Not set"
          />
          <ProbeRow
            label="NEXT_PUBLIC_SUPABASE_ANON_KEY"
            ok={hasAnon}
            valueWhenOk={mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 12)}
            valueWhenMissing="Not set"
          />
          <ProbeRow
            label="SUPABASE_SERVICE_ROLE_KEY"
            ok={hasServiceRole}
            valueWhenOk={mask(process.env.SUPABASE_SERVICE_ROLE_KEY, 12)}
            valueWhenMissing="Not set (admin operations disabled)"
          />
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
        <h2 className="mb-3 font-headline text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Runtime
        </h2>
        <ul className="divide-y divide-slate-100 text-[13px]">
          <ProbeRow
            label="Server client constructable"
            ok={configured && !probeError}
            valueWhenOk="OK"
            valueWhenMissing={
              probeError ?? "Skipped — Supabase URL or anon key missing"
            }
          />
          <ProbeRow
            label="Admin client configured"
            ok={adminConfigured}
            valueWhenOk="OK"
            valueWhenMissing="Service-role key missing"
          />
          <ProbeRow
            label="Current Supabase session"
            ok={Boolean(user)}
            valueWhenOk={user?.email ?? user?.id ?? "Authenticated"}
            valueWhenMissing="Anonymous (expected until OAuth wires)"
          />
        </ul>
      </section>

      {!configured && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <h2 className="mb-2 font-headline text-[10px] font-bold uppercase tracking-widest text-amber-800">
            Credentials needed — where to find them
          </h2>
          <ol className="ml-4 list-decimal space-y-2 text-[13px] text-slate-700">
            <li>
              Open the Supabase dashboard for the project at{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[12px]">
                https://supabase.com/dashboard
              </code>
              . If you don&apos;t have a project yet, create one (Region:
              EU-West Ireland recommended for hotelvalora.com).
            </li>
            <li>
              Inside the project, navigate to{" "}
              <strong>Settings → API</strong>. Copy three values:
              <ul className="ml-4 mt-1 list-disc space-y-1 text-slate-600">
                <li>
                  <strong>Project URL</strong> →{" "}
                  <code className="font-mono text-[12px]">
                    NEXT_PUBLIC_SUPABASE_URL
                  </code>
                </li>
                <li>
                  <strong>Project API keys → anon (public)</strong> →{" "}
                  <code className="font-mono text-[12px]">
                    NEXT_PUBLIC_SUPABASE_ANON_KEY
                  </code>
                </li>
                <li>
                  <strong>Project API keys → service_role (secret)</strong> →{" "}
                  <code className="font-mono text-[12px]">
                    SUPABASE_SERVICE_ROLE_KEY
                  </code>{" "}
                  · NEVER expose to the browser
                </li>
              </ul>
            </li>
            <li>
              Paste them into{" "}
              <code className="rounded bg-white px-1 py-0.5 font-mono text-[12px]">
                apps/web/.env.local
              </code>{" "}
              (already in .gitignore) for local dev, and into Vercel for
              production:
              <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                {`vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production`}
              </pre>
            </li>
            <li>
              Restart the dev server (
              <code className="font-mono text-[12px]">pnpm dev</code>) so the
              new env vars are picked up. Refresh this page — every row above
              should turn green.
            </li>
          </ol>
        </section>
      )}
    </div>
  );
}

// ── Atoms ──────────────────────────────────────────────────────────────────

function ProbeRow({
  label,
  ok,
  valueWhenOk,
  valueWhenMissing,
}: {
  label: string;
  ok: boolean;
  valueWhenOk: string;
  valueWhenMissing: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <span className="flex items-center gap-2.5">
        {ok ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
            <Check size={12} aria-hidden className="text-emerald-700" />
          </span>
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100">
            <X size={12} aria-hidden className="text-slate-500" />
          </span>
        )}
        <span className="font-mono text-[12px] text-slate-700">{label}</span>
      </span>
      <span
        className={`truncate font-mono text-[11px] ${ok ? "text-forest-700" : "text-slate-400"}`}
      >
        {ok ? valueWhenOk : valueWhenMissing}
      </span>
    </li>
  );
}

function mask(v: string | undefined, head = 8): string {
  if (!v) return "—";
  if (v.length <= head + 4) return v;
  return `${v.slice(0, head)}…${v.slice(-4)}`;
}
