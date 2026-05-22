"use client";

/**
 * CompsetMapGL · institutional Mapbox surface for /compset (Production
 * + Preview) and /report/*.
 *
 * Phase 2.B (2026-05-22) · AVUXI is now wired DIRECTLY into the main
 * /compset render path · operator directive "pasa a incluir los
 * cambios en los mapas de hotelvalora/compset". The bare validation
 * surface (CompsetAvuxiPure) was retired · all of /compset's HV UI
 * (CompetitorPanel · AssetSelectionPanel · pins · MapLegend · zoom
 * controls) stays in place · AVUXI mounts as an additional layer
 * stack ON TOP of the same <Map>.
 *
 * Flag contract (NEXT_PUBLIC_AVUXI_ENABLED, parent passes via `avuxi`):
 *
 *   avuxi=false  (Production today · default)
 *     · Manual heatmap (MapHeatmapLayer · TOURIST_HEATMAP_DATA)
 *     · Manual metro    (MapMetroLayer · METRO_LINE_DATA)
 *     · Centro Histórico polygon (MapPolygonLayer · HV-native)
 *     · No AVUXI script · no AVUXI fetches · zero footprint
 *
 *   avuxi=true   (Preview today · Production once operator flips it)
 *     · AVUXI script injected · mapStart called with the 4-arg signature
 *       (mapInstance, mapboxgl, scriptId, options) identical to the
 *       /experiment-avuxi reference implementation
 *     · AVUXI heatmap + transit + stations replace the manual layers
 *     · Centro Histórico polygon STILL renders · HV-native · unaffected
 *     · AVUXI native UI (vertical button strip top-right) is left visible
 *       for now · Phase 2.C will replace it with the HV CAPAS panel
 *
 * Reliability notes (post-crashes 2026-05-21):
 *   · The Map element gets an explicit `id="hv-compset-mapbox-map"` so
 *     the AVUXI SDK's first call `map.getContainer().id` returns a
 *     populated string · without this AVUXI no-ops silently.
 *   · mapboxgl is exposed on `window.mapboxgl` because the AVUXI SDK
 *     references it internally.
 *   · The AVUXI script is injected once per session (idempotent · reuses
 *     in-flight script tag) and we poll for `window.AVUXI` before
 *     declaring ready · matches the experiment-avuxi pattern.
 *   · `mapStart` is called via setTimeout polling instead of
 *     `map.once("load", …)` to avoid the listener-ordering issues that
 *     crashed earlier iterations.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import Map from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { HeatmapCategory } from "@/types/compset";

import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/maps/map-config";
import {
  TOURIST_HEATMAP_DATA,
  METRO_LINE_DATA,
  HISTORIC_CENTER_POLYGON,
} from "@/lib/maps/geo-data";
import { AVUXI_SCRIPT_ID, AVUXI_SCRIPT_URL } from "@/lib/maps/avuxi";
import type { MapViewport } from "@/lib/maps/types";
import type { CompetitorHotel, MapLayer } from "@/types/compset";

import { HotelMarker }      from "./hotel-marker";
import { MapHeatmapLayer }  from "./map-heatmap-layer";
import { MapMetroLayer }    from "./map-metro-layer";
import { MapPolygonLayer }  from "./map-polygon-layer";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CompsetMapGLBaseProps {
  viewState: MapViewport;
  onViewStateChange: (vs: MapViewport) => void;
  layers: MapLayer[];
  /** Phase 2.B feature flag · NEXT_PUBLIC_AVUXI_ENABLED (parent reads env).
   *  When true · AVUXI is injected onto this map · manual heatmap + metro
   *  layers are skipped. Centro Histórico polygon stays HV-native in both
   *  states. Defaults to false (Production behavior unchanged). */
  avuxi?: boolean;
}

interface CompsetMapGLAnalysisProps extends CompsetMapGLBaseProps {
  mode?: "analysis";
  referenceHotel: CompetitorHotel;
  competitors: CompetitorHotel[];
  suggested: CompetitorHotel[];
  /** Optional · /compset panel-sync contract. When provided:
   *   · pins switch to direct-click-no-popup behavior (same as explore)
   *   · matching pin gets the inspected halo
   *   · parent owns inspectedHotelId state · panel reacts in sync
   *  Standalone embedded usages (report-map.tsx) omit this prop so the
   *  KPI popup behavior is preserved where there's no side panel. */
  onPinClick?: (hotelId: string) => void;
  inspectedHotelId?: string | null;
}

interface CompsetMapGLExploreProps extends CompsetMapGLBaseProps {
  mode: "explore";
  /** All hotels rendered as uniform pins when no subject is selected. */
  exploreHotels: CompetitorHotel[];
  /** Direct pin click handler · NO popup · parent owns two-click
   *  inspect/commit state. Receives the clicked hotel id. */
  onPinClick: (hotelId: string) => void;
  /** When set, the matching pin gets the inspect halo (glow + scale). */
  inspectedHotelId?: string | null;
}

export type CompsetMapGLProps = CompsetMapGLAnalysisProps | CompsetMapGLExploreProps;

// ── Token fallback ────────────────────────────────────────────────────────────

function TokenMissing() {
  return (
    <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-3 text-center px-6">
      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
        Map integration pending
      </p>
      <p className="font-mono text-[11px] leading-relaxed text-slate-600 max-w-sm">
        Live cartography integration in progress · the CompSet workspace
        will surface the interactive Madrid Centro map once the
        production map provider is wired.
      </p>
    </div>
  );
}

// ── CompsetMapGL ──────────────────────────────────────────────────────────────

export function CompsetMapGL(props: CompsetMapGLProps) {
  const { viewState, onViewStateChange, layers } = props;
  const mapRef = useRef<MapRef>(null);
  const [popupHotelId, setPopupHotelId] = useState<string | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // AVUXI lifecycle state · same naming as /experiment-avuxi
  const [avuxiScriptReady, setAvuxiScriptReady] = useState(false);
  const [avuxiMapStartStatus, setAvuxiMapStartStatus] =
    useState<"idle" | "called" | "error">("idle");
  const [mapReady, setMapReady] = useState(false);

  const avuxi = props.avuxi ?? false;

  // QA #002 active diagnostic · server-side probe Mapbox endpoints from
  // the browser to surface 401/403/CORS/network failures visibly.
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    let cancelled = false;
    const probes = [
      { name: "style.json", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${MAPBOX_TOKEN}` },
      { name: "tile", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/14/8044/6212?access_token=${MAPBOX_TOKEN}` },
    ];
    (async () => {
      const results: string[] = [];
      for (const p of probes) {
        try {
          const r = await fetch(p.url, { method: "GET", mode: "cors" });
          results.push(`${p.name}=${r.status}`);
        } catch (e) {
          results.push(`${p.name}=ERR:${(e as Error).message?.slice(0, 40) ?? "unknown"}`);
        }
      }
      if (!cancelled) {
        // eslint-disable-next-line no-console
        console.log("[mapbox-probe]", results.join(" · "));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // AVUXI · expose mapboxgl on window (SDK references window.mapboxgl)
  useEffect(() => {
    if (!avuxi) return;
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).mapboxgl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mapboxgl = mapboxgl;
    }
  }, [avuxi]);

  // AVUXI · inject script once per session · poll for window.AVUXI on onload
  useEffect(() => {
    if (!avuxi) return;
    if (typeof window === "undefined") return;
    if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
      setAvuxiScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${AVUXI_SCRIPT_URL}"]`,
    );
    const onScriptReady = () => {
      let attempts = 0;
      const probe = window.setInterval(() => {
        attempts++;
        if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
          window.clearInterval(probe);
          setAvuxiScriptReady(true);
        } else if (attempts >= 30) {
          window.clearInterval(probe);
          // eslint-disable-next-line no-console
          console.error("[avuxi] window.AVUXI never appeared after 3s");
        }
      }, 100);
    };
    if (existing) {
      onScriptReady();
      return;
    }
    const script = document.createElement("script");
    script.src = AVUXI_SCRIPT_URL;
    script.async = true;
    script.onload = onScriptReady;
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[avuxi] script failed to load");
    };
    document.body.appendChild(script);
  }, [avuxi]);

  // AVUXI · callMapStart with same guards as experiment-avuxi
  const callAvuxiMapStart = useCallback(() => {
    if (avuxiMapStartStatus !== "idle") return false;
    if (typeof window === "undefined") return false;
    if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") return false;
    const ref = mapRef.current;
    if (!ref) return false;
    const mapInstance = ref.getMap();
    if (!mapInstance) return false;
    if (typeof mapInstance.loaded === "function" && !mapInstance.loaded()) return false;
    try {
      // eslint-disable-next-line no-console
      console.log(
        "[avuxi] calling AVUXI.mapStart · container id:",
        mapInstance.getContainer()?.id || "(empty)",
      );
      window.AVUXI.mapStart(mapInstance, mapboxgl, AVUXI_SCRIPT_ID, {
        buttonOrientation: "vertical",
        buttonLocation: "tr",
        buttonBackgroundColor: "#ffffff",
        buttonForegroundColor: "#0E4B31",
        showLegend: true,
        language: "es",
        showMetro: true,
        // sightseeing must match the CAPAS heatmap.category default so
        // React's tracked-intent refs start aligned with AVUXI's actual
        // initial state. Mismatching here triggers a spurious first click.
        defaultCategory: "sightseeing",
        opacity: 60,
      });
      setAvuxiMapStartStatus("called");
      // eslint-disable-next-line no-console
      console.log("[avuxi] AVUXI.mapStart returned · awaiting fetches");
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[avuxi] mapStart threw:", e);
      setAvuxiMapStartStatus("error");
      return false;
    }
  }, [avuxiMapStartStatus]);

  // AVUXI · auto-fire when preconditions met
  useEffect(() => {
    if (!avuxi) return;
    if (avuxiMapStartStatus !== "idle") return;
    if (!avuxiScriptReady) return;
    if (!mapReady) return;
    callAvuxiMapStart();
  }, [avuxi, avuxiScriptReady, mapReady, avuxiMapStartStatus, callAvuxiMapStart]);

  // AVUXI · hide native UI · CAPAS panel is the only end-user control surface.
  // The native button container class is `.category-control-container` ·
  // confirmed via experiment-avuxi v9 inspector. Hiding it does NOT break
  // programmatic .click() on its descendants (the click delegation effects
  // below still fire correctly on display:none buttons).
  useEffect(() => {
    if (!avuxi) return;
    if (typeof document === "undefined") return;
    const STYLE_ID = "hv-avuxi-hide-native";
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .category-control-container {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
  }, [avuxi]);

  // ─── AVUXI sync · tracked-intent refs ────────────────────────────────
  // We do NOT trust an "active-class" regex against AVUXI's DOM · the
  // exact class name has never been confirmed and earlier guesses were
  // wrong (caused the symptoms reported 2026-05-22: CAPAS OFF but
  // heatmap still visible · CAPAS Metro ON but no lines rendered).
  //
  // Instead we treat AVUXI as an opaque state machine, track what WE
  // believe its current state is (refs below), and click only when the
  // intent differs. AVUXI's free-tier single-category model implies:
  //   · click category Y while X is active  → AVUXI swaps to Y
  //   · click currently-active category     → AVUXI deactivates it
  //   · click metro                          → AVUXI toggles its metro layer
  //
  // Initial-state alignment relies on `defaultCategory: "sightseeing"`
  // in mapStart (matches CAPAS heatmap default) and the assumption that
  // AVUXI's metro layer defaults to OFF (verified by operator report
  // 2026-05-22: metro not rendered until activated).
  const avuxiHeatmapRef = useRef<{ enabled: boolean; category: HeatmapCategory }>({
    enabled: true,
    category: "sightseeing",
  });
  const avuxiMetroRef = useRef<boolean>(false);

  // After mapStart returns, AVUXI injects its buttons asynchronously
  // into the DOM. Wait for them via MutationObserver before declaring
  // ready. On first appearance we also dump the full DOM signature of
  // every category-related element so the operator can verify our
  // selectors and active-class assumptions in DevTools.
  const [avuxiDomReady, setAvuxiDomReady] = useState(false);
  useEffect(() => {
    if (!avuxi) return;
    if (avuxiMapStartStatus !== "called") return;
    if (typeof document === "undefined") return;

    const dumpDomSignature = () => {
      const all = document.querySelectorAll<HTMLElement>(
        "[class*='category-btn-container-'], " +
          "[class*='category-btn-t-container-'], " +
          "[id^='category-control-container-metro-button'], " +
          "[id^='category-control-container']",
      );
      // eslint-disable-next-line no-console
      console.log(
        `[avuxi-dom] ready · ${all.length} AVUXI-related elements:`,
      );
      Array.from(all).forEach((el, i) => {
        // eslint-disable-next-line no-console
        console.log(
          `[avuxi-dom][${i}] tag=${el.tagName.toLowerCase()} ` +
            `id="${el.id}" class="${el.className}"`,
        );
      });
    };

    const found = () => {
      const probe = document.querySelector(
        "[class*='category-btn-container-'], [class*='category-btn-t-container-']",
      );
      return Boolean(probe);
    };

    if (found()) {
      dumpDomSignature();
      setAvuxiDomReady(true);
      return;
    }

    const observer = new MutationObserver(() => {
      if (found()) {
        dumpDomSignature();
        setAvuxiDomReady(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [avuxi, avuxiMapStartStatus]);

  // Find an AVUXI category button for a given category name. Tries both
  // selector variants we know AVUXI uses (heatmap + transport).
  const findCategoryButton = useCallback(
    (category: HeatmapCategory): HTMLElement | null => {
      return document.querySelector<HTMLElement>(
        `[class*='category-btn-container-${category}'], ` +
          `[class*='category-btn-t-container-${category}']`,
      );
    },
    [],
  );

  // Sync helper · logs the click intent + the affected button's classList
  // before AND after the click (with a 300 ms delay) so we can see what
  // AVUXI does in response. This is the canonical diagnostic when the
  // user reports sync misbehaviour.
  const clickAndLog = useCallback(
    (label: string, btn: HTMLElement | null) => {
      if (!btn) {
        // eslint-disable-next-line no-console
        console.warn(`[avuxi-sync] ${label} · button NOT found in DOM`);
        return;
      }
      const before = btn.className;
      // eslint-disable-next-line no-console
      console.log(
        `[avuxi-sync] ${label} · clicking · before classList:`,
        before,
      );
      btn.click();
      window.setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log(
          `[avuxi-sync] ${label} · 300ms after click · after classList:`,
          btn.className,
        );
      }, 300);
    },
    [],
  );

  // AVUXI · CAPAS heatmap → AVUXI category (tracked-intent)
  useEffect(() => {
    if (!avuxi) return;
    if (!avuxiDomReady) return;
    const heatmapLayer = layers.find((l) => l.id === "heatmap");
    if (!heatmapLayer || heatmapLayer.id !== "heatmap") return;

    const current = avuxiHeatmapRef.current;
    const desired = {
      enabled: heatmapLayer.enabled,
      category: heatmapLayer.category,
    };

    // Case 0 · already in sync
    if (
      current.enabled === desired.enabled &&
      current.category === desired.category
    ) {
      return;
    }

    // Case A · turning OFF (was enabled, want disabled) → click currently-active
    if (current.enabled && !desired.enabled) {
      clickAndLog(
        `heatmap OFF (deactivate ${current.category})`,
        findCategoryButton(current.category),
      );
      avuxiHeatmapRef.current = { enabled: false, category: current.category };
      return;
    }

    // Case B · turning ON from OFF → click desired category
    if (!current.enabled && desired.enabled) {
      clickAndLog(
        `heatmap ON (activate ${desired.category})`,
        findCategoryButton(desired.category),
      );
      avuxiHeatmapRef.current = { enabled: true, category: desired.category };
      return;
    }

    // Case C · switching categories (both ON, different category) → click new
    if (current.enabled && desired.enabled && current.category !== desired.category) {
      clickAndLog(
        `heatmap SWITCH ${current.category} → ${desired.category}`,
        findCategoryButton(desired.category),
      );
      avuxiHeatmapRef.current = { enabled: true, category: desired.category };
      return;
    }
  }, [avuxi, avuxiDomReady, layers, findCategoryButton, clickAndLog]);

  // AVUXI · CAPAS Metro → AVUXI metro layer (tracked-intent)
  useEffect(() => {
    if (!avuxi) return;
    if (!avuxiDomReady) return;
    const metroLayer = layers.find((l) => l.id === "metro");
    if (!metroLayer) return;

    if (avuxiMetroRef.current === metroLayer.enabled) return;

    const btn = document.querySelector<HTMLElement>(
      "[id^='category-control-container-metro-button']",
    );
    clickAndLog(
      `metro ${avuxiMetroRef.current ? "ON" : "OFF"} → ${
        metroLayer.enabled ? "ON" : "OFF"
      }`,
      btn,
    );
    avuxiMetroRef.current = metroLayer.enabled;
  }, [avuxi, avuxiDomReady, layers, clickAndLog]);

  if (!MAPBOX_TOKEN) return <TokenMissing />;

  const heatmapLayer     = layers.find((l) => l.id === "heatmap");
  const heatmapEnabled   = heatmapLayer?.enabled ?? false;
  const heatmapCategory  =
    heatmapLayer && heatmapLayer.id === "heatmap"
      ? heatmapLayer.category
      : "sightseeing";
  const metroEnabled     = layers.find((l) => l.id === "metro")?.enabled     ?? false;
  const historicoEnabled = layers.find((l) => l.id === "historico")?.enabled ?? false;

  function handleMapClick(e: MapMouseEvent) {
    // Deselect popup when clicking on empty map area
    if (!(e.originalEvent.target as HTMLElement).closest(".hotel-popup")) {
      setPopupHotelId(null);
    }
  }

  const isExplore = props.mode === "explore";

  return (
    <>
    {/* QA #002 diagnostic banner · visible to operator without DevTools. */}
    {(diagnosticError || !styleLoaded) && (
      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[60] max-w-[90%]">
        <div className={diagnosticError
          ? "pointer-events-auto bg-rose-50 border border-rose-300 text-rose-900 text-[11px] font-mono px-3 py-2 rounded-md shadow-lg"
          : "pointer-events-auto bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-mono px-3 py-1.5 rounded-md shadow-md opacity-80"
        }>
          {diagnosticError ? `Mapbox error: ${diagnosticError}` : "Map style loading…"}
        </div>
      </div>
    )}
    <Map
      id="hv-compset-mapbox-map"
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      longitude={viewState.longitude}
      latitude={viewState.latitude}
      zoom={viewState.zoom}
      pitch={viewState.pitch}
      bearing={viewState.bearing}
      onMove={(e) =>
        onViewStateChange({
          longitude: e.viewState.longitude,
          latitude:  e.viewState.latitude,
          zoom:      e.viewState.zoom,
          pitch:     e.viewState.pitch,
          bearing:   e.viewState.bearing,
        })
      }
      onClick={handleMapClick}
      onLoad={() => {
        // eslint-disable-next-line no-console
        console.log("[mapbox-gl] map loaded");
        setMapReady(true);
      }}
      onStyleData={() => {
        if (!styleLoaded) {
          setStyleLoaded(true);
          // eslint-disable-next-line no-console
          console.log("[mapbox-gl] style data loaded");
        }
      }}
      onError={(e) => {
        const msg = e?.error?.message ?? "unknown error";
        // eslint-disable-next-line no-console
        console.error("[mapbox-gl]", e?.error ?? e);
        setDiagnosticError(msg);
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAPBOX_STYLE}
      attributionControl={false}
      reuseMaps
    >
      {/* ── GL Layers · Phase 2.B (2026-05-22) ─────────────────────────────
       *  When avuxi=false (Production today): manual heatmap + metro +
       *    historic polygon render as before · zero behavior change.
       *  When avuxi=true (Preview · Production once operator flips flag):
       *    AVUXI replaces the manual heatmap + metro layers · the historic
       *    polygon STILL renders · HV-native · independent of AVUXI. */}
      {/* Manual fallback heatmap only renders when AVUXI is OFF and the
       *  CAPAS heatmap is set to "sightseeing" · we have no manual data
       *  for eating / shopping / nightlife / transport · those four
       *  categories render nothing in flag-OFF mode (rollback only · the
       *  Production flag is ON since Phase 2.B). */}
      {!avuxi && heatmapEnabled && heatmapCategory === "sightseeing" && (
        <MapHeatmapLayer data={TOURIST_HEATMAP_DATA} />
      )}
      {!avuxi && metroEnabled   && <MapMetroLayer    data={METRO_LINE_DATA}     />}
      {historicoEnabled         && <MapPolygonLayer  data={HISTORIC_CENTER_POLYGON} />}

      {isExplore ? (
        /* ── Explore mode · uniform pins · two-click pattern via onPinClick ── */
        props.exploreHotels.map((hotel) => (
          <HotelMarker
            key={hotel.id}
            hotel={hotel}
            type="explore"
            isSelected={false}
            onSelect={() => { /* unused in explore mode */ }}
            isInspected={props.inspectedHotelId === hotel.id}
            onPinClick={props.onPinClick}
          />
        ))
      ) : (
        <>
          <HotelMarker
            hotel={props.referenceHotel}
            type="reference"
            isSelected={popupHotelId === props.referenceHotel.id}
            onSelect={setPopupHotelId}
            onPinClick={props.onPinClick}
          />
          {props.competitors.map((hotel) => (
            <HotelMarker
              key={hotel.id}
              hotel={hotel}
              type="competitor"
              isSelected={popupHotelId === hotel.id}
              onSelect={setPopupHotelId}
              isInspected={props.inspectedHotelId === hotel.id}
              onPinClick={props.onPinClick}
            />
          ))}
          {props.suggested.map((hotel) => (
            <HotelMarker
              key={hotel.id}
              hotel={hotel}
              type="suggested"
              isSelected={popupHotelId === hotel.id}
              onSelect={setPopupHotelId}
              isInspected={props.inspectedHotelId === hotel.id}
              onPinClick={props.onPinClick}
            />
          ))}
        </>
      )}
    </Map>
    </>
  );
}
