"use client";

import {
  useRef,
  useState,
  useEffect,
  useId,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
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
  /** Called when user clicks the map button. */
  onMapView?: () => void;
  placeholder?: string;
  className?: string;
  /**
   * When true, the text field and the map button stay on the SAME ROW at
   * every width (input flex:1 · map button fixed 48×48 square). Default
   * false preserves the legacy responsive stack (map button drops below
   * the input on mobile) used by the /compset panel search. The landing
   * hero opts in. (Mike's hard requirement #1.)
   */
  mapAlwaysInline?: boolean;
  /**
   * When true, the results dropdown is rendered in a PORTAL to <body> with
   * `position: fixed`, anchored to the input's bounding box. This makes it a
   * true floating overlay that escapes EVERY ancestor clip in the page tree
   * (overflow:hidden/clip/auto, fixed heights, justify-between distribution,
   * transform/filter containing-blocks). The landing hero opts in — its
   * search lives inside a height-distributed `landing-main` that clipped the
   * legacy `absolute` dropdown on mobile. Default false keeps the legacy
   * in-flow `absolute` dropdown used by the /compset panel search.
   */
  overlayDropdown?: boolean;
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
  onMapView,
  placeholder = "Nombre o dirección del hotel...",
  className,
  mapAlwaysInline = false,
  overlayDropdown = false,
}: SearchBarProps) {
  const uid = useId();
  const { query, setQuery, results, isLoading, isOpen, setIsOpen, clear } =
    useHotelSearch();

  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Portaled dropdown lives outside the container tree, so its own ref is
  // needed for the outside-click test (otherwise clicking a result closes it).
  const dropdownRef = useRef<HTMLDivElement>(null);

  const showDropdown = isOpen && (results.length > 0 || isLoading);
  const showEmpty = isOpen && !isLoading && query.trim().length > 0 && results.length === 0;

  // ── Portal/overlay geometry ────────────────────────────────────────────────
  // Mounted gate: createPortal needs `document`, absent during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [overlayRect, setOverlayRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const overlayOpen = overlayDropdown && (showDropdown || showEmpty);

  // Anchor the fixed overlay to the input shell. The `!overlayRect` null-gate
  // in render avoids any mispositioned flash, so useEffect timing suffices.
  // Recompute on scroll/resize while open.
  useEffect(() => {
    if (!overlayOpen) return;
    const measure = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setOverlayRect({ top: r.bottom + 12, left: r.left, width: r.width });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [overlayOpen, results.length, showEmpty]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Close on outside click — accounts for the portaled dropdown living
  // outside the container's DOM subtree.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !containerRef.current?.contains(t) &&
        !dropdownRef.current?.contains(t)
      ) {
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
      <div className="glass-effect p-1.5 rounded-2xl shadow-[0_20px_40px_-12px_rgba(6,44,28,0.08)] border border-white">
        <div
          className={cn(
            "flex gap-1 bg-white/40 rounded-xl p-1",
            mapAlwaysInline ? "flex-row items-center" : "flex-col md:flex-row",
          )}
        >
          {/* Text field */}
          <label className="flex-grow min-w-0 flex items-center px-4 sm:px-5 py-3 gap-3">
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
              className="w-full bg-transparent border-none focus:ring-0 outline-none text-base font-medium placeholder:text-slate-400 text-slate-800"
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
          <div className={cn("flex gap-1 p-0.5", mapAlwaysInline ? "shrink-0" : "")}>
            <button
              type="button"
              aria-label="Ver en mapa"
              onClick={onMapView}
              className={cn(
                "flex items-center justify-center bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors",
                mapAlwaysInline ? "h-12 w-12" : "h-10 w-10",
              )}
            >
              <Map size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Results dropdown ─────────────────────────────────────────────── */}
      {/* Inner content is identical for both render modes. */}
      {(() => {
        if (!(showDropdown || showEmpty)) return null;

        const dropdownInner = (
          <>
            {showDropdown && (
              // Cap at ~5 rows (≈66px each) then scroll inside the list. The
              // "ver todos" button below stays pinned (it's outside this <ul>).
              <ul className="max-h-[330px] overflow-y-auto overscroll-contain">
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
          </>
        );

        // Overlay mode (landing): portal to <body>, position: fixed anchored to
        // the input box → escapes every ancestor clip. z above all page chrome.
        if (overlayDropdown) {
          if (!mounted || !overlayRect) return null;
          return createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              id={listboxId}
              aria-label="Resultados de búsqueda"
              style={{
                position: "fixed",
                top: overlayRect.top,
                left: overlayRect.left,
                width: overlayRect.width,
                zIndex: 1000,
              }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden"
            >
              {dropdownInner}
            </div>,
            document.body,
          );
        }

        // Legacy in-flow mode (/compset panel): absolute, relative to container.
        return (
          <div
            ref={dropdownRef}
            role="listbox"
            id={listboxId}
            aria-label="Resultados de búsqueda"
            className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden z-50"
          >
            {dropdownInner}
          </div>
        );
      })()}
    </div>
  );
}
