"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CircuitBoard,
  Database,
  Gauge,
  LayoutGrid,
  Plug,
  ScrollText,
  Shield,
  Building2,
  ArrowLeft,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  /** Real Next.js route. Omit for disabled / planned items — they render as
   *  static divs that never navigate (no hash anchors, no scroll-jacking). */
  href?: string;
  label: string;
  icon: typeof Shield;
  badge?: string;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/user/admin", label: "Overview", icon: LayoutGrid },
  { href: "/user/admin/agents", label: "AI Operations", icon: CircuitBoard, badge: "Live" },
  { href: "/user/admin/integrations", label: "Integrations", icon: Plug, badge: "Live" },
  { href: "/user/admin/contacts", label: "Contacts", icon: Users, badge: "Live" },
];

const PLANNED_NAV: NavItem[] = [
  { label: "Workspaces", icon: Database, badge: "Phase 3" },
  { label: "Observability", icon: Activity, badge: "Phase 3" },
  { label: "Cost Controls", icon: Gauge, badge: "Phase 3" },
  { label: "Audit Log", icon: ScrollText, badge: "Phase 3" },
];

/**
 * Admin shell sidebar. Inherits the visual contract of SettingsSidebar
 * — same brand block at top, same pill-active state with the yellow rail,
 * same forest-900 / slate vocabulary. The "back to user" affordance keeps
 * the admin tree integrated with the rest of /settings/*.
 *
 * Planned items render disabled pills so the operator sees what's coming
 * without surprises.
 */
export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      {/* Brand block */}
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-forest-900 shadow-sm">
          <Shield size={20} className="text-lime-300" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline text-base font-extrabold leading-tight text-forest-900">
            Administrator
          </h2>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Operations Center
          </p>
        </div>
      </div>

      {/* Back link */}
      <Link
        href="/settings/profile"
        className="mb-5 inline-flex items-center gap-1.5 px-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={11} /> User Settings
      </Link>

      {/* Primary nav */}
      <nav aria-label="Admin sections" className="space-y-1">
        {PRIMARY_NAV.map((item) => (
          <SidebarItem
            key={item.label}
            item={item}
            active={
              item.href === "/user/admin"
                ? pathname === "/user/admin"
                : item.href
                ? pathname?.startsWith(item.href) ?? false
                : false
            }
          />
        ))}
      </nav>

      <div className="my-5 border-t border-slate-200" />

      {/* Planned future nav */}
      <p className="mb-2 px-4 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
        Planned
      </p>
      <nav aria-label="Planned admin sections" className="space-y-1">
        {PLANNED_NAV.map((item) => (
          <SidebarItem key={item.label} item={item} active={false} disabled />
        ))}
      </nav>

      {/* Footer affordance */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center gap-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          <Building2 size={12} /> HOTELVALORA · Ops
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-500">
          The Administrator area supervises the operational AI ecosystem.
          Read-only today — mutation surfaces ship phase by phase.
        </p>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  active,
  disabled,
}: {
  item: NavItem;
  active: boolean;
  disabled?: boolean;
}) {
  const Icon = item.icon;
  const inner = (
    <span
      className={cn(
        "relative flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all font-headline",
        active
          ? "bg-white text-forest-900 shadow-sm"
          : disabled
          ? "cursor-not-allowed text-slate-400"
          : "text-slate-500 hover:bg-white/60 hover:text-forest-900",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-1.5 bottom-2.5 top-2.5 w-1 rounded-r bg-yellow-400"
        />
      )}
      <span className="flex items-center gap-3">
        <Icon size={16} strokeWidth={2.2} />
        {item.label}
      </span>
      {item.badge && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-widest",
            active
              ? "bg-emerald-100 text-emerald-700"
              : disabled
              ? "bg-slate-100 text-slate-400"
              : "bg-slate-100 text-slate-500",
          )}
        >
          {item.badge}
        </span>
      )}
    </span>
  );

  if (disabled || !item.href) {
    return <div aria-disabled className="block">{inner}</div>;
  }
  return (
    <Link href={item.href} aria-current={active ? "page" : undefined}>
      {inner}
    </Link>
  );
}
