"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Shield, UserCircle, Menu, X } from "lucide-react";
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
  /**
   * Mobile navigation pattern. `"inline"` (default · unchanged for every
   * existing consumer) keeps the icon-only Biblioteca/Admin/Usuario buttons.
   * `"menu"` (landing) collapses Biblioteca + Admin into a hamburger dropdown
   * on mobile and keeps Usuario as a labelled pill · desktop identical in
   * both modes. (Mike's landing nav requirement.)
   */
  mobileNav?: "inline" | "menu";
}

/**
 * Global app header — single institutional top bar shared by every page
 * (landing, login, dashboard, compset, all report pages, future library).
 *
 * Layout
 * ──────
 *   [HotelVALORA logo] [workspace?] ............... [search?] [tier?] [notif?] [BIBLIOTECA] [USUARIO]
 *
 * Sticky top so scroll keeps the bar visible without removing it from the
 * document flow — saves every consumer from `pt-X` compensation hacks the
 * old `fixed top-0` pattern required.
 *
 * Tier badge auto-derives from `useAuth` — no caller needs to pass it.
 *
 * Print-hidden by design.
 */
export function AppHeader({
  userHref,
  libraryHref = "/library/favorites-map",
  showTierBadge = true,
  workspaceSlot,
  searchSlot,
  notificationsSlot,
  className,
  mobileNav = "inline",
}: AppHeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMenuMode = mobileNav === "menu";
  const isLibraryActive = pathname?.startsWith("/library") ?? false;
  const isAdminActive = pathname?.startsWith("/user/admin") ?? false;
  // USUARIO is the single-click path to the institutional user area —
  // routes straight to the settings shell regardless of auth state.
  // Unauthenticated visitors land on the same page (mock auth, no gate);
  // future auth wire-up can put a redirect-to-login on the page itself.
  const resolvedUserHref = userHref ?? "/settings/profile";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-slate-200 bg-white print:hidden",
        className,
      )}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-4 px-6 py-2.5">
        {/* LEFT — Logo + optional workspace selector */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="font-headline text-xl font-black tracking-tighter text-forest-900 transition-opacity hover:opacity-80"
            aria-label="HotelVALORA — Home"
          >
            HotelVALORA
          </Link>
          {workspaceSlot}
        </div>

        {/* RIGHT — Search + tier + notifications + library + user */}
        <div className="flex items-center gap-2 sm:gap-3">
          {searchSlot}
          {showTierBadge && user && <TierBadge tier={user.tier} />}
          {notificationsSlot}

          <Link
            href={libraryHref}
            aria-current={isLibraryActive ? "page" : undefined}
            className={cn(
              "items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3",
              "font-headline text-[13px] font-bold tracking-tight",
              // menu mode → collapse into the hamburger on mobile
              isMenuMode ? "hidden md:flex" : "flex",
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
            className={cn(
              "items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3",
              "font-headline text-[13px] font-bold tracking-tight",
              isMenuMode ? "hidden md:flex" : "flex",
              isAdminActive
                ? "bg-forest-900 text-lime-300 shadow-sm transition-transform active:scale-95"
                : "text-slate-600 transition-colors hover:bg-slate-100 hover:text-forest-900",
            )}
            aria-label="Open Administrator section"
          >
            <Shield size={16} aria-hidden />
            <span className="hidden sm:inline">ADMIN</span>
          </Link>

          <Link
            href={resolvedUserHref}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3",
              "font-headline text-[13px] font-bold tracking-tight",
              isLibraryActive || isAdminActive
                ? "border border-slate-900 bg-white text-slate-900 transition-transform hover:bg-slate-50 active:scale-95"
                : "bg-forest-900 text-white shadow-sm transition-all hover:brightness-110 active:scale-95",
            )}
            aria-label="Open user profile"
          >
            <UserCircle size={16} aria-hidden />
            {/* menu mode keeps the label on mobile (the "Usuario" pill) */}
            <span className={isMenuMode ? "inline" : "hidden sm:inline"}>USUARIO</span>
          </Link>

          {/* Hamburger — menu mode, mobile only */}
          {isMenuMode && (
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              className="flex md:hidden h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-forest-900 transition-colors"
            >
              {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown — menu mode only · holds the nav links */}
      {isMenuMode && menuOpen && (
        <nav
          className="md:hidden border-t border-slate-200 bg-white px-6 py-2"
          aria-label="Navegación principal"
        >
          <Link
            href={libraryHref}
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-3 font-headline text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-forest-900"
          >
            <BookOpen size={18} aria-hidden />
            BIBLIOTECA
          </Link>
          <Link
            href="/user/admin"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-3 font-headline text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-forest-900"
          >
            <Shield size={18} aria-hidden />
            ADMIN
          </Link>
        </nav>
      )}
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
