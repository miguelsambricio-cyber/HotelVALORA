import { ExternalLink, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { ExtractedDeal, ExtractedProject } from "@/lib/admin/intelligence";
import { CATEGORY_VISUAL } from "@/lib/admin/intelligence";

/**
 * Extracted-deals table — the institutional "deals desk" panel. Each row
 * is a structured transaction or project drawn from a news article, with
 * every field the underwriting pipeline cares about: rooms, €, €/key,
 * buyer, seller, operator, brand, advisors, capex, opening year.
 *
 * Renders both transactions (hotel_transactions) and projects
 * (hotel_projects) in one terminal — operators see the deal flow as
 * one stream.
 */
export function ExtractedDealsPanel({
  deals,
  projects,
}: {
  deals: ExtractedDeal[];
  projects: ExtractedProject[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Handshake size={14} className="text-slate-400" aria-hidden />
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Extracted Deals · 7d
          </h3>
        </div>
        <span className="font-mono text-[10.5px] text-slate-500">
          {deals.length} transactions · {projects.length} projects
        </span>
      </header>

      <div className="divide-y divide-slate-800/60">
        {/* Transactions block */}
        {deals.length > 0 && (
          <div>
            <p className="px-5 pt-4 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Transactions
            </p>
            <DealsTable deals={deals} />
          </div>
        )}
        {/* Projects block */}
        {projects.length > 0 && (
          <div>
            <p className="px-5 pt-4 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Projects · Pipeline · Development
            </p>
            <ProjectsTable projects={projects} />
          </div>
        )}
      </div>
    </section>
  );
}

function DealsTable({ deals }: { deals: ExtractedDeal[] }) {
  return (
    <div className="overflow-x-auto px-2 py-3">
      <table className="w-full text-left font-mono text-[11.5px]">
        <thead>
          <tr className="text-slate-500">
            <Th>Asset</Th>
            <Th>Geo</Th>
            <Th align="right">Rooms</Th>
            <Th align="right">Price</Th>
            <Th align="right">€/Key</Th>
            <Th>Cap Rate</Th>
            <Th>Buyer</Th>
            <Th>Seller</Th>
            <Th>Operator</Th>
            <Th>Advisors</Th>
            <Th>Source</Th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {deals.map((d) => {
            const cat = CATEGORY_VISUAL[d.category];
            const sig = SIGNAL_VISUAL[cat.signal];
            return (
              <tr key={d.id} className="border-t border-slate-800/40 align-top">
                <Td>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ring-1",
                        sig.bg, sig.ring, sig.text,
                      )}>
                        {cat.label}
                      </span>
                    </div>
                    <span className="font-headline text-[12px] font-extrabold text-white">
                      {d.assetName || "—"}
                    </span>
                    <span className="text-[10.5px] text-slate-500">{d.notes ?? ""}</span>
                  </div>
                </Td>
                <Td>{[d.city, d.country].filter(Boolean).join(" · ") || "—"}</Td>
                <Td align="right" className="text-lime-300">{d.rooms != null ? d.rooms.toLocaleString() : "—"}</Td>
                <Td align="right" className="text-lime-300">{formatEur(d.priceEur)}</Td>
                <Td align="right" className="text-lime-300">{formatEur(d.pricePerKeyEur, true)}</Td>
                <Td>{d.capRate != null ? `${d.capRate.toFixed(1)}%` : "—"}</Td>
                <Td>{d.buyer ?? "—"}</Td>
                <Td>{d.seller ?? "—"}</Td>
                <Td>
                  <div className="flex flex-col">
                    <span>{d.operator ?? "—"}</span>
                    {d.brand && <span className="text-[10px] text-slate-500">{d.brand}</span>}
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-col text-[10.5px] leading-tight text-slate-400">
                    {d.advisorSell && <span>sell: {d.advisorSell}</span>}
                    {d.advisorBuy && <span>buy: {d.advisorBuy}</span>}
                    {!d.advisorSell && !d.advisorBuy && "—"}
                  </div>
                </Td>
                <Td>
                  <a
                    href={d.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 underline-offset-2 hover:text-lime-300 hover:underline"
                    title="Original source URL"
                  >
                    {d.sourceSlug}
                    <ExternalLink size={10} aria-hidden />
                  </a>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ProjectsTable({ projects }: { projects: ExtractedProject[] }) {
  return (
    <div className="overflow-x-auto px-2 py-3">
      <table className="w-full text-left font-mono text-[11.5px]">
        <thead>
          <tr className="text-slate-500">
            <Th>Project</Th>
            <Th>Geo</Th>
            <Th align="right">Rooms</Th>
            <Th>Opening</Th>
            <Th>Developer</Th>
            <Th>Operator</Th>
            <Th>Brand</Th>
            <Th align="right">Capex</Th>
            <Th>Source</Th>
          </tr>
        </thead>
        <tbody className="text-slate-300">
          {projects.map((p) => {
            const cat = CATEGORY_VISUAL[p.category];
            const sig = SIGNAL_VISUAL[cat.signal];
            return (
              <tr key={p.id} className="border-t border-slate-800/40 align-top">
                <Td>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ring-1",
                        sig.bg, sig.ring, sig.text,
                      )}>
                        {cat.label}
                      </span>
                    </div>
                    <span className="font-headline text-[12px] font-extrabold text-white">
                      {p.projectName || "—"}
                    </span>
                    <span className="text-[10.5px] text-slate-500">{p.notes ?? ""}</span>
                  </div>
                </Td>
                <Td>{[p.city, p.country].filter(Boolean).join(" · ") || "—"}</Td>
                <Td align="right" className="text-lime-300">{p.rooms != null ? p.rooms.toLocaleString() : "—"}</Td>
                <Td>{p.estimatedOpening ?? "—"}</Td>
                <Td>{p.developer ?? "—"}</Td>
                <Td>{p.operator ?? "—"}</Td>
                <Td>{p.brand ?? "—"}</Td>
                <Td align="right" className="text-lime-300">{formatEur(p.capexEur)}</Td>
                <Td>
                  <a
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-slate-400 underline-offset-2 hover:text-lime-300 hover:underline"
                    title="Original source URL"
                  >
                    {p.sourceSlug}
                    <ExternalLink size={10} aria-hidden />
                  </a>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={cn(
        "px-2 py-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em]",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode;
  align?: "right";
  className?: string;
}) {
  return (
    <td className={cn("px-2 py-3", align === "right" && "text-right", className)}>
      {children}
    </td>
  );
}

function formatEur(value: number | null, perKey?: boolean): string {
  if (value == null) return "—";
  if (perKey) {
    return `€${Math.round(value / 1000).toLocaleString()}k`;
  }
  if (value >= 1_000_000_000) return `€${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  return `€${Math.round(value).toLocaleString()}`;
}
