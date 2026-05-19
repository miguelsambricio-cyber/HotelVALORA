import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
import { runDryRun, type DryRunFixture, type DryRunReport } from "@/lib/enrichment/providers/booking-rapidapi/dry-run";
import type { RapidApiHotelData } from "@/lib/enrichment/providers/booking-rapidapi/types";

import ritzFixture from "@/lib/enrichment/providers/booking-rapidapi/fixtures/madrid-ritz-by-belmond.json";
import nhFixture from "@/lib/enrichment/providers/booking-rapidapi/fixtures/madrid-nh-collection-eurobuilding.json";
import ibisFixture from "@/lib/enrichment/providers/booking-rapidapi/fixtures/madrid-ibis-centro-las-ventas.json";

export const metadata: Metadata = {
  title: "Hotel Enrichment · Dry-Run Probe · HotelVALORA",
  description:
    "Probe page for the Booking RapidAPI dry-run pipeline · validates the M1 architecture against 3 Madrid fixtures · zero HTTP calls.",
};

/**
 * /dev/hotel-enrichment
 *
 * Developer probe page · runs the Booking RapidAPI dry-run pipeline
 * against the 3 committed Madrid fixtures (Ritz · NH Eurobuilding ·
 * Ibis Centro) and renders institutional-grade canonical mapping
 * output. Zero HTTP calls · zero DB writes · zero live API access.
 *
 * Purpose:
 *   · Visible validation that M1 architecture decisions hold in code
 *     (brand registry · municipio fold · segment derivation ·
 *     amenity normalization · confidence calibration).
 *   · Coverage-tier scoring per hotel (TIER-0 / 1 / 2) makes the
 *     Booking-only ceiling vs the 80% institutional goal visible.
 *   · Reusable later as the curator review surface (Phase C of the
 *     bootstrap plan needs a per-row inspection UI).
 *
 * Boundary: lives under /dev/* alongside the other dev probes
 * (intelligence-test · ai-ops · supabase-test). Not part of the
 * report system · not part of the underwriting baseline · not part
 * of the synchronization layer.
 */
export default function HotelEnrichmentProbePage() {
  const fixtures: DryRunFixture[] = [
    { label: "ritz-by-belmond-madrid", e2: ritzFixture as unknown as RapidApiHotelData },
    { label: "nh-collection-eurobuilding", e2: nhFixture as unknown as RapidApiHotelData },
    { label: "ibis-centro-las-ventas", e2: ibisFixture as unknown as RapidApiHotelData },
  ];

  const output = runDryRun({ fixtures });

  const tier2Pct = (count: number) => Math.round((count / 19) * 1000) / 10;
  const avgPopulated = output.aggregate.averagePopulatedFields;

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f7]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 lg:px-10">
        <header className="mb-8">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Hotel Intelligence · Dev Probe
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-forest-900">
            Booking RapidAPI · Dry-Run Pipeline
          </h1>
          <p className="mt-3 max-w-3xl font-mono text-[13px] leading-relaxed text-slate-700">
            Visible validation of the Madrid enrichment architecture (M1).
            The dry-run runs the full client → parse → map pipeline against{" "}
            <span className="font-bold text-slate-900">3 committed fixtures</span> ·
            zero HTTP calls · zero DB writes. Each card below surfaces the
            canonical mapping output plus a TIER-0 / 1 / 2 coverage score
            against the institutional 80% goal.
          </p>
          <p className="mt-3 max-w-3xl font-mono text-[9.5px] italic leading-relaxed text-slate-500">
            Dry-run mode · numbers reflect the Booking-only ceiling. The fallback
            chain (Google Places · website · Wikidata · Tripadvisor) is required
            to reach the institutional TIER-2 ≥ 84% goal.
          </p>
        </header>

        {/* Aggregate band */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Aggregate
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Stat label="Fixtures" value={output.aggregate.totalFixtures.toString()} />
            <Stat
              label="Critical Gaps"
              value={output.aggregate.fixturesWithCriticalGaps.toString()}
              tone={output.aggregate.fixturesWithCriticalGaps === 0 ? "ok" : "warn"}
            />
            <Stat label="Avg Populated Fields" value={avgPopulated.toString()} />
            <Stat
              label="Unmapped Amenity Strings"
              value={output.aggregate.totalUnmappedAmenities.toString()}
              tone={output.aggregate.totalUnmappedAmenities < 20 ? "ok" : "warn"}
            />
          </dl>
        </section>

        {/* Per-fixture cards */}
        <ul className="grid gap-5 lg:grid-cols-3">
          {output.reports.map((report) => (
            <li key={report.label}>
              <FixtureCard report={report} tier2Pct={tier2Pct(report.preCoverage.tier2Count)} />
            </li>
          ))}
        </ul>

        {/* Notes */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Pipeline Notes
          </p>
          <ul className="mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed text-slate-700">
            {output.aggregate.notes.map((note, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-slate-400">·</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <InstitutionalFooter variant="slim" />
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  const toneClass =
    tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <div>
      <dt className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 font-mono text-[18px] font-extrabold tabular-nums ${toneClass}`}>
        {value}
      </dd>
    </div>
  );
}

function FixtureCard({ report, tier2Pct }: { report: DryRunReport; tier2Pct: number }) {
  const d = report.mapping.draft;
  const summary = report.summary;
  const coverage = report.preCoverage;
  const passingT2 = coverage.tier2Count >= 16;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {report.label}
      </p>
      <h2 className="mt-2 font-headline text-base font-extrabold leading-tight tracking-tight text-forest-900">
        {d.canonical_name ?? "—"}
      </h2>
      <p className="mt-1 font-mono text-[10.5px] text-slate-600">
        {d.neighborhood ? `${d.neighborhood} · ` : ""}
        {summary.municipioFoldedTo ?? d.city ?? "—"} · {d.country_code ?? "—"}
      </p>

      {/* Identity */}
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-3 font-mono text-[10.5px]">
        <Field label="Brand" value={d.brand} />
        <Field label="Brand family" value={d.brand_family} />
        <Field label="Chain scale" value={d.chain_scale} />
        <Field label="Segment" value={summary.segmentDerived} />
        <Field label="Star rating" value={d.star_rating != null ? `${d.star_rating}★` : null} />
        <Field label="Hotel type" value={d.hotel_type} />
        <Field label="Rooms" value={d.total_rooms != null ? d.total_rooms.toString() : null} />
        <Field label="Review score" value={d.review_score != null ? d.review_score.toFixed(1) : null} />
      </dl>

      {/* Coverage tiers */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Coverage Tiers
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill
            label={`T0 · ${coverage.tier0Count}/8`}
            ok={coverage.tier0Count === 8}
          />
          <Pill
            label={`T1 · ${coverage.tier1Count}/12`}
            ok={coverage.tier1Count >= 11}
          />
          <Pill
            label={`T2 · ${coverage.tier2Count}/19 (${tier2Pct}%)`}
            ok={passingT2}
            warn={!passingT2 && coverage.tier2Count >= 8}
          />
        </div>
      </div>

      {/* Amenities determined */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Amenities determined
        </p>
        <p className="mt-1 font-mono text-[11px] text-slate-700">
          <span className="font-bold text-slate-900">
            {coverage.determinedAmenityKeys}
          </span>{" "}
          / 14 keys ·{" "}
          <span className={summary.unmappedAmenityCount === 0 ? "text-emerald-700" : "text-amber-700"}>
            {summary.unmappedAmenityCount}
          </span>{" "}
          unmapped strings
        </p>
      </div>

      {/* Critical gaps */}
      {summary.criticalGapCount > 0 && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-rose-700">
            Critical gaps · {summary.criticalGapCount}
          </p>
          <ul className="mt-1.5 space-y-0.5 font-mono text-[10.5px] text-rose-800">
            {report.parse.criticalGaps.map((gap, i) => (
              <li key={i}>· {gap}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Resolution checks */}
      <div className="mt-3 border-t border-slate-100 pt-3 font-mono text-[10px]">
        <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Resolution
        </p>
        <ul className="mt-1.5 space-y-0.5 text-slate-600">
          <ResolutionLine ok={summary.canonicalNamePopulated} label="Canonical name" />
          <ResolutionLine ok={summary.brandFamilyResolved} label="Brand family" />
          <ResolutionLine ok={summary.municipioFolded} label="Municipio fold" />
          <ResolutionLine ok={summary.hotelTypeResolved} label="Hotel type" />
        </ul>
      </div>

      <p className="mt-auto pt-4 font-mono text-[10px] text-slate-500">
        Populated · {summary.populatedFieldCount} fields
      </p>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-bold text-slate-900">
        {value && value.length > 0 ? value : <span className="text-slate-400">—</span>}
      </dd>
    </div>
  );
}

function Pill({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) {
  const cls = ok
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : warn
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-rose-200 bg-rose-50 text-rose-800";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

function ResolutionLine({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex gap-1.5">
      <span className={ok ? "text-emerald-700" : "text-slate-400"}>{ok ? "✓" : "○"}</span>
      <span>{label}</span>
    </li>
  );
}
