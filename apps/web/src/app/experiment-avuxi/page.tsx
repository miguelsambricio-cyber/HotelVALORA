"use client";

/**
 * /experiment-avuxi · v3 · evidence-gathering environment.
 *
 * Operator demand (2026-05-21): concrete visual proof that AVUXI is
 * RENDERING DATA, not merely loading the SDK. v2 surfaced toggles + a
 * source table; v3 surfaces:
 *
 *   1. Real network requests to *.avuxi.com (PerformanceObserver) ·
 *      live list with URL + status hint + timing.
 *   2. Real mapbox-gl sources & layers injected by AVUXI · diffed
 *      against the pre-AVUXI baseline · live count.
 *   3. Real DOM elements mounted by the AVUXI SDK · counted via
 *      MutationObserver on the known class hooks (category-control-
 *      container · category-btn · etc.).
 *   4. Programmatic category trigger · clicks each AVUXI category
 *      button sequentially so the operator sees Eating · Sightseeing ·
 *      Shopping · Nightlife · Parks · Transit rendered without
 *      hunting for AVUXI's button group.
 *   5. Per-category snapshot · counts captured after each click so we
 *      can confirm each category produced real layers + real network
 *      activity.
 *
 * Endpoints confirmed in the SDK source (from minified bundle audit):
 *   api.avuxi.com · topplaces.avuxi.com
 *
 * DOM hooks confirmed in the SDK source:
 *   .category-control-container · .category-btns-container ·
 *   .category-btns-group · .category-btn · .category-btn-popover ·
 *   .category-legend · .vxcaption (.show .hide .wave .content .close)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Map, { type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/maps/map-config";
import { ALL_MADRID_AS_COMPETITORS } from "@/lib/api/compset";
import { HotelMarker } from "@/components/maps/hotel-marker";
import { LandingHeader } from "@/components/landing/landing-header";
import { cn } from "@/lib/utils";

const AVUXI_ACCOUNT_ID = "67d80ff2-d56c-4d93-ab90-87e4f8abd043";
const AVUXI_SCRIPT_URL =
  "https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js";

const AVUXI_HOSTS = ["avuxi.com", "topplaces.avuxi.com", "api.avuxi.com"];
const AVUXI_DOM_HOOK = ".category-control-container";
const AVUXI_BTN_SELECTOR = ".category-btn";

interface AVUXIOptions {
  buttonOrientation?: "horizontal" | "vertical";
  buttonBackgroundColor?: string;
  buttonForegroundColor?: string;
  buttonLocation?: "tr" | "tl" | "br" | "bl";
  showLegend?: boolean;
  language?: string;
  showMetro?: boolean;
  defaultCategory?: string;
  initialZoom?: number;
  initialLocation?: { lat: number; lng: number };
  opacity?: number;
}

declare global {
  interface Window {
    AVUXI?: {
      mapStart: (mapInstance: unknown, accountId: string, options: AVUXIOptions) => void;
    };
  }
}

interface CityEntry {
  id: string;
  label: string;
  region: string;
  lng: number;
  lat: number;
  zoom: number;
}

const CITIES: CityEntry[] = [
  { id: "madrid", label: "Madrid · ES", region: "EU-S", lng: -3.7038, lat: 40.4168, zoom: 13 },
  { id: "barcelona", label: "Barcelona · ES", region: "EU-S", lng: 2.1734, lat: 41.3851, zoom: 13 },
  { id: "lisboa", label: "Lisboa · PT", region: "EU-S", lng: -9.1393, lat: 38.7223, zoom: 13 },
  { id: "paris", label: "París · FR", region: "EU-N", lng: 2.3522, lat: 48.8566, zoom: 13 },
  { id: "london", label: "Londres · UK", region: "EU-N", lng: -0.1276, lat: 51.5074, zoom: 13 },
  { id: "newyork", label: "Nueva York · US", region: "US", lng: -74.006, lat: 40.7128, zoom: 13 },
  { id: "dubai", label: "Dubái · AE", region: "ME", lng: 55.2708, lat: 25.2048, zoom: 13 },
  { id: "singapore", label: "Singapur · SG", region: "APAC", lng: 103.8198, lat: 1.3521, zoom: 13 },
  { id: "tokyo", label: "Tokio · JP", region: "APAC", lng: 139.6503, lat: 35.6762, zoom: 13 },
];

interface ResourceEvent {
  ts: string;
  url: string;
  duration: number;
  size: number;
  type: string;
}

interface CategorySnapshot {
  name: string;
  requestsBefore: number;
  requestsAfter: number;
  mapboxSourcesBefore: number;
  mapboxSourcesAfter: number;
  mapboxLayersBefore: number;
  mapboxLayersAfter: number;
  elapsedMs: number;
}

export default function ExperimentAvuxiPage() {
  const mapRef = useRef<MapRef>(null);
  const [scriptStatus, setScriptStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [mapStartStatus, setMapStartStatus] = useState<"idle" | "called" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [cityId, setCityId] = useState("madrid");

  // EVIDENCE COUNTERS
  const [avuxiRequests, setAvuxiRequests] = useState<ResourceEvent[]>([]);
  const [mapboxSourcesCount, setMapboxSourcesCount] = useState(0);
  const [mapboxLayersCount, setMapboxLayersCount] = useState(0);
  const [avuxiDomElements, setAvuxiDomElements] = useState(0);
  const [avuxiCategoryButtons, setAvuxiCategoryButtons] = useState<string[]>([]);
  const [categorySnapshots, setCategorySnapshots] = useState<CategorySnapshot[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<string | null>(null);

  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];

  const log = useCallback((msg: string) => {
    // eslint-disable-next-line no-console
    console.log(`[avuxi-exp] ${msg}`);
    setEvents((p) => [...p, `${new Date().toISOString().slice(11, 23)} · ${msg}`].slice(-40));
  }, []);

  // ─── Network observer · capture every fetch/XHR to *.avuxi.com ───────
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceResourceTiming;
        const url = e.name;
        if (!AVUXI_HOSTS.some((h) => url.includes(h))) continue;
        const evt: ResourceEvent = {
          ts: new Date().toISOString().slice(11, 23),
          url: url.length > 80 ? url.slice(0, 77) + "…" : url,
          duration: Math.round(e.duration),
          size: e.transferSize ?? 0,
          type: e.initiatorType,
        };
        setAvuxiRequests((p) => [...p, evt].slice(-30));
      }
    });
    observer.observe({ type: "resource", buffered: true });
    log("PerformanceObserver listening for *.avuxi.com");
    return () => observer.disconnect();
  }, [log]);

  // ─── DOM observer · count AVUXI-injected elements ────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => {
      const container = document.querySelectorAll(AVUXI_DOM_HOOK).length;
      const buttons = Array.from(
        document.querySelectorAll<HTMLElement>(AVUXI_BTN_SELECTOR)
      );
      setAvuxiDomElements(container);
      setAvuxiCategoryButtons(
        buttons.map((b) =>
          (b.getAttribute("data-category") ||
            b.getAttribute("aria-label") ||
            b.getAttribute("title") ||
            b.textContent ||
            "?").trim().toLowerCase()
        )
      );
    };
    refresh();
    const mo = new MutationObserver(refresh);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // ─── Map layer/source observer · poll mapbox-gl state ────────────────
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref) return;
    const id = window.setInterval(() => {
      const m = ref.getMap();
      try {
        const style = m.getStyle();
        if (!style) return;
        setMapboxSourcesCount(Object.keys(style.sources ?? {}).length);
        setMapboxLayersCount((style.layers ?? []).length);
      } catch {
        /* style not loaded yet */
      }
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  // ─── Inject AVUXI script ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.AVUXI) {
      setScriptStatus("loaded");
      return;
    }
    setScriptStatus("loading");
    log("injecting AVUXI script");
    const script = document.createElement("script");
    script.src = AVUXI_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      log("AVUXI script onload fired");
      setScriptStatus("loaded");
    };
    script.onerror = () => {
      log("AVUXI script onerror fired");
      setScriptStatus("error");
      setErrorMessage("Failed to load AVUXI script");
    };
    document.body.appendChild(script);
  }, [log]);

  // ─── Call mapStart once script + map are ready ───────────────────────
  useEffect(() => {
    if (scriptStatus !== "loaded") return;
    if (mapStartStatus !== "idle") return;
    if (typeof window === "undefined" || !window.AVUXI) return;
    const ref = mapRef.current;
    if (!ref) return;
    const mapInstance = ref.getMap();
    try {
      log("calling AVUXI.mapStart");
      window.AVUXI.mapStart(mapInstance, AVUXI_ACCOUNT_ID, {
        buttonOrientation: "vertical",
        buttonLocation: "tr",
        buttonBackgroundColor: "#ffffff",
        buttonForegroundColor: "#0E4B31",
        showLegend: true,
        language: "es",
        showMetro: true,
        defaultCategory: "eating",
        opacity: 60,
      });
      setMapStartStatus("called");
      log("AVUXI.mapStart returned");
    } catch (e) {
      log(`AVUXI.mapStart threw: ${(e as Error).message}`);
      setMapStartStatus("error");
      setErrorMessage(`mapStart failed: ${(e as Error).message}`);
    }
  }, [scriptStatus, mapStartStatus, log]);

  // ─── FlyTo city on selection change ──────────────────────────────────
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref) return;
    const m = ref.getMap();
    if (!m) return;
    log(`flyTo ${city.label}`);
    m.flyTo({ center: [city.lng, city.lat], zoom: city.zoom, essential: true });
  }, [city.id, city.label, city.lng, city.lat, city.zoom, log]);

  // ─── Programmatic category cycler · activates each AVUXI button in turn ──
  const cycleCategories = useCallback(async () => {
    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>(AVUXI_BTN_SELECTOR)
    );
    if (buttons.length === 0) {
      log("no AVUXI category buttons found · is the SDK mounted?");
      return;
    }
    log(`cycling ${buttons.length} AVUXI category buttons`);
    setCategorySnapshots([]);
    const snapshots: CategorySnapshot[] = [];
    const ref = mapRef.current;
    if (!ref) return;
    const m = ref.getMap();

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const name =
        (btn.getAttribute("data-category") ||
          btn.getAttribute("aria-label") ||
          btn.getAttribute("title") ||
          btn.textContent ||
          `btn-${i}`).trim().toLowerCase();
      const tStart = performance.now();
      const requestsBefore = avuxiRequests.length;
      let sourcesBefore = 0;
      let layersBefore = 0;
      try {
        const s = m.getStyle();
        sourcesBefore = Object.keys(s?.sources ?? {}).length;
        layersBefore = (s?.layers ?? []).length;
      } catch { /* ignore */ }

      setCategoryProgress(`${i + 1}/${buttons.length} · ${name}`);
      log(`clicking AVUXI button "${name}"`);
      btn.click();
      // Give AVUXI time to fetch + render
      await new Promise((r) => setTimeout(r, 2500));

      const requestsAfter = avuxiRequests.length;
      let sourcesAfter = sourcesBefore;
      let layersAfter = layersBefore;
      try {
        const s = m.getStyle();
        sourcesAfter = Object.keys(s?.sources ?? {}).length;
        layersAfter = (s?.layers ?? []).length;
      } catch { /* ignore */ }

      snapshots.push({
        name,
        requestsBefore,
        requestsAfter,
        mapboxSourcesBefore: sourcesBefore,
        mapboxSourcesAfter: sourcesAfter,
        mapboxLayersBefore: layersBefore,
        mapboxLayersAfter: layersAfter,
        elapsedMs: Math.round(performance.now() - tStart),
      });
      setCategorySnapshots([...snapshots]);
    }

    setCategoryProgress(null);
    log("category cycling complete");
  }, [avuxiRequests.length, log]);

  // ─── Render ──────────────────────────────────────────────────────────
  const avuxiActive =
    scriptStatus === "loaded" &&
    mapStartStatus === "called" &&
    avuxiDomElements > 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800">
      <LandingHeader />
      <main className="flex-grow relative overflow-hidden">
        {/* Map · single instance · AVUXI mounted on top */}
        <div className="absolute inset-0 z-0 bg-slate-200">
          {MAPBOX_TOKEN ? (
            <Map
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{ longitude: city.lng, latitude: city.lat, zoom: city.zoom, pitch: 0, bearing: 0 }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/light-v11"
              attributionControl={false}
              reuseMaps
              onLoad={() => log("mapbox-gl onLoad")}
              onError={(e) => log(`mapbox-gl onError: ${e?.error?.message ?? "unknown"}`)}
            >
              {city.id === "madrid" &&
                ALL_MADRID_AS_COMPETITORS.map((h) => (
                  <HotelMarker
                    key={h.id}
                    hotel={h}
                    type="explore"
                    isSelected={false}
                    onSelect={() => { /* read-only */ }}
                  />
                ))}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rose-700 font-bold">
              NEXT_PUBLIC_MAPBOX_TOKEN missing
            </div>
          )}
        </div>

        {/* Top-left · evidence badges always visible */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-1 text-[10px] font-mono pointer-events-none">
          <span className={cn(
            "px-2 py-1 rounded shadow border font-bold",
            avuxiActive
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          )}>
            AVUXI: {avuxiActive ? "ACTIVE" : "INACTIVE"}
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700">
            AVUXI requests: <strong className={avuxiRequests.length > 0 ? "text-emerald-700" : "text-rose-700"}>{avuxiRequests.length}</strong>
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700">
            Mapbox sources: <strong>{mapboxSourcesCount}</strong> · layers: <strong>{mapboxLayersCount}</strong>
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700">
            AVUXI DOM: <strong className={avuxiDomElements > 0 ? "text-emerald-700" : "text-rose-700"}>{avuxiDomElements}</strong> container · <strong>{avuxiCategoryButtons.length}</strong> buttons
          </span>
        </div>

        {/* Bottom-left · evidence-gathering panel */}
        <div className="absolute bottom-4 left-4 z-30 w-[min(440px,calc(100vw-2rem))] bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-xl p-3 space-y-3 text-xs font-mono max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">AVUXI · evidence v3</p>
          </div>

          {/* City + cycle button */}
          <section className="space-y-2">
            <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              City
            </label>
            <select
              value={cityId}
              onChange={(e) => {
                setCityId(e.target.value);
                setCategorySnapshots([]);
              }}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-medium"
            >
              {(["EU-S", "EU-N", "US", "ME", "APAC"] as const).map((region) => (
                <optgroup key={region} label={region}>
                  {CITIES.filter((c) => c.region === region).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              onClick={cycleCategories}
              disabled={!avuxiActive || avuxiCategoryButtons.length === 0 || !!categoryProgress}
              className={cn(
                "w-full px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-colors",
                avuxiActive && avuxiCategoryButtons.length > 0 && !categoryProgress
                  ? "bg-forest-900 text-white hover:brightness-110"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              {categoryProgress
                ? `Cycling: ${categoryProgress}`
                : `Cycle ${avuxiCategoryButtons.length} categories sequentially`}
            </button>
          </section>

          {/* Detected categories */}
          {avuxiCategoryButtons.length > 0 && (
            <section>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
                AVUXI categories detected in DOM
              </p>
              <div className="flex flex-wrap gap-1">
                {avuxiCategoryButtons.map((c, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded font-semibold">
                    {c || `btn-${i}`}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Category snapshots · the actual evidence */}
          {categorySnapshots.length > 0 && (
            <section>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
                Per-category render evidence
              </p>
              <table className="w-full text-[10px] border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-1.5 py-1 text-left border-b border-slate-200">Category</th>
                    <th className="px-1 py-1 text-right border-b border-slate-200">+req</th>
                    <th className="px-1 py-1 text-right border-b border-slate-200">+src</th>
                    <th className="px-1 py-1 text-right border-b border-slate-200">+lyr</th>
                    <th className="px-1 py-1 text-right border-b border-slate-200">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySnapshots.map((s, i) => {
                    const dr = s.requestsAfter - s.requestsBefore;
                    const ds = s.mapboxSourcesAfter - s.mapboxSourcesBefore;
                    const dl = s.mapboxLayersAfter - s.mapboxLayersBefore;
                    const ok = dr > 0 || ds > 0 || dl > 0;
                    return (
                      <tr key={i} className={cn("border-b border-slate-100", ok ? "bg-emerald-50/40" : "bg-rose-50/40")}>
                        <td className="px-1.5 py-1">{s.name}</td>
                        <td className={cn("px-1 py-1 text-right font-bold", dr > 0 ? "text-emerald-700" : "text-slate-400")}>{dr > 0 ? `+${dr}` : "—"}</td>
                        <td className={cn("px-1 py-1 text-right font-bold", ds > 0 ? "text-emerald-700" : "text-slate-400")}>{ds > 0 ? `+${ds}` : "—"}</td>
                        <td className={cn("px-1 py-1 text-right font-bold", dl > 0 ? "text-emerald-700" : "text-slate-400")}>{dl > 0 ? `+${dl}` : "—"}</td>
                        <td className="px-1 py-1 text-right">{s.elapsedMs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[9px] text-slate-500 mt-1 italic leading-snug">
                +req · new requests to *.avuxi.com after clicking this category.<br />
                +src / +lyr · new mapbox-gl Source / Layer objects after the click.<br />
                Any green row = AVUXI rendered real data for that category in this city.
              </p>
            </section>
          )}

          {/* Live network requests · last 8 */}
          <section>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              Live · last {Math.min(8, avuxiRequests.length)} *.avuxi.com requests
            </p>
            {avuxiRequests.length === 0 ? (
              <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                Zero · AVUXI hasn&apos;t made any network requests yet · either the SDK has not mounted, or all its data is cached, or it&apos;s currently idle. Try the &quot;Cycle&quot; button above.
              </p>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded p-1.5 max-h-32 overflow-y-auto text-[9px] leading-relaxed">
                {avuxiRequests.slice(-8).map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-400">{r.ts}</span>
                    <span className="text-slate-700 truncate">{r.url}</span>
                    <span className="text-slate-500 ml-auto whitespace-nowrap">{r.duration}ms · {r.size}B</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Lifecycle */}
          <section className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              SDK lifecycle
            </p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span>script:</span>
              <span className={cn("font-bold text-right", scriptStatus === "error" ? "text-rose-700" : scriptStatus === "loaded" ? "text-emerald-700" : "text-slate-600")}>{scriptStatus}</span>
              <span>mapStart:</span>
              <span className={cn("font-bold text-right", mapStartStatus === "error" ? "text-rose-700" : mapStartStatus === "called" ? "text-emerald-700" : "text-slate-600")}>{mapStartStatus}</span>
              <span>DOM mounted:</span>
              <span className={cn("font-bold text-right", avuxiDomElements > 0 ? "text-emerald-700" : "text-rose-700")}>{avuxiDomElements > 0 ? "yes" : "no"}</span>
              <span>API host hits:</span>
              <span className={cn("font-bold text-right", avuxiRequests.length > 0 ? "text-emerald-700" : "text-rose-700")}>{avuxiRequests.length}</span>
            </div>
          </section>

          {errorMessage && (
            <p className="text-rose-700 text-[11px] bg-rose-50 border border-rose-200 px-2 py-1 rounded">
              {errorMessage}
            </p>
          )}

          <details>
            <summary className="text-[10px] font-bold tracking-widest text-slate-500 uppercase cursor-pointer hover:text-slate-700">
              Event log ({events.length})
            </summary>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] leading-relaxed max-h-32 overflow-y-auto mt-1">
              {events.slice(-15).map((e, i) => <div key={i}>{e}</div>)}
            </div>
          </details>

          <p className="text-[9px] text-slate-500 leading-relaxed italic">
            Evidence interpretation:<br />
            · <strong>AVUXI requests &gt; 0</strong> · SDK is hitting api.avuxi.com / topplaces.avuxi.com<br />
            · <strong>Per-category +src/+lyr</strong> · AVUXI added real GeoJSON sources + render layers · base map carries data<br />
            · <strong>AVUXI DOM &gt; 0</strong> · button group mounted on the map<br />
            All three green ⇒ AVUXI is genuinely rendering · not just script-loaded.
          </p>
        </div>
      </main>
    </div>
  );
}
