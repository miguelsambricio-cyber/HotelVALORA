"use client";

/**
 * /experiment-avuxi · QA #002+ validation environment for AVUXI Map
 * Layers as a candidate global geospatial provider for HotelValora.
 *
 * Features:
 *   · City selector (12 cities · 4 continents · CoStar-aligned roadmap)
 *   · "AVUXI overlay" toggle (script + mapStart lifecycle visible)
 *   · "Manual overlays" toggle (heatmap · metro · polygon · Madrid only)
 *   · Layer-by-layer source table (proof of which provider renders what)
 *   · Live event log
 *   · Visual map badges showing active source per layer
 *
 * Boundary: /compset is NOT touched. This route is the validation
 * environment for the operator's Go/No-go decision on the global
 * Mapbox + AVUXI + CoStar + HotelValora Intelligence architecture.
 */

import { useEffect, useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/maps/map-config";
import { ALL_MADRID_AS_COMPETITORS } from "@/lib/api/compset";
import { HotelMarker } from "@/components/maps/hotel-marker";
import { MapHeatmapLayer } from "@/components/maps/map-heatmap-layer";
import { MapMetroLayer } from "@/components/maps/map-metro-layer";
import { MapPolygonLayer } from "@/components/maps/map-polygon-layer";
import {
  TOURIST_HEATMAP_DATA,
  METRO_LINE_DATA,
  HISTORIC_CENTER_POLYGON,
} from "@/lib/maps/geo-data";
import { LandingHeader } from "@/components/landing/landing-header";
import { cn } from "@/lib/utils";

const AVUXI_ACCOUNT_ID = "67d80ff2-d56c-4d93-ab90-87e4f8abd043";
const AVUXI_SCRIPT_URL =
  "https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js";

interface AVUXIOptions {
  buttonOrientation?: "horizontal" | "vertical";
  buttonBackgroundColor?: string;
  buttonForegroundColor?: string;
  buttonLocation?: "tr" | "tl" | "br" | "bl";
  showLegend?: boolean;
  language?: string;
  showMetro?: boolean;
  defaultCategory?: "eating" | "sightseeing" | "shopping" | "nightlife" | "parks";
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

/* ─── City catalogue · CoStar-aligned global roadmap ───────────────────── */

interface CityEntry {
  id: string;
  label: string;
  region: "EU-S" | "EU-N" | "US" | "ME" | "APAC";
  lng: number;
  lat: number;
  zoom: number;
  /** Does our manual `geo-data.ts` carry POIs / metro / polygon for this city? */
  hasManualData: boolean;
}

const CITIES: CityEntry[] = [
  // Spain (CoStar Tier 1)
  { id: "madrid",    label: "Madrid · ES",     region: "EU-S",  lng: -3.7038,  lat: 40.4168, zoom: 13, hasManualData: true  },
  { id: "barcelona", label: "Barcelona · ES",  region: "EU-S",  lng:  2.1734,  lat: 41.3851, zoom: 13, hasManualData: false },
  { id: "valencia",  label: "Valencia · ES",   region: "EU-S",  lng: -0.3763,  lat: 39.4699, zoom: 13, hasManualData: false },
  { id: "malaga",    label: "Málaga · ES",     region: "EU-S",  lng: -4.4214,  lat: 36.7213, zoom: 13, hasManualData: false },
  { id: "sevilla",   label: "Sevilla · ES",    region: "EU-S",  lng: -5.9845,  lat: 37.3891, zoom: 13, hasManualData: false },
  // Portugal
  { id: "lisboa",    label: "Lisboa · PT",     region: "EU-S",  lng: -9.1393,  lat: 38.7223, zoom: 13, hasManualData: false },
  // Europe Tier 1
  { id: "paris",     label: "París · FR",      region: "EU-N",  lng:  2.3522,  lat: 48.8566, zoom: 13, hasManualData: false },
  { id: "london",    label: "Londres · UK",    region: "EU-N",  lng: -0.1276,  lat: 51.5074, zoom: 13, hasManualData: false },
  // North America
  { id: "newyork",   label: "Nueva York · US", region: "US",    lng: -74.0060, lat: 40.7128, zoom: 13, hasManualData: false },
  // Middle East
  { id: "dubai",     label: "Dubái · AE",      region: "ME",    lng: 55.2708,  lat: 25.2048, zoom: 13, hasManualData: false },
  // Asia-Pacific
  { id: "singapore", label: "Singapur · SG",   region: "APAC",  lng: 103.8198, lat:  1.3521, zoom: 13, hasManualData: false },
  { id: "tokyo",     label: "Tokio · JP",      region: "APAC",  lng: 139.6503, lat: 35.6762, zoom: 13, hasManualData: false },
];

const DEFAULT_CITY = "madrid";

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function ExperimentAvuxiPage() {
  const mapRef = useRef<MapRef>(null);
  const [scriptStatus, setScriptStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [mapStartStatus, setMapStartStatus] = useState<"idle" | "called" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);

  // Validation toggles · OPERATOR-FACING
  const [showAvuxi, setShowAvuxi] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [cityId, setCityId] = useState(DEFAULT_CITY);

  // Manual layer sub-toggles · only meaningful when showManual + city has data
  const [manualHeatmapOn, setManualHeatmapOn] = useState(true);
  const [manualMetroOn, setManualMetroOn] = useState(true);
  const [manualHistoricoOn, setManualHistoricoOn] = useState(true);

  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];
  const manualAvailableForCity = city.hasManualData;

  const log = (msg: string) => {
    // eslint-disable-next-line no-console
    console.log(`[avuxi-exp] ${msg}`);
    setEvents((p) => [...p, `${new Date().toISOString().slice(11, 23)} · ${msg}`]);
  };

  // Inject AVUXI script
  useEffect(() => {
    if (!showAvuxi) return;
    if (typeof window === "undefined") return;
    if (window.AVUXI) {
      if (scriptStatus !== "loaded") setScriptStatus("loaded");
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
  }, [showAvuxi, scriptStatus]);

  // Call mapStart once script + map are ready
  useEffect(() => {
    if (!showAvuxi) return;
    if (scriptStatus !== "loaded") return;
    if (mapStartStatus !== "idle") return;
    if (typeof window === "undefined" || !window.AVUXI) return;
    const ref = mapRef.current;
    if (!ref) return;
    const mapInstance = ref.getMap();
    try {
      log(`AVUXI.mapStart for ${city.label}`);
      window.AVUXI.mapStart(mapInstance, AVUXI_ACCOUNT_ID, {
        buttonOrientation: "vertical",
        buttonLocation: "tr",
        buttonBackgroundColor: "#ffffff",
        buttonForegroundColor: "#0E4B31",
        showLegend: true,
        language: "es",
        showMetro: true,
        defaultCategory: "eating",
        opacity: 55,
      });
      setMapStartStatus("called");
      log("AVUXI.mapStart returned");
    } catch (e) {
      log(`AVUXI.mapStart threw: ${(e as Error).message}`);
      setMapStartStatus("error");
      setErrorMessage(`mapStart failed: ${(e as Error).message}`);
    }
  }, [scriptStatus, mapStartStatus, showAvuxi, city.label]);

  // FlyTo city on selection change
  useEffect(() => {
    const ref = mapRef.current;
    if (!ref) return;
    const mapInstance = ref.getMap();
    if (!mapInstance) return;
    log(`flyTo ${city.label} · (${city.lng}, ${city.lat}) z${city.zoom}`);
    mapInstance.flyTo({
      center: [city.lng, city.lat],
      zoom: city.zoom,
      essential: true,
    });
  }, [city.id, city.label, city.lng, city.lat, city.zoom]);

  // Layer-by-layer source table data
  const layers = [
    {
      key: "heatmap",
      label: "Heatmap (popularidad turística)",
      avuxi: showAvuxi && scriptStatus === "loaded" && mapStartStatus === "called",
      manual: showManual && manualAvailableForCity && manualHeatmapOn,
      manualNote: manualAvailableForCity ? `21 POIs · ${city.label}` : `N/A · solo Madrid en geo-data.ts`,
    },
    {
      key: "metro",
      label: "Líneas de metro",
      avuxi: showAvuxi && scriptStatus === "loaded" && mapStartStatus === "called",
      manual: showManual && manualAvailableForCity && manualMetroOn,
      manualNote: manualAvailableForCity ? `L1 + L6 hand-drawn · Madrid` : `N/A · solo Madrid en geo-data.ts`,
    },
    {
      key: "historico",
      label: "Centro histórico (zone polygon)",
      avuxi: false,
      manual: showManual && manualAvailableForCity && manualHistoricoOn,
      manualNote: manualAvailableForCity ? `Almendra Central hardcoded` : `N/A · solo Madrid en geo-data.ts`,
      avuxiNote: "AVUXI no surface zoning polygons · sólo point-density",
    },
    {
      key: "pois",
      label: "POIs turísticos (Eating · Sightseeing · Shopping · Nightlife · Parks)",
      avuxi: showAvuxi && scriptStatus === "loaded" && mapStartStatus === "called",
      manual: false,
      manualNote: "Nuestra implementación no surface POIs individuales · solo density",
    },
    {
      key: "hotels",
      label: "Hoteles institucionales (18 Madrid · canonical registry)",
      avuxi: false,
      manual: true,
      ours: true,
      manualNote: "Siempre nuestro · es IP institucional",
      avuxiNote: "AVUXI no sustituye nuestros pins",
    },
  ];

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
              onLoad={() => log("mapbox-gl onLoad")}
              onStyleData={() => { /* avoid noise */ }}
              onError={(e) => log(`mapbox-gl onError: ${e?.error?.message ?? "unknown"}`)}
            >
              {/* Manual layers · Madrid only · gated by showManual + sub-toggles */}
              {showManual && manualAvailableForCity && manualHeatmapOn && (
                <MapHeatmapLayer data={TOURIST_HEATMAP_DATA} />
              )}
              {showManual && manualAvailableForCity && manualMetroOn && (
                <MapMetroLayer data={METRO_LINE_DATA} />
              )}
              {showManual && manualAvailableForCity && manualHistoricoOn && (
                <MapPolygonLayer data={HISTORIC_CENTER_POLYGON} />
              )}

              {/* Hotel pins · only show on Madrid (canonical registry is Madrid-only for now) */}
              {city.id === "madrid" &&
                ALL_MADRID_AS_COMPETITORS.map((h) => (
                  <HotelMarker
                    key={h.id}
                    hotel={h}
                    type="explore"
                    isSelected={false}
                    onSelect={() => { /* read-only experiment */ }}
                  />
                ))}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rose-700 font-bold">
              NEXT_PUBLIC_MAPBOX_TOKEN missing
            </div>
          )}
        </div>

        {/* Active-source badge · top-left · always visible */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-1 text-[10px] font-mono pointer-events-none">
          <span className={cn(
            "px-2 py-1 rounded shadow border font-bold",
            showAvuxi && scriptStatus === "loaded" && mapStartStatus === "called"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-slate-100 border-slate-300 text-slate-500"
          )}>
            AVUXI: {showAvuxi && scriptStatus === "loaded" && mapStartStatus === "called" ? "active" : showAvuxi ? `${scriptStatus}/${mapStartStatus}` : "off"}
          </span>
          <span className={cn(
            "px-2 py-1 rounded shadow border font-bold",
            showManual && manualAvailableForCity
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-slate-100 border-slate-300 text-slate-500"
          )}>
            Manual: {showManual ? (manualAvailableForCity ? "active" : `N/A for ${city.label}`) : "off"}
          </span>
        </div>

        {/* Control panel · bottom-left */}
        <div className="absolute bottom-4 left-4 z-30 w-[min(360px,calc(100vw-2rem))] bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-xl p-3 space-y-3 text-xs font-mono max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">AVUXI · validation environment</p>
          </div>

          {/* City selector */}
          <section>
            <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              City
            </label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-medium"
            >
              {(["EU-S", "EU-N", "US", "ME", "APAC"] as const).map((region) => (
                <optgroup key={region} label={region}>
                  {CITIES.filter((c) => c.region === region).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} {c.hasManualData ? "· [has manual data]" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </section>

          {/* Master toggles */}
          <section className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer bg-emerald-50 border border-emerald-200 rounded px-2 py-1.5">
              <input
                type="checkbox"
                checked={showAvuxi}
                onChange={(e) => setShowAvuxi(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="font-bold text-emerald-900">AVUXI ON</span>
            </label>
            <label className={cn(
              "flex items-center gap-2 border rounded px-2 py-1.5",
              manualAvailableForCity
                ? "cursor-pointer bg-amber-50 border-amber-200"
                : "cursor-not-allowed bg-slate-50 border-slate-200 opacity-60"
            )}>
              <input
                type="checkbox"
                checked={showManual && manualAvailableForCity}
                disabled={!manualAvailableForCity}
                onChange={(e) => setShowManual(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className={cn("font-bold", manualAvailableForCity ? "text-amber-900" : "text-slate-500")}>
                Manual {manualAvailableForCity ? "ON" : "N/A"}
              </span>
            </label>
          </section>

          {/* Manual sub-toggles · only when Manual master is ON */}
          {showManual && manualAvailableForCity && (
            <section className="bg-amber-50/50 border border-amber-200 rounded px-2 py-2 space-y-1">
              <p className="text-[9px] font-bold tracking-widest text-amber-900 uppercase">
                Manual layers (madrid hand-curated)
              </p>
              <label className="flex items-center justify-between text-[11px]">
                <span>Heatmap (21 POIs)</span>
                <input type="checkbox" checked={manualHeatmapOn} onChange={(e) => setManualHeatmapOn(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between text-[11px]">
                <span>Metro L1 + L6</span>
                <input type="checkbox" checked={manualMetroOn} onChange={(e) => setManualMetroOn(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between text-[11px]">
                <span>Almendra polygon</span>
                <input type="checkbox" checked={manualHistoricoOn} onChange={(e) => setManualHistoricoOn(e.target.checked)} />
              </label>
            </section>
          )}

          {/* Source-by-layer table */}
          <section>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              Layer source · current state
            </p>
            <table className="w-full text-[10px] border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-1.5 py-1 border-b border-slate-200">Capa</th>
                  <th className="text-center px-1 py-1 border-b border-slate-200 text-emerald-700">AVUXI</th>
                  <th className="text-center px-1 py-1 border-b border-slate-200 text-amber-700">Manual</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((l) => (
                  <tr key={l.key} className="border-b border-slate-100 last:border-0">
                    <td className="px-1.5 py-1 align-top">{l.label}</td>
                    <td className="px-1 py-1 text-center align-top">
                      {l.avuxi ? "✓" : <span className="text-slate-300">·</span>}
                    </td>
                    <td className="px-1 py-1 text-center align-top">
                      {l.manual ? "✓" : <span className="text-slate-300">·</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[9px] text-slate-500 mt-1 italic leading-snug">
              Layers con ✓ están renderizándose ahora mismo. Sin ✓ → no contribuyen al render actual.
            </p>
          </section>

          {/* Status */}
          <section className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              AVUXI lifecycle
            </p>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span>script:</span>
              <span className={cn("font-bold text-right", scriptStatus === "error" ? "text-rose-700" : scriptStatus === "loaded" ? "text-emerald-700" : "text-slate-600")}>{scriptStatus}</span>
              <span>mapStart:</span>
              <span className={cn("font-bold text-right", mapStartStatus === "error" ? "text-rose-700" : mapStartStatus === "called" ? "text-emerald-700" : "text-slate-600")}>{mapStartStatus}</span>
              <span>account:</span>
              <span className="font-bold text-right">{AVUXI_ACCOUNT_ID.slice(0, 8)}…</span>
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
              {events.length === 0 ? (
                <p className="text-slate-400">waiting…</p>
              ) : (
                events.slice(-15).map((e, i) => <div key={i}>{e}</div>)
              )}
            </div>
          </details>

          <p className="text-[9px] text-slate-500 leading-relaxed italic">
            Compara: AVUXI ON sobre cualquier ciudad mundial vs Manual ON disponible solo en Madrid.
            La asimetría es la prueba de escalabilidad. AVUXI bottom-up scales por algoritmo · Manual scales por trabajo humano por ciudad.
          </p>
        </div>
      </main>
    </div>
  );
}
