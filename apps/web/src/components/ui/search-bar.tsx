"use client";

import {
  useRef,
  useState,
  useEffect,
  useId,
  type KeyboardEvent,
} from "react";
import { Search, Map, Loader2, X, Star, ArrowRight } from "lucide-react";
import { useHotelSearch } from "@/lib/hooks/use-hotel-search";
import type { HotelSearchHit } from "@/types/hotel-search";
import { cn } from "@/lib/utils";

// ── Props ─────────────────────────────────────────────────────────────────────

interface SearchBarProps {
  /** Called when user clicks a result row. */
  onSelect?: (hotel: HotelSearchHit) => void;
  /** Called when user presses Enter with no result selected, or clicks "Ver todos". */
  onViewAll?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

// ── Star rating display ───────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} estrellas`}>
      {Array.from({ length: rating }).map((_, i) => (
        <Star
          key={i}
          size={10}
          className="fill-amber-400 text-amber-400"
        />
      ))}
    </span>
  );
}

// ── Result item ───────────────────────────────────────────────────────────────

function ResultItem({
  hotel,
  isActive,
  id,
  onMouseEnter,
  onSelect,
}: {
  hotel: HotelSearchHit;
  isActive: boolean;
  id: string;
  onMouseEnter: () => void;
  onSelect: (h: HotelSearchHit) => void;
}) {
  return (
    <li
      id={id}
      role="option"
      aria-selected={isActive}
      onMouseEnter={onMouseEnter}
      onClick={() => onSelect(hotel)}
      className={cn(
        "flex items-center justify-between gap-4 px-5 py-3.5 cursor-pointer transition-colors",
        isActive ? "bg-slate-50" : "hover:bg-slate-50/60"
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold text-slate-800 text-sm truncate">{hotel.name}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {hotel.city}
          {hotel.operator ? ` · ${hotel.operator}` : ""}
          {hotel.country ? ` · ${hotel.country}` : ""}
        </p>
      </div>
      {hotel.star_rating != null && (
        <StarRating rating={hotel.star_rating} />
      )}
    </li>
  );
}

// ── SearchBar ─────────────────────────────────────────────────────────────────

export function SearchBar({
  onSelect,
  onViewAll,
  placeholder = "Nombre o dirección del hotel...",
  className,
}: SearchBarProps) {
  const uid = useId();
  const { query, setQuery, results, isLoading, isOpen, setIsOpen, clear } =
    useHotelSearch();

  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showDropdown = isOpen && (results.length > 0 || isLoading);
  const showEmpty = isOpen && !isLoading && query.trim().length > 0 && results.length === 0;

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsOpen]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && results.length) setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      } else if (query.trim()) {
        onViewAll?.(query);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  function handleSelect(hotel: HotelSearchHit) {
    onSelect?.(hotel);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  const listboxId = `${uid}-listbox`;
  const activeDescendant =
    activeIndex >= 0 ? `${uid}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* ── Input shell ─────────────────────────────────────────────────── */}
      <div className="backdrop-blur-md bg-white/60 border border-white/80 p-2 rounded-2xl shadow-[0_32px_64px_-12px_rgba(6,44,28,0.08)]">
        <div className="flex flex-col md:flex-row gap-2 bg-white/40 rounded-xl p-1">
          {/* Text field */}
          <label className="flex-grow flex items-center px-6 py-4 gap-4">
            {isLoading ? (
              <Loader2
                size={20}
                className="text-forest-700 shrink-0 animate-spin"
                aria-hidden
              />
            ) : (
              <Search size={20} className="text-slate-400 shrink-0" aria-hidden />
            )}

            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={showDropdown || showEmpty}
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={activeDescendant}
              aria-label="Buscar hotel"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (results.length > 0) setIsOpen(true);
              }}
              placeholder={placeholder}
              className="w-full bg-transparent border-none focus:ring-0 outline-none text-lg font-medium placeholder:text-slate-400 text-slate-800"
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
                <X size={16} />
              </button>
            )}
          </label>

          {/* Map action */}
          <div className="flex gap-2 p-1">
            <button
              type="button"
              aria-label="Ver en mapa"
              className="flex items-center justify-center aspect-square md:px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              <Map size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Results dropdown ─────────────────────────────────────────────── */}
      {(showDropdown || showEmpty) && (
        <div
          role="listbox"
          id={listboxId}
          aria-label="Resultados de búsqueda"
          className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50"
        >
          {showDropdown && (
            <ul>
              {results.map((hotel, i) => (
                <ResultItem
                  key={hotel.id}
                  id={`${uid}-option-${i}`}
                  hotel={hotel}
                  isActive={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onSelect={handleSelect}
                />
              ))}
            </ul>
          )}

          {showEmpty && (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              No se encontraron hoteles para{" "}
              <span className="font-semibold text-slate-600">
                &ldquo;{query}&rdquo;
              </span>
            </div>
          )}

          {onViewAll && results.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onViewAll(query);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-forest-700 bg-slate-50 border-t border-slate-100 hover:bg-slate-100 transition-colors"
            >
              <span>Ver todos los resultados para &ldquo;{query}&rdquo;</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
