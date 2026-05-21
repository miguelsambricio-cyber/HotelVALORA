import { ExternalLink, KeyRound, Database, Clock, Workflow, AlertTriangle } from "lucide-react";
import type { PlatformIntegrationDescriptor } from "@/lib/admin/integrations/platform-registry";
import { classifyPlatformIntegration, type UnifiedStatus } from "@/lib/admin/integrations/unified-status";
import { IntegrationTile } from "./integration-tile";
import { IntegrationDetailSheet } from "./integration-detail-sheet";

/**
 * Platform integration · compact tile + click-to-expand detail sheet.
 *
 * Compact view matches the infra-indicator visual contract (canonical
 * sizing for /user/admin/integrations). Full technical dossier — auth
 * method, env vars, schema tables, cron dependencies, consumed-by
 * surfaces, notes, next milestone, external links — lives in the sheet,
 * not on the tile.
 */
export function PlatformIntegrationTile({
  integration,
}: {
  integration: PlatformIntegrationDescriptor;
}) {
  const status = classifyPlatformIntegration(integration);
  const signal = signalFromStatus(status, integration);
  const displayLabel = resolveStatusLabel(integration, status);
  return (
    <IntegrationDetailSheet
      title={integration.name}
      summary={
        <IntegrationTile
          signal={signal}
          name={integration.name}
          statusLabel={displayLabel}
          status={status}
          regionLabel={integration.provider}
          description={integration.purpose}
          metadata={compactMetadata(integration)}
        />
      }
    >
      <PlatformIntegrationDetail integration={integration} status={status} displayLabel={displayLabel} />
    </IntegrationDetailSheet>
  );
}

/**
 * Surface the raw platform status (e.g. "Testing") when it carries
 * more semantic detail than the unified hero-KPI bucket. The hero card
 * still counts testing as partial · the per-integration tile shows it
 * literally.
 */
function resolveStatusLabel(
  integration: PlatformIntegrationDescriptor,
  unified: UnifiedStatus,
): string {
  // "testing" stays as the internal taxonomy key · institutional vocabulary
  // surfaces "Validation" in the UI per operator preference (2026-05-21).
  if (integration.status === "testing") return "Validation";
  return STATUS_LABEL[unified];
}

function signalFromStatus(
  status: UnifiedStatus,
  i: PlatformIntegrationDescriptor,
): "ok" | "warn" | "error" | "neutral" {
  if (status === "fail") return "error";
  if (status === "partial") return "warn";
  if (status === "live") return "ok";
  if (i.signal === "warn") return "warn";
  return "neutral";
}

function compactMetadata(i: PlatformIntegrationDescriptor): string {
  const parts: string[] = [];
  parts.push(i.authMethod);
  if (i.cronDependencies.length > 0) {
    parts.push(`${i.cronDependencies.length} cron`);
  }
  if (i.tables.length > 0) {
    parts.push(`${i.tables.length} table${i.tables.length === 1 ? "" : "s"}`);
  }
  if (i.operatorManaged) parts.push("operator-managed");
  return parts.join(" · ");
}

const STATUS_LABEL: Record<UnifiedStatus, string> = {
  live: "Live",
  partial: "Partial",
  not_wired: "Not wired",
  fail: "Fail",
  planned: "Planned",
};

// ── full-detail panel content ───────────────────────────────────────────────

function PlatformIntegrationDetail({
  integration,
  status,
  displayLabel,
}: {
  integration: PlatformIntegrationDescriptor;
  status: UnifiedStatus;
  displayLabel: string;
}) {
  return (
    <div className="space-y-5">
      {/* Header: provider + state */}
      <div>
        <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {integration.provider} · Status · {displayLabel}
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-300/90">
          {integration.purpose}
        </p>
      </div>

      {integration.nextMilestone && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5">
          <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-200" />
          <p className="font-mono text-[10.5px] leading-relaxed text-amber-100/90">
            <span className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
              Next milestone ·{" "}
            </span>
            {integration.nextMilestone}
          </p>
        </div>
      )}

      <dl className="space-y-3 border-t border-slate-800/60 pt-3">
        <Row icon={<KeyRound size={11} />} label="Auth" value={integration.authMethod} />
        {integration.envVars.length > 0 && (
          <Row
            icon={<KeyRound size={11} />}
            label="Env"
            value={
              <span className="flex flex-wrap gap-1">
                {integration.envVars.map((v) => (
                  <code
                    key={v}
                    className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-200 ring-1 ring-slate-700/60"
                  >
                    {v}
                  </code>
                ))}
              </span>
            }
          />
        )}
        {integration.tables.length > 0 && (
          <Row
            icon={<Database size={11} />}
            label="Schema"
            value={
              <span className="font-mono text-[10.5px] text-slate-300">
                {integration.tables.join(" · ")}
              </span>
            }
          />
        )}
        {integration.cronDependencies.length > 0 && (
          <Row
            icon={<Clock size={11} />}
            label="Cron"
            value={
              <span className="font-mono text-[10.5px] text-slate-300">
                {integration.cronDependencies.join(" · ")}
              </span>
            }
          />
        )}
        {integration.consumedBy.length > 0 && (
          <Row
            icon={<Workflow size={11} />}
            label="Surfaces"
            value={
              <span className="font-mono text-[10.5px] text-slate-300">
                {integration.consumedBy.join(" · ")}
              </span>
            }
          />
        )}
      </dl>

      {integration.notes && integration.notes.length > 0 && (
        <ul className="space-y-1.5 border-t border-slate-800/60 pt-3">
          <p className="mb-1 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Operational notes
          </p>
          {integration.notes.map((note, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1.5 text-[11.5px] leading-snug text-slate-400"
            >
              <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-500" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      {(integration.operatorManaged || (integration.externalLinks ?? []).length > 0) && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-800/60 pt-3 text-[10.5px]">
          {integration.operatorManaged && (
            <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.2em] text-amber-100 ring-1 ring-amber-500/40">
              Operator-managed
            </span>
          )}
          {(integration.externalLinks ?? []).map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-slate-400 hover:text-lime-300"
            >
              <ExternalLink size={10} />
              {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {label}
        </dt>
        <dd className="mt-0.5 text-slate-300">{value}</dd>
      </div>
    </div>
  );
}
