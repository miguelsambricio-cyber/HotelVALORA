"use client";

/**
 * /experiment-avuxi · QA #002+ functional prototype.
 *
 * Tests AVUXI Map Layers for Mapbox SDK as a candidate replacement for
 * the manually-curated heatmap / metro / centro-histórico overlays in
 * /compset. Boundary: this route does NOT touch /compset · operator
 * can compare side-by-side by opening both URLs in different tabs.
 *
 * Stack:
 *   · Same mapbox-gl + react-map-gl/mapbox base as the rest of the app
 *   · Same NEXT_PUBLIC_MAPBOX_TOKEN
 *   · Same Madrid default viewport
 *   · Same 18-hotel registry pins (so we can see if AVUXI's overlay
 *     conflicts visually with our institutional pin styling)
 *   · AVUXI Map Layers script loaded client-side via <script> injection
 *   · AVUXI.mapStart called against the underlying mapbox-gl Map instance
 *     obtained via mapRef.current.getMap()
 */

import { useEffect, useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, DEFAULT_VIEWPORT } from "@/lib/maps/map-config";
import { ALL_MADRID_AS_COMPETITORS } from "@/lib/api/compset";
import { HotelMarker } from "@/components/maps/hotel-marker";
import { LandingHeader } from "@/components/landing/landing-header";

// AVUXI account ID from the user's reference snippet · public widget
// identifier · safe to commit (same posture as the public Mapbox token).
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

export default function ExperimentAvuxiPage() {
  const mapRef = useRef<MapRef>(null);
  const [scriptStatus, setScriptStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [mapStartStatus, setMapStartStatus] = useState<"idle" | "called" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAvuxi, setShowAvuxi] = useState(true);
  const [events, setEvents] = useState<string[]>([]);

  const log = (msg: string) => {
    // eslint-disable-next-line no-console
    console.log(`[avuxi-exp] ${msg}`);
    setEvents((p) => [...p, `${new Date().toISOString().slice(11, 23)} · ${msg}`]);
  };

  // Inject AVUXI script
  useEffect(() => {
    if (!showAvuxi) return;
    if (window.AVUXI) {
      setScriptStatus("loaded");
      return;
    }
    setScriptStatus("loading");
    log(`injecting AVUXI script (${AVUXI_SCRIPT_URL})`);
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
    return () => {
      // Don't remove on toggle off · the AVUXI global stays attached. Just
      // leave it so toggle-back-on doesn't re-inject. Idempotent if mounted.
    };
  }, [showAvuxi]);

  // Call mapStart once both the script and the Mapbox map are ready
  useEffect(() => {
    if (!showAvuxi) return;
    if (scriptStatus !== "loaded") return;
    if (mapStartStatus !== "idle") return;
    if (!window.AVUXI) {
      setMapStartStatus("error");
      setErrorMessage("window.AVUXI not present after script load");
      return;
    }
    const ref = mapRef.current;
    if (!ref) {
      log("mapRef not ready yet · waiting for next render");
      return;
    }
    const mapInstance = ref.getMap();
    try {
      log("calling AVUXI.mapStart(map, accountId, options)");
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
  }, [scriptStatus, mapStartStatus, showAvuxi]);

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
              initialViewState={DEFAULT_VIEWPORT}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/light-v11"
              attributionControl={false}
              reuseMaps
              onLoad={() => log("mapbox-gl onLoad fired")}
              onStyleData={() => log("mapbox-gl onStyleData fired")}
              onError={(e) => log(`mapbox-gl onError: ${e?.error?.message ?? "unknown"}`)}
            >
              {ALL_MADRID_AS_COMPETITORS.map((h) => (
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

        {/* Control panel · bottom-left */}
        <div className="absolute bottom-4 left-4 z-30 max-w-md bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-xl p-4 space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">AVUXI · prototype</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAvuxi}
                onChange={(e) => setShowAvuxi(e.target.checked)}
                className="w-3.5 h-3.5"
              />
              <span className="text-[11px]">enable</span>
            </label>
          </div>

          <table className="w-full border border-slate-200">
            <tbody>
              <tr>
                <td className="px-2 py-1 border-b border-slate-100">script</td>
                <td className={`px-2 py-1 border-b border-slate-100 font-bold ${scriptStatus === "error" ? "text-rose-700" : scriptStatus === "loaded" ? "text-emerald-700" : ""}`}>
                  {scriptStatus}
                </td>
              </tr>
              <tr>
                <td className="px-2 py-1 border-b border-slate-100">mapStart</td>
                <td className={`px-2 py-1 border-b border-slate-100 font-bold ${mapStartStatus === "error" ? "text-rose-700" : mapStartStatus === "called" ? "text-emerald-700" : ""}`}>
                  {mapStartStatus}
                </td>
              </tr>
              <tr>
                <td className="px-2 py-1">account id</td>
                <td className="px-2 py-1 font-bold">{AVUXI_ACCOUNT_ID.slice(0, 8)}…</td>
              </tr>
            </tbody>
          </table>

          {errorMessage && (
            <p className="text-rose-700 text-[11px] bg-rose-50 border border-rose-200 px-2 py-1 rounded">
              {errorMessage}
            </p>
          )}

          <div>
            <p className="font-bold text-[11px] mb-1">Event log</p>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] leading-relaxed max-h-32 overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-slate-400">waiting…</p>
              ) : (
                events.slice(-12).map((e, i) => <div key={i}>{e}</div>)
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            Comparison: open <code className="bg-slate-100 px-1 rounded">/compset</code> in another tab.
            The AVUXI widget mounts its OWN toggle UI (top-right) when script + mapStart succeed.
            Hotel pins are the institutional registry (18 Madrid hotels) so visual conflicts with the
            AVUXI overlay are also testable.
          </p>
        </div>
      </main>
    </div>
  );
}
