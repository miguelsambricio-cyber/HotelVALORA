"use client";

import { useRef, useEffect, type KeyboardEvent } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useHotelSearch } from "@/lib/hooks/use-hotel-search";
import type { HotelSearchHit } from "@/types/hotel-search";
import { cn } from "@/lib/utils";

/**
 * Compact search input designed to live INSIDE the `/compset` asset-
 * selection panel header (panel width ≈ 288px). Mirrors the canonical
 * search semantics from the hero search bar (token-tolerant query
 * against the Madrid registry · name / brand / operator / district /
 * address) but in a single-line dense form factor with an inline
 * dropdown that floats below the input.
 *
 * Selecting a result triggers `onSelectHotel(hotel)` · the caller is
 * responsible for routing the page (typically to `/compset?ref=<id>`).
 */

interface PanelSearchBarProps {
  /** Fired when the user picks a result from the dropdown. */
  onSelectHotel: (hotel: HotelSearchHit) => void;
  placeholder?: string;
  className?: string;
}

export function PanelSearchBar({
  onSelectHotel,
  placeholder = "Hotel · mercado · dirección...",
  className,
}: PanelSearchBarProps) {
  const { query, setQuery, results, isLoading, isOpen, setIsOpen, clear } =
    useHotelSearch();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showDropdown = isOpen && (results.length > 0 || isLoading);
  const showEmpty =
    isOpen && !isLoading && query.trim().length > 0 && results.length === 0;

  // Close dropdown when clicking outside the panel search container.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  function handleSelect(hotel: HotelSearchHit) {
    onSelectHotel(hotel);
    clear();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0]);
    } else if (e.key === "Escape") {
      clear();
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input shell */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200/80 shadow-sm px-2.5 py-1.5">
        {isLoading ? (
          <Loader2
            size={14}
            className="text-forest-700 shrink-0 animate-spin"
            aria-hidden
          />
        ) : (
          <Search size={14} className="text-slate-400 shrink-0" aria-hidden />
        )}
        <input
          ref={inputRef}
          type="text"
          aria-label="Buscar hotel, mercado o dirección"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:ring-0 outline-none text-[12px] font-medium placeholder:text-slate-400 text-slate-800"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Borrar búsqueda"
            className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {(showDropdown || showEmpty) && (
        <div
          role="listbox"
          aria-label="Resultados de búsqueda"
          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200/80 overflow-hidden z-40 max-h-72 overflow-y-auto"
        >
          {showDropdown && (
            <ul>
              {results.slice(0, 6).map((hotel) => (
                <li
                  key={hotel.id}
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(hotel)}
                  className="px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <p className="font-semibold text-slate-800 text-[12px] truncate leading-tight">
                    {hotel.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {hotel.city}
                    {hotel.operator ? ` · ${hotel.operator}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {showEmpty && (
            <p className="px-3 py-4 text-center text-[11px] text-slate-400">
              Sin resultados para{" "}
              <span className="font-semibold text-slate-600">
                &ldquo;{query}&rdquo;
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
