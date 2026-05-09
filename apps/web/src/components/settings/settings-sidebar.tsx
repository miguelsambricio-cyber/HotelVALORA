"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  HelpCircle,
  Key,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: typeof User;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/settings/profile", label: "Profile", icon: User },
  { href: "/settings/credentials", label: "Credentials", icon: Key },
  { href: "/settings/investment", label: "Investment", icon: Briefcase },
];

const SECONDARY_NAV: NavItem[] = [
  { href: "#admin", label: "Admin", icon: Shield },
  { href: "#support", label: "Support", icon: HelpCircle },
];

/**
 * Settings shell sidebar. Sticky on desktop (top-24 to clear the sticky
 * AppHeader). Items float on the page background — active item becomes a
 * white pill with a lime-yellow accent rail and forest-900 text.
 */
export function SettingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    router.push("/login");
  };

  return (
    <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      {/* Brand block */}
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
          <Building2 size={20} className="text-forest-900" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <h2 className="font-headline text-base font-extrabold leading-tight text-forest-900">
            Valora Prime
          </h2>
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            User Settings
          </p>
        </div>
      </div>

      {/* Primary nav */}
      <nav aria-label="Settings sections" className="space-y-1">
        {PRIMARY_NAV.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={pathname === item.href}
          />
        ))}
      </nav>

      <div className="my-5 border-t border-slate-200" />

      {/* Secondary nav + sign out */}
      <nav aria-label="Account actions" className="space-y-1">
        {SECONDARY_NAV.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            active={false}
          />
        ))}
        <button
          type="button"
          onClick={handleSignOut}
          className={cn(
            "relative flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all font-headline",
            "text-red-600 hover:bg-red-50",
          )}
        >
          <LogOut size={16} strokeWidth={2.2} />
          Sign Out
        </button>
      </nav>
    </aside>
  );
}

// ── Internal pill ───────────────────────────────────────────────────────────

function SidebarItem({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold transition-all font-headline",
        active
          ? "bg-white text-forest-900 shadow-sm"
          : "text-slate-500 hover:bg-white/60 hover:text-forest-900",
      )}
      aria-current={active ? "page" : undefined}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-1.5 top-2.5 bottom-2.5 w-1 rounded-r bg-yellow-400"
        />
      )}
      <Icon size={16} strokeWidth={2.2} />
      {item.label}
    </Link>
  );
}
