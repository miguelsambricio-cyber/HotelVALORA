"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Shield, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth, type UserTier } from "@/lib/auth";

export interface AppHeaderProps {
  /** User-button target. Defaults to /dashboard if authed, /login otherwise */
  userHref?: string;
  /** Library button target — points to a future library route */
  libraryHref?: string;
  /** Show the tier badge when an authenticated user is present (default: true) */
  showTierBadge?: boolean;
  /** Optional workspace selector slot — rendered immediately right of the logo */
  workspaceSlot?: ReactNode;
  /** Optional global search slot */
  searchSlot?: ReactNode;
  /** Optional notification slot (bell, badge, dropdown) */
  notificationsSlot?: ReactNode;
  className?: string;
}

/**
 * Global app header — single institutional top bar shared by every page
 * (landing, login, dashboard, compset, all report pages, future library).
 *
 * Layout
 * ──────
 *   [HotelVALORA logo] [workspace?] ............... [search?] [tier?] [notif?] [BIBLIOTECA] [ADMIN] [USUARIO]
 *
 * Mobile (<sm): the three nav buttons render icon-only as 40×40 squares
 * (comfortable tap targets) aligned right of the logo. Desktop (sm+): icon
 * + text. No hamburger — the three icons are always visible.
 *
 * Sticky top · tier badge auto-derives from `useAuth` · print-hidden.
 */

// Shared nav-button sizing: 40×40 icon square on mobile (≥40px tap target),
// icon + text with padding on sm+.
const NAV_BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-headline text-[13px] font-bold tracking-tight " +
  "h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5";

export function AppHeader({
  userHref,
  libraryHref = "/library/favorites-map",
  showTierBadge = true,
  workspaceSlot,
  searchSlot,
  notificationsSlot,
  className,
}: AppHeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const isLibraryActive = pathname?.startsWith("/library") ?? false;
  const isAdminActive = pathname?.startsWith("/user/admin") ?? false;
  // USUARIO is the single-click path to the institutional user area —
  // routes straight to the settings shell regardless of auth state.
  const resolvedUserHref = userHref ?? "/settings/profile";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-slate-200 bg-white print:hidden",
        className,
      )}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6">
        {/* LEFT — Logo + optional workspace selector */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="font-headline text-xl font-black tracking-tighter text-forest-900 transition-opacity hover:opacity-80"
            aria-label="HotelVALORA — Home"
          >
            HotelVALORA
          </Link>
          {workspaceSlot}
        </div>

        {/* RIGHT — Search + tier + notifications + library + admin + user */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {searchSlot}
          {showTierBadge && user && <TierBadge tier={user.tier} />}
          {notificationsSlot}

          <Link
            href={libraryHref}
            aria-current={isLibraryActive ? "page" : undefined}
            aria-label="Open Library"
            className={cn(
              NAV_BTN_BASE,
              isLibraryActive
                ? "bg-slate-900 text-white shadow-sm transition-transform active:scale-95"
                : "text-slate-600 transition-colors hover:bg-slate-100 hover:text-forest-900",
            )}
          >
            <BookOpen size={16} aria-hidden />
            <span className="hidden sm:inline">BIBLIOTECA</span>
          </Link>

          <Link
            href="/user/admin"
            aria-current={isAdminActive ? "page" : undefined}
            aria-label="Open Administrator section"
            className={cn(
              NAV_BTN_BASE,
              isAdminActive
                ? "bg-forest-900 text-lime-300 shadow-sm transition-transform active:scale-95"
                : "text-slate-600 transition-colors hover:bg-slate-100 hover:text-forest-900",
            )}
          >
            <Shield size={16} aria-hidden />
            <span className="hidden sm:inline">ADMIN</span>
          </Link>

          <Link
            href={resolvedUserHref}
            aria-label="Open user profile"
            className={cn(
              NAV_BTN_BASE,
              isLibraryActive || isAdminActive
                ? "border border-slate-900 bg-white text-slate-900 transition-transform hover:bg-slate-50 active:scale-95"
                : "bg-forest-900 text-white shadow-sm transition-all hover:brightness-110 active:scale-95",
            )}
          >
            <UserCircle size={16} aria-hidden />
            <span className="hidden sm:inline">USUARIO</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Tier badge ──────────────────────────────────────────────────────────────

const TIER_LABELS: Record<UserTier, string> = {
  free: "FREE",
  pro: "PRO",
  premium: "PREMIUM",
  team: "TEAM",
  enterprise: "ENTERPRISE",
};

const TIER_STYLES: Record<UserTier, string> = {
  free: "bg-slate-100 text-slate-600 border-slate-200",
  pro: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-emerald-50 text-emerald-700 border-emerald-200",
  team: "bg-indigo-50 text-indigo-700 border-indigo-200",
  enterprise: "bg-amber-50 text-amber-800 border-amber-200",
};

function TierBadge({ tier }: { tier: UserTier }) {
  return (
    <span
      className={cn(
        "hidden rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest md:inline-block",
        TIER_STYLES[tier],
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
