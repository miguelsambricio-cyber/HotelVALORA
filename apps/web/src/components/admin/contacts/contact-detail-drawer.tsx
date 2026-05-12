import Link from "next/link";
import { X, ExternalLink, Mail, Phone, Building2, MapPin, Activity, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactDetail, TimelineEvent } from "@/lib/admin/contacts/live";

/**
 * Institutional relationship intelligence drawer · server component.
 *
 * Open-on-row-click is wired via the URL ?selected=<contact_id>
 * searchParam · `ContactsTable` rows link to the same page with that
 * param attached · this drawer renders alongside the list when the
 * param is present.
 *
 * Layout matches the visual language of AI Operations / Integrations
 * / Intelligence Feed: dark forest-900 → slate-950 gradient cards,
 * lime-300 accents, tracked-out uppercase micro-labels, mono numbers
 * with band-tinted accents.
 *
 * Read-only by design — Phase 2.C ships intelligence only. Mutation
 * surfaces (merge / promote unmatched / correct invalid) still flow
 * through the Python ingester so provenance stays auditable.
 */
export function ContactDetailDrawer({
  detail,
  closeHref,
}: {
  detail: ContactDetail;
  closeHref: string;
}) {
  const c = detail.contact;
  return (
    <aside className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-2xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <DrawerHeader detail={detail} closeHref={closeHref} />
      <DrawerSection title="Conversion status">
        <ConversionStatus detail={detail} />
      </DrawerSection>
      <DrawerSection title="Institutional context">
        <InstitutionalContext detail={detail} />
      </DrawerSection>
      <DrawerSection title="Suggested next action">
        <StrategicSection detail={detail} />
      </DrawerSection>
      <DrawerSection title={`Timeline · ${detail.timeline.length} events`}>
        <Timeline events={detail.timeline} />
      </DrawerSection>
      <DrawerSection title={`Peers at ${c.company_name || "this company"} · ${detail.peers.length}`}>
        <PeerList peers={detail.peers} />
      </DrawerSection>
    </aside>
  );
}

function DrawerHeader({
  detail,
  closeHref,
}: {
  detail: ContactDetail;
  closeHref: string;
}) {
  const c = detail.contact;
  return (
    <header className="space-y-3 border-b border-slate-800/60 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            Institutional Contact · {c.master_id}
          </p>
          <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
            {c.full_name || "(no name)"}
          </h2>
          {(c.title || c.role) && (
            <p className="mt-0.5 text-[12px] text-slate-300">
              {c.title}
              {c.title && c.role && c.role !== c.title ? " · " : ""}
              {c.role && c.role !== c.title ? c.role : ""}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 font-headline text-[11px] font-bold text-slate-200">
            <Building2 size={11} className="text-slate-400" /> {c.company_name || "—"}
            {(c.country || c.continent) && (
              <span className="ml-2 inline-flex items-center gap-1 font-mono text-[10px] font-normal text-slate-500">
                <MapPin size={9} /> {[c.country, c.continent].filter(Boolean).join(" · ")}
              </span>
            )}
          </p>
        </div>
        <Link
          href={closeHref}
          aria-label="Close detail"
          className="rounded-md p-1 text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
        >
          <X size={16} />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {c.email && (
          <a
            href={`mailto:${c.email}`}
            className="inline-flex items-center gap-1 rounded bg-slate-800/60 px-2 py-1 font-mono text-[10.5px] text-lime-300 ring-1 ring-slate-700/60 hover:text-lime-200"
          >
            <Mail size={10} /> {c.email}
          </a>
        )}
        {c.phone && (
          <span className="inline-flex items-center gap-1 rounded bg-slate-800/60 px-2 py-1 font-mono text-[10.5px] text-slate-300 ring-1 ring-slate-700/60">
            <Phone size={10} /> {c.phone}
          </span>
        )}
        {c.linkedin && (
          <a
            href={c.linkedin.startsWith("http") ? c.linkedin : `https://${c.linkedin}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded bg-slate-800/60 px-2 py-1 font-mono text-[10.5px] text-slate-300 ring-1 ring-slate-700/60 hover:text-slate-200"
          >
            <ExternalLink size={10} /> LinkedIn
          </a>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-800/60 pt-3 sm:grid-cols-3">
        <Stat label="Relationship strength" value={String(c.relationship_strength)} />
        <Stat label="Collab potential" value={String(c.collaboration_potential_score)} tone={
          c.collaboration_potential_score >= 70 ? "ok"
          : c.collaboration_potential_score >= 40 ? "warn"
          : "neutral"
        } />
        <Stat label="Band" value={c.relationship_band || "cold"} bandTone={c.relationship_band} />
        <Stat label="Email health" value={c.flagged_for_correction || c.email_validity === "invalid" ? `invalid · ${c.bounce_count}` : c.bounce_count > 0 ? `soft · ${c.bounce_count}` : c.email_validity || "—"} tone={
          c.flagged_for_correction || c.email_validity === "invalid" ? "error"
          : c.bounce_count > 0 ? "warn"
          : c.email_validity === "valid" ? "ok"
          : "neutral"
        } />
        <Stat label="Directionality" value={c.email_directionality || "—"} />
        <Stat label="Active threads" value={String(c.active_threads)} />
      </dl>
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
  bandTone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "error" | "neutral";
  bandTone?: string | null;
}) {
  const baseTone = (() => {
    if (bandTone) {
      switch (bandTone) {
        case "strategic":
        case "active":
          return "text-emerald-300";
        case "warm":
          return "text-amber-300";
        case "invalid":
        case "dormant":
          return "text-rose-300";
        default:
          return "text-slate-300";
      }
    }
    switch (tone) {
      case "ok": return "text-emerald-300";
      case "warn": return "text-amber-300";
      case "error": return "text-rose-300";
      default: return "text-lime-300";
    }
  })();
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={cn("mt-0.5 font-headline text-[14px] font-extrabold", baseTone)}>
        {value}
      </dd>
    </div>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-slate-800/60 py-4 last:border-b-0">
      <h3 className="mb-3 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
        {title}
      </h3>
      {children}
    </section>
  );
}

function InstitutionalContext({ detail }: { detail: ContactDetail }) {
  const c = detail.contact;
  const co = detail.company;
  if (!co) {
    return (
      <p className="font-mono text-[11px] text-slate-500">
        No company entity in the relationship graph — contact stored as a free-text affiliation.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11.5px]">
        {co.investor_type_canonical && (
          <Field label="Investor classification" value={co.investor_type_canonical} />
        )}
        {co.investor_subtype && <Field label="Subtype" value={co.investor_subtype} />}
        {co.tier && <Field label="Tier" value={co.tier} />}
        {co.industry && <Field label="Industry" value={co.industry} />}
        {co.hotel_focus && co.hotel_focus !== "Unknown" && (
          <Field label="Hotel focus" value={co.hotel_focus} />
        )}
        {co.fund_size && <Field label="Fund size" value={co.fund_size} />}
        {(co.investment_min || co.investment_max) && (
          <Field
            label="Ticket range"
            value={[co.investment_min, co.investment_max].filter(Boolean).join(" — ") || "—"}
          />
        )}
        {co.investment_preference && (
          <Field label="Investment preference" value={co.investment_preference} />
        )}
        {co.location && <Field label="HQ" value={co.location} />}
      </dl>
      {co.description && (
        <p className="rounded-md border border-slate-700/40 bg-slate-900/40 p-3 text-[11px] leading-relaxed text-slate-300">
          {co.description}
        </p>
      )}
      <ActivityDensity density={detail.activity_density} />
    </div>
  );
}

function ActivityDensity({ density }: { density: number }) {
  const tone =
    density >= 8 ? "text-emerald-300"
    : density >= 4 ? "text-amber-300"
    : density > 0 ? "text-lime-300"
    : "text-slate-500";
  const word =
    density >= 8 ? "high · institutional pulse"
    : density >= 4 ? "moderate"
    : density > 0 ? "low"
    : "no dated events";
  return (
    <div className="flex items-center gap-2 rounded-md bg-slate-900/40 px-3 py-2 ring-1 ring-slate-700/40">
      <Activity size={12} className="text-slate-400" />
      <span className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
        Activity density
      </span>
      <span className={cn("ml-auto font-mono text-[11px] font-bold", tone)}>
        {density} · {word}
      </span>
    </div>
  );
}

function StrategicSection({ detail }: { detail: ContactDetail }) {
  const c = detail.contact;
  const inter = detail.interactions;
  const inv = c.contact_invitation_status;
  const isUser = detail.linked_user !== null;

  // Growth-oriented next-action heuristic · deterministic mapping.
  // HOTELVALORA's contacts base feeds growth — actions are framed in
  // funnel terms (invite, promo, campaign), not abstract intelligence.
  const nextAction = ((): { tag: string; tone: "ok" | "warn" | "error" | "neutral" } => {
    if (c.flagged_for_correction || c.email_validity === "invalid")
      return { tag: "Mark invalid · correct address before any send", tone: "error" };
    if (isUser && detail.linked_user?.invitation_status === "churn_risk")
      return { tag: "Re-activate · churn-risk subscriber", tone: "warn" };
    if (isUser && detail.linked_user?.invitation_status === "inactive")
      return { tag: "Win-back campaign · inactive user", tone: "warn" };
    if (isUser) return { tag: "User onboarded · maintain relationship · upsell-ready", tone: "ok" };
    if (inv === "invited") return { tag: "Re-send / follow up · invite outstanding", tone: "ok" };
    if (inv === "bounced") return { tag: "Re-confirm address · last invite bounced", tone: "warn" };
    if (inv === "declined") return { tag: "Park · declined this round, retry next cycle", tone: "neutral" };
    // Brand-new contact: pick the best growth action by band + signals
    if (c.relationship_band === "strategic")
      return { tag: "Personal invite · strategic counterparty", tone: "ok" };
    if (c.relationship_band === "active")
      return { tag: "Add to beta-invite campaign · active relationship", tone: "ok" };
    if (c.relationship_band === "warm")
      return { tag: "Invite to platform · assign promo code", tone: "ok" };
    if (c.relationship_band === "dormant")
      return { tag: "Park · re-engage via newsletter only", tone: "neutral" };
    if (c.collaboration_potential_score >= 60)
      return { tag: "Add to outreach campaign · qualified lead", tone: "ok" };
    return { tag: "Background contact · no immediate action", tone: "neutral" };
  })();

  // Growth tags · derived signals (focus on what unlocks an action)
  const tags: string[] = [];
  if (isUser) tags.push("converted");
  if (inv === "invited") tags.push("invite-pending");
  if (inv === "bounced") tags.push("invite-bounced");
  if (inv === "converted") tags.push("onboarded");
  if (c.relationship_band === "strategic" || c.relationship_band === "active") tags.push("priority");
  if (c.email_directionality === "bidirectional") tags.push("warm");
  if (c.collaboration_potential_score >= 70) tags.push("qualified-lead");
  if (inter?.latest_deal_stage && /loi|ioi|bid|investment meeting/i.test(inter.latest_deal_stage))
    tags.push("live-deal");
  if (inter?.declined_date) tags.push("declined-history");
  if (c.bounce_count > 0) tags.push("email-fragile");
  if (c.hotel_focus === "Yes") tags.push("hospitality-mandate");

  // Warm-intro potential · still useful · framed as a growth lever
  const warmIntro =
    detail.peers.length >= 3
      ? `Strong · ${detail.peers.length} peers known at the same firm`
      : detail.peers.length > 0
        ? `Possible · ${detail.peers.length} peer${detail.peers.length === 1 ? "" : "s"} at the firm`
        : "Direct only · no peers at the firm in the Master";

  return (
    <div className="space-y-3">
      <Field label="Action" value={nextAction.tag} tone={nextAction.tone} />
      <Field label="Warm-intro potential" value={warmIntro} />
      {detail.invitation_count > 0 && (
        <Field
          label="Invitation history"
          value={`${detail.invitation_count} invitation event${detail.invitation_count === 1 ? "" : "s"} on record`}
        />
      )}
      {c.last_contacted_at && (
        <Field label="Last contacted" value={c.last_contacted_at.slice(0, 10)} />
      )}
      {inter?.declined_comments && (
        <Field label="Declined comments" value={inter.declined_comments} />
      )}
      {c.notes_consolidated && (
        <div>
          <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Relationship notes
          </p>
          <p className="mt-1 whitespace-pre-line rounded-md border border-slate-700/40 bg-slate-900/40 p-3 text-[11px] leading-relaxed text-slate-300">
            {c.notes_consolidated}
          </p>
        </div>
      )}
      {tags.length > 0 && (
        <div>
          <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Growth tags
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[9.5px] text-lime-200 ring-1 ring-lime-300/30"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="rounded-md border border-slate-700/40 bg-slate-900/40 p-3 text-[10.5px] leading-relaxed text-slate-400">
        Read-only today. Mutation surfaces (invite · promo assign · merge · mark invalid · assign owner)
        land in Phase 2.D.2. Bulk actions in Phase 2.D.3.
      </p>
    </div>
  );
}

function ConversionStatus({ detail }: { detail: ContactDetail }) {
  const c = detail.contact;
  const u = detail.linked_user;
  const stage = u
    ? u.invitation_status === "active"
      ? { label: "Active user", tone: "ok" as const }
      : u.invitation_status === "onboarding"
        ? { label: "Onboarding", tone: "ok" as const }
        : u.invitation_status === "invited"
          ? { label: "Invited (account created)", tone: "ok" as const }
          : u.invitation_status === "inactive"
            ? { label: "Inactive user", tone: "warn" as const }
            : u.invitation_status === "churn_risk"
              ? { label: "Churn risk", tone: "error" as const }
              : { label: u.invitation_status, tone: "neutral" as const }
    : c.contact_invitation_status === "invited"
      ? { label: "Invited · awaiting signup", tone: "ok" as const }
      : c.contact_invitation_status === "onboarding"
        ? { label: "Onboarding", tone: "ok" as const }
        : c.contact_invitation_status === "converted"
          ? { label: "Converted (linked user missing)", tone: "warn" as const }
          : c.contact_invitation_status === "declined"
            ? { label: "Declined", tone: "neutral" as const }
            : c.contact_invitation_status === "bounced"
              ? { label: "Bounced invite", tone: "warn" as const }
              : { label: "Not invited", tone: "neutral" as const };

  const stageTone =
    stage.tone === "ok" ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
    : stage.tone === "warn" ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
    : stage.tone === "error" ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
    : "bg-slate-700/40 text-slate-300 ring-slate-600/40";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Stage
        </span>
        <span className={cn(
          "inline-flex items-center rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.2em] ring-1",
          stageTone,
        )}>
          {stage.label}
        </span>
      </div>

      {u && (
        <div className="rounded-md bg-slate-900/40 p-3 ring-1 ring-slate-700/40">
          <div className="flex items-center gap-2">
            <UserCircle2 size={14} className="text-emerald-300" />
            <Link
              href={`/user/admin/users?search=${encodeURIComponent(u.email)}`}
              className="font-headline text-[12px] font-bold text-emerald-200 hover:text-emerald-100"
            >
              {u.full_name || u.email}
            </Link>
            <span className="ml-auto font-mono text-[9.5px] text-slate-500">{u.tier}</span>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1">
            <Stat label="Role" value={u.role} />
            <Stat label="Status" value={u.invitation_status} />
            <Stat label="Signed up" value={u.created_at.slice(0, 10)} />
            <Stat label="Last seen" value={u.last_seen_at ? u.last_seen_at.slice(0, 10) : "—"} />
          </dl>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Field label="Contact invite state" value={c.contact_invitation_status.replace(/_/g, " ")} />
        <Field
          label="Invitations sent"
          value={`${detail.invitation_count}`}
          tone={detail.invitation_count > 0 ? "ok" : "neutral"}
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "error" | "neutral";
}) {
  const t = (() => {
    switch (tone) {
      case "ok": return "text-emerald-300";
      case "warn": return "text-amber-300";
      case "error": return "text-rose-300";
      default: return "text-slate-200";
    }
  })();
  return (
    <div>
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={cn("mt-0.5 text-[11.5px]", t)}>{value}</p>
    </div>
  );
}

function Timeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="font-mono text-[11px] text-slate-500">
        No dated events recorded · no Gmail signals, no Datasite stages, no labels timestamped for this contact.
      </p>
    );
  }
  return (
    <ol className="space-y-2.5">
      {events.map((e, i) => (
        <li key={`${e.kind}-${i}`} className="flex gap-3">
          <div className="flex flex-col items-center pt-0.5">
            <SourceDot source={e.source} />
            {i < events.length - 1 && (
              <span aria-hidden className="mt-1 h-full w-px bg-slate-700/50" />
            )}
          </div>
          <div className="min-w-0 flex-1 pb-2.5">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-headline text-[11px] font-bold uppercase tracking-[0.15em] text-slate-300">
                {e.label}
              </span>
              <span className="font-mono text-[10px] text-slate-500">{e.date}</span>
            </p>
            {e.detail && (
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">{e.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function SourceDot({ source }: { source: TimelineEvent["source"] }) {
  const tone =
    source === "datasite" ? "bg-emerald-400"
    : source === "gmail"  ? "bg-amber-300"
    : "bg-lime-300";
  return <span aria-hidden className={cn("h-2 w-2 rounded-full", tone)} />;
}

function PeerList({ peers }: { peers: ContactDetail["peers"] }) {
  if (peers.length === 0) {
    return (
      <p className="font-mono text-[11px] text-slate-500">
        No peer contacts in the relationship graph · this is the only Master row affiliated with the company.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {peers.map((p) => (
        <li
          key={p.id}
          className="flex items-center justify-between gap-3 rounded-md bg-slate-900/40 px-3 py-2 ring-1 ring-slate-700/40"
        >
          <div className="min-w-0">
            <p className="truncate font-headline text-[11.5px] font-bold text-slate-200">
              {p.full_name || "(no name)"}
            </p>
            {p.title && <p className="truncate font-mono text-[10px] text-slate-500">{p.title}</p>}
          </div>
          <div className="text-right">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300/80">
              {p.relationship_band || "cold"}
            </p>
            <p className="font-mono text-[10px] text-slate-500">
              collab {p.collaboration_potential_score}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
