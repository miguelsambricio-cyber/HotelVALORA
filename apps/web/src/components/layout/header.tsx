"use client";

import { Bell, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function Header() {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b bg-card shrink-0">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-1.5 w-72">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          className="bg-transparent text-sm placeholder:text-muted-foreground outline-none w-full"
          placeholder="Search hotels, valuations…"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
          MV
        </div>
      </div>
    </header>
  );
}
