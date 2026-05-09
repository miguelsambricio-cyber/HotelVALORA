"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Hotel,
  Home,
  TrendingUp,
  BarChart3,
  Calculator,
  ArrowLeftRight,
  ClipboardList,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/assets/hotels", label: "Hotels", icon: Hotel },
  { href: "/dashboard/assets/flex-living", label: "Flex Living", icon: Home },
  { href: "/dashboard/valuations", label: "Valuations", icon: TrendingUp },
  { href: "/dashboard/underwriting", label: "Underwriting", icon: Calculator },
  { href: "/dashboard/market", label: "Market Intel", icon: BarChart3 },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/review", label: "Review Queue", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 border-r bg-card shrink-0">
      {/* Brand block removed — global AppHeader now carries the wordmark
          for the entire app. Sidebar starts with the navigation rail. */}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Settings */}
      <div className="border-t px-3 py-4">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
