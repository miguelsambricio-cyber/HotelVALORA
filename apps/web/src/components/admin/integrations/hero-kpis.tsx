import { Activity, CheckCircle2, AlertTriangle, Plug, XCircle, MoonStar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnifiedCounts } from "@/lib/admin/integrations/unified-status";

/**
 * Executive-control-room hero KPIs for /user/admin/integrations.
 *
 * Six compact glow cards · tightened ~25% vs the original showcase pass
 * (smaller padding + numeral, tighter radius, smaller glow blob). The
 * density target is Bloomberg-terminal × Apple-system-dashboard, not a
 * marketing landing page. Responsive: 2-col mobile → 3-col tablet → 6
 * cards on one row at lg+.
 */
export function HeroKPIs({ counts }: { counts: UnifiedCounts }) {
  const cards: Array<{
    key: keyof UnifiedCounts;
    label: string;
    description: string;
    value: number;
    tone: "lime" | "emerald" | "amber" | "blue" | "rose" | "violet";
    icon: React.ReactNode;
  }> = [
    {
      key: "total",
      label: "Total",
      description: "All integrations",
      value: counts.total,
      tone: "lime",
      icon: <Activity size={11} aria-hidden />,
    },
    {
      key: "live",
      label: "Live",
      description: "Fully operational",
      value: counts.live,
      tone: "emerald",
      icon: <CheckCircle2 size={11} aria-hidden />,
    },
    {
      key: "partial",
      label: "Partial",
      description: "Partially wired",
      value: counts.partial,
      tone: "amber",
      icon: <AlertTriangle size={11} aria-hidden />,
    },
    {
      key: "not_wired",
      label: "Not wired",
      description: "Configured · not connected",
      value: counts.not_wired,
      tone: "blue",
      icon: <Plug size={11} aria-hidden />,
    },
    {
      key: "fail",
      label: "Fail",
      description: "Error · failing",
      value: counts.fail,
      tone: "rose",
      icon: <XCircle size={11} aria-hidden />,
    },
    {
      key: "planned",
      label: "Planned",
      description: "Planned · not built",
      value: counts.planned,
      tone: "violet",
      icon: <MoonStar size={11} aria-hidden />,
    },
  ];

  return (
    <section
      aria-label="Integration health overview"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
    >
      {cards.map((c) => (
        <HeroCard
          key={c.key}
          label={c.label}
          description={c.description}
          value={c.value}
          tone={c.tone}
          icon={c.icon}
        />
      ))}
    </section>
  );
}

function HeroCard({
  label,
  description,
  value,
  tone,
  icon,
}: {
  label: string;
  description: string;
  value: number;
  tone: "lime" | "emerald" | "amber" | "blue" | "rose" | "violet";
  icon: React.ReactNode;
}) {
  const t = tonePalette(tone);
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-gradient-to-br p-2.5 transition-all duration-200 sm:p-3",
        "hover:-translate-y-0.5",
        t.border,
        t.gradient,
        t.shadow,
      )}
    >
      {/* radial glow · subtle */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl transition-opacity duration-300 opacity-40 group-hover:opacity-70",
          t.glow,
        )}
      />

      <div className="relative">
        <div className={cn("flex items-center gap-1 font-headline text-[8.5px] font-extrabold uppercase tracking-[0.22em]", t.label)}>
          <span className={cn("opacity-80", t.iconColor)}>{icon}</span>
          {label}
        </div>
        <p
          className={cn(
            "mt-1 font-headline font-extrabold tracking-tighter tabular-nums leading-none",
            "text-2xl sm:text-3xl",
            t.value,
          )}
        >
          {value}
        </p>
        <p className="mt-1 text-[10px] leading-tight text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function tonePalette(tone: "lime" | "emerald" | "amber" | "blue" | "rose" | "violet"): {
  border: string;
  gradient: string;
  shadow: string;
  glow: string;
  label: string;
  iconColor: string;
  value: string;
} {
  switch (tone) {
    case "emerald":
      return {
        border: "border-emerald-500/30",
        gradient: "from-emerald-500/15 via-slate-900 to-slate-950",
        shadow: "shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/25",
        glow: "bg-emerald-500/40",
        label: "text-emerald-200/90",
        iconColor: "text-emerald-300",
        value: "text-emerald-300",
      };
    case "amber":
      return {
        border: "border-amber-500/30",
        gradient: "from-amber-500/15 via-slate-900 to-slate-950",
        shadow: "shadow-md shadow-amber-500/10 hover:shadow-amber-500/25",
        glow: "bg-amber-500/40",
        label: "text-amber-200/90",
        iconColor: "text-amber-300",
        value: "text-amber-300",
      };
    case "blue":
      return {
        border: "border-sky-500/30",
        gradient: "from-sky-500/15 via-slate-900 to-slate-950",
        shadow: "shadow-md shadow-sky-500/10 hover:shadow-sky-500/25",
        glow: "bg-sky-500/40",
        label: "text-sky-200/90",
        iconColor: "text-sky-300",
        value: "text-sky-300",
      };
    case "rose":
      return {
        border: "border-rose-500/30",
        gradient: "from-rose-500/15 via-slate-900 to-slate-950",
        shadow: "shadow-md shadow-rose-500/10 hover:shadow-rose-500/25",
        glow: "bg-rose-500/40",
        label: "text-rose-200/90",
        iconColor: "text-rose-300",
        value: "text-rose-300",
      };
    case "violet":
      return {
        border: "border-violet-500/30",
        gradient: "from-violet-500/15 via-slate-900 to-slate-950",
        shadow: "shadow-md shadow-violet-500/10 hover:shadow-violet-500/25",
        glow: "bg-violet-500/40",
        label: "text-violet-200/90",
        iconColor: "text-violet-300",
        value: "text-violet-300",
      };
    case "lime":
    default:
      return {
        border: "border-lime-300/30",
        gradient: "from-lime-300/15 via-slate-900 to-slate-950",
        shadow: "shadow-md shadow-lime-300/10 hover:shadow-lime-300/25",
        glow: "bg-lime-300/40",
        label: "text-lime-200/90",
        iconColor: "text-lime-300",
        value: "text-lime-300",
      };
  }
}
