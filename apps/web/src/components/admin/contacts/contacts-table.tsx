import Link from "next/link";
import { ExternalLink, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactRow } from "@/lib/admin/contacts/live";
import { SelectionCheckbox } from "@/components/admin/contacts/bulk/selection-checkbox";

/**
 * Institutional relationship table · server component · displays the
 * paginated query result with band + signal chips. Each row is a
 * `<Link>` to the same page with `?selected=<id>` attached — the page
 * server component reads the param and renders the detail drawer
 * alongside.
 */
export function ContactsTable({
  rows,
  total,
  page,
  pageSize,
  selectedId,
  baseSearchParams,
}: {
  rows: ContactRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Currently-open row id · highlights the row in the table */
  selectedId?: string | null;
  /** The current URLSearchParams string (without selected) so row links preserve filters */
  baseSearchParams: string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Contacts · {rows.length} of {total}
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">
          page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-[12px] leading-relaxed text-slate-400">
          No contacts match the current filters. Try widening the band / type or toggling "Show invalid".
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-left text-slate-500">
                <Th></Th>
                <Th>Contact</Th>
                <Th>Company</Th>
                <Th>Type</Th>
                <Th right>Band</Th>
                <Th right>Strength</Th>
                <Th right>Collab</Th>
                <Th right>Last email</Th>
                <Th>Gmail labels</Th>
                <Th right>Email health</Th>
                <Th>Strategic signal</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row
                  key={r.id}
                  row={r}
                  selected={selectedId === r.id}
                  baseSearchParams={baseSearchParams}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "px-2 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]",
        right && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function Row({
  row,
  selected,
  baseSearchParams,
}: {
  row: ContactRow;
  selected: boolean;
  baseSearchParams: string;
}) {
  const fullName = row.full_name || "(no name)";
  const email = row.email || "";
  const sep = baseSearchParams ? "&" : "";
  const detailHref = `/user/admin/contacts?${baseSearchParams}${sep}selected=${row.id}`;
  return (
    <tr
      className={cn(
        "border-t border-slate-800/60 align-top transition-colors",
        selected
          ? "bg-lime-300/10"
          : "hover:bg-slate-800/30 focus-within:bg-slate-800/30",
      )}
    >
      <td className="px-2 py-3 align-middle">
        <SelectionCheckbox id={row.id} />
      </td>
      <td className="px-2 py-3">
        <Link
          href={detailHref}
          scroll={false}
          aria-label={`Open relationship intelligence for ${fullName}`}
          className="block focus:outline-none"
        >
          <p className="font-headline font-bold text-white hover:text-lime-200">{fullName}</p>
        </Link>
        {row.title && (
          <p className="mt-0.5 text-[10.5px] text-slate-400">{row.title}{row.role && row.role !== row.title ? ` · ${row.role}` : ""}</p>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-lime-300/80 hover:text-lime-200"
          >
            <Mail size={9} aria-hidden />
            <span className="font-mono">{email}</span>
          </a>
        )}
        {row.linkedin && (
          <a
            href={row.linkedin.startsWith("http") ? row.linkedin : `https://${row.linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center text-[10.5px] text-slate-400 hover:text-slate-200"
          >
            <ExternalLink size={9} aria-hidden />
          </a>
        )}
      </td>
      <td className="px-2 py-3">
        <p className="font-headline text-[11.5px] font-bold text-slate-200">
          {row.company_name || "—"}
        </p>
        {(row.country || row.continent) && (
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">
            {[row.country, row.continent].filter(Boolean).join(" · ")}
          </p>
        )}
      </td>
      <td className="px-2 py-3">
        {row.investor_type && (
          <span className="inline-flex items-center rounded bg-slate-800/60 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60">
            {row.investor_type}
          </span>
        )}
        {row.hotel_focus && row.hotel_focus !== "Unknown" && row.hotel_focus !== "No" && (
          <span className="ml-1 inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9.5px] text-emerald-200 ring-1 ring-emerald-500/30">
            {row.hotel_focus === "Yes" ? "Hospitality ★" : "Hospitality"}
          </span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        <BandBadge band={row.relationship_band} />
      </td>
      <td className="px-2 py-3 text-right">
        <span className="font-mono text-[11px] text-slate-300">{row.relationship_strength}</span>
      </td>
      <td className="px-2 py-3 text-right">
        <span className={cn(
          "font-mono font-bold text-[11.5px]",
          row.collaboration_potential_score >= 70
            ? "text-emerald-300"
            : row.collaboration_potential_score >= 40
              ? "text-amber-300"
              : "text-slate-400",
        )}>
          {row.collaboration_potential_score}
        </span>
      </td>
      <td className="px-2 py-3 text-right">
        <span className="font-mono text-[10.5px] text-slate-400">
          {row.last_email_date || "—"}
        </span>
        {row.email_directionality && row.email_directionality !== "none" && (
          <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">
            {row.email_directionality}
          </p>
        )}
      </td>
      <td className="px-2 py-3 max-w-[200px]">
        {row.labels.length === 0 ? (
          <span className="font-mono text-[10px] text-slate-600">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.labels.slice(0, 3).map((label) => (
              <span
                key={label}
                className="inline-flex items-center rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-300 ring-1 ring-slate-700/60"
                title={label}
              >
                {label.length > 22 ? `${label.slice(0, 22)}…` : label}
              </span>
            ))}
            {row.labels.length > 3 && (
              <span className="font-mono text-[9.5px] text-slate-500">+{row.labels.length - 3}</span>
            )}
          </div>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        <HealthBadge validity={row.email_validity} bounces={row.bounce_count} flagged={row.flagged_for_correction} />
      </td>
      <td className="px-2 py-3 max-w-[180px]">
        {row.inferred_relationship_stage && (
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">
            {row.inferred_relationship_stage}
          </p>
        )}
        {row.latest_deal_stage && (
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">
            Datasite: {row.latest_deal_stage}
          </p>
        )}
        {row.pipeline_state && row.pipeline_state !== "Active" && (
          <p className="mt-0.5 font-mono text-[10px] text-amber-200/70">
            {row.pipeline_state}
          </p>
        )}
        {!row.inferred_relationship_stage && !row.latest_deal_stage && (
          <span className="font-mono text-[10px] text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
}

function BandBadge({ band }: { band: string }) {
  const tone = (() => {
    switch (band) {
      case "strategic":
      case "active":
        return "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40";
      case "warm":
        return "bg-amber-500/15 text-amber-200 ring-amber-500/40";
      case "dormant":
        return "bg-rose-500/15 text-rose-200 ring-rose-500/40";
      case "invalid":
        return "bg-rose-500/25 text-rose-100 ring-rose-500/60";
      case "cold":
      default:
        return "bg-slate-700/40 text-slate-300 ring-slate-600/40";
    }
  })();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {band || "cold"}
    </span>
  );
}

function HealthBadge({
  validity,
  bounces,
  flagged,
}: {
  validity: string;
  bounces: number;
  flagged: boolean;
}) {
  if (flagged || validity === "invalid") {
    return (
      <span className="inline-flex items-center rounded bg-rose-500/15 px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-rose-200 ring-1 ring-rose-500/40">
        invalid · {bounces}
      </span>
    );
  }
  if (bounces > 0) {
    return (
      <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-amber-500/40">
        soft · {bounces}
      </span>
    );
  }
  if (validity === "valid") {
    return (
      <span className="inline-flex items-center rounded bg-emerald-500/15 px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-500/40">
        valid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-slate-700/40 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-400 ring-1 ring-slate-600/40">
      —
    </span>
  );
}
