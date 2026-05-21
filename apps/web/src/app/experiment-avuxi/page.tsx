"use client";

/**
 * /experiment-avuxi · v4 · race-condition fix + aggressive diagnostics.
 *
 * v3 surfaced "mapStart: idle" permanently. Audit of the SDK source
 * confirmed `window.AVUXI = { mapStart: function(t,n,o,r){...} }` so
 * the global IS exposed correctly. The root cause was a React race:
 * the mapStart useEffect fired when `scriptStatus` flipped to "loaded"
 * but at that moment `mapRef.current` was still null (mapbox-gl needs
 * ~1.5s to mount its WebGL canvas after the React component renders).
 * The effect's dependency array didn't include the map readiness, so
 * it never re-fired once the map became available.
 *
 * v4 fixes this with:
 *   1. Explicit `mapReady` state · flipped true in <Map onLoad>
 *   2. mapStart effect depends on (scriptStatus, mapReady, mapStartStatus)
 *   3. Every guard return logs WHY it returned · no more silent failures
 *   4. Retry loop (poll 300ms · cap 10s) for window.AVUXI presence
 *   5. Manual "Force mapStart" button operator can press anytime
 *   6. Visible Guards table · 4 boolean rows showing live state of
 *      each precondition
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
  const [mapReady, setMapReady] = useState(false); // v4 · the missing dep
  const [avuxiGlobalReady, setAvuxiGlobalReady] = useState(false); // v4 · explicit
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
    setEvents((p) => [...p, `${new Date().toISOString().slice(11, 23)} · ${msg}`].slice(-50));
  }, []);

  // ─── PerformanceObserver · capture *.avuxi.com requests ──────────────
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceResourceTiming;
        const url = e.name;
        if (!AVUXI_HOSTS.some((h) => url.includes(h))) continue;
        setAvuxiRequests((p) =>
          [...p, {
            ts: new Date().toISOString().slice(11, 23),
            url: url.length > 80 ? url.slice(0, 77) + "…" : url,
            duration: Math.round(e.duration),
            size: e.transferSize ?? 0,
          }].slice(-30)
        );
      }
    });
    observer.observe({ type: "resource", buffered: true });
    log("PerformanceObserver active");
    return () => observer.disconnect();
  }, [log]);

  // ─── DOM observer · count AVUXI-mounted elements ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => {
      const containers = document.querySelectorAll(AVUXI_DOM_HOOK).length;
      const buttons = Array.from(document.querySelectorAll<HTMLElement>(AVUXI_BTN_SELECTOR));
      setAvuxiDomElements(containers);
      setAvuxiCategoryButtons(
        buttons.map((b) =>
          (b.getAttribute("data-category") ||
            b.getAttribute("aria-label") ||
            b.getAttribute("title") ||
            b.textContent || "?").trim().toLowerCase()
        )
      );
    };
    refresh();
    const mo = new MutationObserver(refresh);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // ─── Map style poller ────────────────────────────────────────────────
  useEffect(() => {
    const id = window.setInterval(() => {
      const m = mapRef.current?.getMap();
      if (!m) return;
      try {
        const style = m.getStyle();
        if (!style) return;
        setMapboxSourcesCount(Object.keys(style.sources ?? {}).length);
        setMapboxLayersCount((style.layers ?? []).length);
      } catch { /* style still loading */ }
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  // ─── Inject AVUXI script ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.AVUXI) {
      setScriptStatus("loaded");
      setAvuxiGlobalReady(true);
      log("window.AVUXI already present at mount");
      return;
    }
    setScriptStatus("loading");
    log(`injecting <script src=${AVUXI_SCRIPT_URL}>`);
    const script = document.createElement("script");
    script.src = AVUXI_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      log("script.onload fired");
      setScriptStatus("loaded");
      // Probe window for AVUXI · should be available synchronously
      // but poll for up to 3s just in case the SDK has async init.
      let attempts = 0;
      const probe = window.setInterval(() => {
        attempts++;
        if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
          log(`window.AVUXI detected (attempt ${attempts})`);
          setAvuxiGlobalReady(true);
          window.clearInterval(probe);
        } else if (attempts >= 30) {
          log(`window.AVUXI never appeared after ${attempts * 100}ms · giving up`);
          window.clearInterval(probe);
          setErrorMessage("Script loaded but window.AVUXI never appeared");
        }
      }, 100);
    };
    script.onerror = () => {
      log("script.onerror fired");
      setScriptStatus("error");
      setErrorMessage("Failed to load AVUXI script (network / CORS / blocked)");
    };
    document.body.appendChild(script);
  }, [log]);

  // ─── mapStart caller · v4 · race-free via mapReady + retry ───────────
  // Wraps in useCallback so the manual "Force mapStart" button uses
  // the same code path as the auto-effect.
  const callMapStart = useCallback(() => {
    log("callMapStart entered");

    // Explicit guard logging · no more silent returns
    if (mapStartStatus !== "idle") {
      log(`SKIP · mapStartStatus is already "${mapStartStatus}"`);
      return false;
    }
    if (typeof window === "undefined") {
      log("SKIP · no window (SSR?)");
      return false;
    }
    if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") {
      log("SKIP · window.AVUXI.mapStart not present");
      return false;
    }
    const ref = mapRef.current;
    if (!ref) {
      log("SKIP · mapRef.current is null");
      return false;
    }
    const mapInstance = ref.getMap();
    if (!mapInstance) {
      log("SKIP · ref.getMap() returned null");
      return false;
    }
    // mapbox-gl Map exposes loaded() — call only when style is ready
    if (typeof mapInstance.loaded === "function" && !mapInstance.loaded()) {
      log("SKIP · mapInstance.loaded() returned false");
      return false;
    }

    try {
      log(`calling AVUXI.mapStart(map, "${AVUXI_ACCOUNT_ID.slice(0, 8)}…", options)`);
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
      log("AVUXI.mapStart returned successfully");
      return true;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      log(`AVUXI.mapStart threw: ${msg}`);
      setMapStartStatus("error");
      setErrorMessage(`mapStart threw: ${msg}`);
      return false;
    }
  }, [mapStartStatus, log]);

  // v4 · auto-fire when ALL preconditions ready
  useEffect(() => {
    if (mapStartStatus !== "idle") return;
    if (!avuxiGlobalReady) return;
    if (!mapReady) return;
    log("preconditions satisfied · auto-calling mapStart");
    callMapStart();
  }, [avuxiGlobalReady, mapReady, mapStartStatus, callMapStart, log]);

  // ─── FlyTo city on selection change ──────────────────────────────────
  useEffect(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    log(`flyTo ${city.label}`);
    m.flyTo({ center: [city.lng, city.lat], zoom: city.zoom, essential: true });
  }, [city.id, city.label, city.lng, city.lat, city.zoom, log]);

  // ─── Programmatic category cycler ────────────────────────────────────
  const cycleCategories = useCallback(async () => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(AVUXI_BTN_SELECTOR));
    if (buttons.length === 0) {
      log("no AVUXI category buttons found");
      return;
    }
    log(`cycling ${buttons.length} AVUXI category buttons`);
    setCategorySnapshots([]);
    const snapshots: CategorySnapshot[] = [];
    const m = mapRef.current?.getMap();
    if (!m) return;

    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      const name =
        (btn.getAttribute("data-category") ||
          btn.getAttribute("aria-label") ||
          btn.getAttribute("title") ||
          btn.textContent || `btn-${i}`).trim().toLowerCase();
      const tStart = performance.now();
      const requestsBefore = avuxiRequests.length;
      const styleBefore = m.getStyle();
      const sourcesBefore = Object.keys(styleBefore?.sources ?? {}).length;
      const layersBefore = (styleBefore?.layers ?? []).length;

      setCategoryProgress(`${i + 1}/${buttons.length} · ${name}`);
      log(`clicking "${name}"`);
      btn.click();
      await new Promise((r) => setTimeout(r, 2500));

      const styleAfter = m.getStyle();
      snapshots.push({
        name,
        requestsBefore,
        requestsAfter: avuxiRequests.length,
        mapboxSourcesBefore: sourcesBefore,
        mapboxSourcesAfter: Object.keys(styleAfter?.sources ?? {}).length,
        mapboxLayersBefore: layersBefore,
        mapboxLayersAfter: (styleAfter?.layers ?? []).length,
        elapsedMs: Math.round(performance.now() - tStart),
      });
      setCategorySnapshots([...snapshots]);
    }
    setCategoryProgress(null);
    log("cycle complete");
  }, [avuxiRequests.length, log]);

  const avuxiActive =
    scriptStatus === "loaded" &&
    mapStartStatus === "called" &&
    avuxiDomElements > 0;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800">
      <LandingHeader />
      <main className="flex-grow relative overflow-hidden">
        {/* Map */}
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
              onLoad={() => {
                log("mapbox-gl onLoad");
                setMapReady(true); // v4 · the missing dep · unblocks mapStart effect
              }}
              onError={(e) => log(`mapbox-gl onError: ${e?.error?.message ?? "unknown"}`)}
            >
              {city.id === "madrid" &&
                ALL_MADRID_AS_COMPETITORS.map((h) => (
                  <HotelMarker
                    key={h.id} hotel={h} type="explore"
                    isSelected={false} onSelect={() => { /* read-only */ }}
                  />
                ))}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rose-700 font-bold">
              NEXT_PUBLIC_MAPBOX_TOKEN missing
            </div>
          )}
        </div>

        {/* Top-left badges · v4 includes Guards badge */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-1 text-[10px] font-mono pointer-events-none">
          <span className={cn("px-2 py-1 rounded shadow border font-bold",
            avuxiActive ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : "bg-rose-50 border-rose-300 text-rose-900")}>
            AVUXI: {avuxiActive ? "ACTIVE" : "INACTIVE"}
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700">
            req: <strong className={avuxiRequests.length > 0 ? "text-emerald-700" : "text-rose-700"}>{avuxiRequests.length}</strong>
            {" · "}src: <strong>{mapboxSourcesCount}</strong>{" · "}lyr: <strong>{mapboxLayersCount}</strong>
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700">
            DOM: <strong className={avuxiDomElements > 0 ? "text-emerald-700" : "text-rose-700"}>{avuxiDomElements}</strong>{" · "}btns: <strong>{avuxiCategoryButtons.length}</strong>
          </span>
        </div>

        {/* Panel · v4 expanded with Guards table */}
        <div className="absolute bottom-4 left-4 z-30 w-[min(460px,calc(100vw-2rem))] bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-xl p-3 space-y-3 text-xs font-mono max-h-[88vh] overflow-y-auto">
          <p className="font-bold text-sm">AVUXI · evidence v4 · race-fix + guards</p>

          {/* v4 NEW · Guards table · live precondition state */}
          <section>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              mapStart preconditions
            </p>
            <table className="w-full text-[10px] border border-slate-200">
              <tbody>
                {[
                  ["scriptStatus === loaded", scriptStatus === "loaded"],
                  ["window.AVUXI.mapStart is function", avuxiGlobalReady],
                  ["mapRef.current.getMap().loaded() ", mapReady],
                  ["mapStartStatus === idle", mapStartStatus === "idle"],
                ].map(([label, ok]) => (
                  <tr key={String(label)} className={cn("border-b border-slate-100",
                    ok ? "bg-emerald-50/40" : "bg-rose-50/40")}>
                    <td className="px-1.5 py-1">{String(label)}</td>
                    <td className={cn("px-1 py-1 text-right font-bold",
                      ok ? "text-emerald-700" : "text-rose-700")}>{ok ? "✓" : "✗"}</td>
                  </tr>
                ))}
                <tr className="border-b border-slate-100 bg-slate-50">
                  <td className="px-1.5 py-1 font-bold">→ mapStartStatus</td>
                  <td className={cn("px-1 py-1 text-right font-bold",
                    mapStartStatus === "called" ? "text-emerald-700" :
                    mapStartStatus === "error" ? "text-rose-700" : "text-slate-600")}>
                    {mapStartStatus}
                  </td>
                </tr>
              </tbody>
            </table>
            <button
              type="button"
              onClick={() => {
                if (mapStartStatus !== "idle") {
                  setMapStartStatus("idle");
                  log("manual reset · mapStartStatus → idle");
                  setTimeout(() => callMapStart(), 100);
                } else {
                  callMapStart();
                }
              }}
              className="mt-2 w-full px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              Force mapStart (manual override)
            </button>
          </section>

          {/* City + cycle */}
          <section className="space-y-2">
            <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase">City</label>
            <select value={cityId} onChange={(e) => { setCityId(e.target.value); setCategorySnapshots([]); }}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-medium">
              {(["EU-S", "EU-N", "US", "ME", "APAC"] as const).map((region) => (
                <optgroup key={region} label={region}>
                  {CITIES.filter((c) => c.region === region).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button type="button" onClick={cycleCategories}
              disabled={!avuxiActive || avuxiCategoryButtons.length === 0 || !!categoryProgress}
              className={cn("w-full px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider transition-colors",
                avuxiActive && avuxiCategoryButtons.length > 0 && !categoryProgress
                  ? "bg-forest-900 text-white hover:brightness-110"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed")}>
              {categoryProgress
                ? `Cycling: ${categoryProgress}`
                : `Cycle ${avuxiCategoryButtons.length || "?"} categories sequentially`}
            </button>
          </section>

          {avuxiCategoryButtons.length > 0 && (
            <section>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
                Categories detected
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

          {categorySnapshots.length > 0 && (
            <section>
              <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">Per-category evidence</p>
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
                      <tr key={i} className={cn("border-b border-slate-100",
                        ok ? "bg-emerald-50/40" : "bg-rose-50/40")}>
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
            </section>
          )}

          <section>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              Last *.avuxi.com requests ({avuxiRequests.length})
            </p>
            {avuxiRequests.length === 0 ? (
              <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                No AVUXI network activity yet.
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

          {errorMessage && (
            <p className="text-rose-700 text-[11px] bg-rose-50 border border-rose-200 px-2 py-1 rounded">
              {errorMessage}
            </p>
          )}

          <details open>
            <summary className="text-[10px] font-bold tracking-widest text-slate-500 uppercase cursor-pointer hover:text-slate-700">
              Event log ({events.length}) · v4 logs every guard
            </summary>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] leading-relaxed max-h-40 overflow-y-auto mt-1">
              {events.slice(-20).map((e, i) => <div key={i}>{e}</div>)}
            </div>
          </details>

          <p className="text-[9px] text-slate-500 leading-relaxed italic">
            v4 race-fix:<br />
            · <strong>mapReady</strong> state · seeded from &lt;Map onLoad&gt; · was the missing dep<br />
            · Every guard return now logs explicitly · no more silent skip<br />
            · Force button overrides if anything is stuck
          </p>
        </div>
      </main>
    </div>
  );
}
