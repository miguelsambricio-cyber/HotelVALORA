"use client";

/**
 * QA #002 · isolated diagnostic page for the Mapbox base-map regression.
 *
 * Renders the absolute minimum Mapbox GL setup possible:
 *   · Direct <Map> from react-map-gl/mapbox · no <CompsetMapGL> wrapper
 *   · No markers · no overlays · no custom layers · no dynamic import
 *   · Verbose lifecycle logging + visible status surface
 *
 * Why: the production /compset shows pins + watermark but no tiles. If
 * THIS page shows tiles correctly, the regression is inside the custom
 * CompsetMapGL pipeline. If THIS page also fails, the issue is global
 * (token · CSP · network · bundling).
 *
 * Visit https://www.hotelvalora.com/diagnose-map after deploy.
 */

import { useEffect, useState } from "react";
import Map from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN, MAPBOX_TOKEN_DIAGNOSTICS } from "@/lib/maps/map-config";

// Use the same normalised token the rest of the app uses · so the
// diagnostic page reflects the actual code path.
const TOKEN = MAPBOX_TOKEN;
const STYLE = "mapbox://styles/mapbox/light-v11";

interface ProbeResult {
  name: string;
  status: number | string;
  ok: boolean;
}

export default function DiagnoseMapPage() {
  const [events, setEvents] = useState<string[]>([]);
  const [probes, setProbes] = useState<ProbeResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const log = (msg: string) => {
    // eslint-disable-next-line no-console
    console.log(`[diagnose-map] ${msg}`);
    setEvents((prev) => [...prev, `${new Date().toISOString().slice(11, 23)} · ${msg}`]);
  };

  useEffect(() => {
    log(`token=${TOKEN ? `present (${TOKEN.length} chars, prefix=${TOKEN.slice(0, 6)}…)` : "MISSING"}`);
    if (!TOKEN) return;

    const tests = [
      { name: "style.json", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${TOKEN}` },
      { name: "sprite.json", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/sprite@2x.json?access_token=${TOKEN}` },
      { name: "sprite.png", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/sprite@2x.png?access_token=${TOKEN}` },
      { name: "tile/14/8044/6212", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/14/8044/6212?access_token=${TOKEN}` },
      { name: "static.png madrid", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/static/-3.7038,40.4168,14/200x200?access_token=${TOKEN}` },
    ];

    (async () => {
      const results: ProbeResult[] = [];
      for (const t of tests) {
        try {
          const r = await fetch(t.url, { method: "GET" });
          results.push({ name: t.name, status: r.status, ok: r.ok });
          log(`probe ${t.name} → ${r.status}`);
        } catch (e) {
          results.push({ name: t.name, status: `ERR ${(e as Error).message?.slice(0, 60)}`, ok: false });
          log(`probe ${t.name} → ERR ${(e as Error).message?.slice(0, 60)}`);
        }
      }
      setProbes(results);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-white p-6 font-mono text-xs">
      <h1 className="text-lg font-bold mb-4">/diagnose-map · QA #002</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map area */}
        <div className="relative w-full h-[500px] bg-slate-200 border border-slate-300 overflow-hidden">
          {!TOKEN && (
            <div className="absolute inset-0 flex items-center justify-center text-rose-700 font-bold">
              NEXT_PUBLIC_MAPBOX_TOKEN missing
            </div>
          )}
          {TOKEN && (
            <Map
              mapboxAccessToken={TOKEN}
              initialViewState={{ longitude: -3.7038, latitude: 40.4168, zoom: 14 }}
              style={{ width: "100%", height: "100%" }}
              mapStyle={STYLE}
              onLoad={() => log("Map onLoad fired")}
              onStyleData={() => log("Map onStyleData fired")}
              onSourceData={(e) => {
                if (e?.isSourceLoaded) log(`source loaded: ${e.sourceId}`);
              }}
              onError={(e) => {
                const msg = e?.error?.message ?? "unknown error";
                log(`Map onError: ${msg}`);
                setError(msg);
              }}
            />
          )}
          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold px-3 py-2 rounded-md shadow-lg">
              Error: {error}
            </div>
          )}
        </div>

        {/* Diagnostic feed */}
        <div className="space-y-4">
          <section>
            <h2 className="font-bold mb-2 text-sm">Token · normalisation report</h2>
            <table className="w-full text-[10px] border border-slate-300">
              <tbody>
                {([
                  ["raw length", String(MAPBOX_TOKEN_DIAGNOSTICS.rawLength)],
                  ["normalised length", String(MAPBOX_TOKEN_DIAGNOSTICS.normalisedLength)],
                  ["stripped invisible chars", String(MAPBOX_TOKEN_DIAGNOSTICS.strippedCount)],
                  [
                    "raw first codepoint",
                    MAPBOX_TOKEN_DIAGNOSTICS.rawFirstCodepoint !== null
                      ? `0x${MAPBOX_TOKEN_DIAGNOSTICS.rawFirstCodepoint.toString(16).toUpperCase()} (${MAPBOX_TOKEN_DIAGNOSTICS.rawFirstCodepoint})`
                      : "null",
                  ],
                  [
                    "raw last codepoint",
                    MAPBOX_TOKEN_DIAGNOSTICS.rawLastCodepoint !== null
                      ? `0x${MAPBOX_TOKEN_DIAGNOSTICS.rawLastCodepoint.toString(16).toUpperCase()} (${MAPBOX_TOKEN_DIAGNOSTICS.rawLastCodepoint})`
                      : "null",
                  ],
                  ["normalised prefix", MAPBOX_TOKEN_DIAGNOSTICS.normalisedPrefix + "…"],
                  ["normalised suffix", "…" + MAPBOX_TOKEN_DIAGNOSTICS.normalisedSuffix],
                ] as const).map(([k, v]) => (
                  <tr key={k} className={k === "stripped invisible chars" && MAPBOX_TOKEN_DIAGNOSTICS.strippedCount > 0 ? "bg-amber-50" : ""}>
                    <td className="px-2 py-1 border-b border-slate-100">{k}</td>
                    <td className="px-2 py-1 border-b border-slate-100 font-bold">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {MAPBOX_TOKEN_DIAGNOSTICS.strippedCount > 0 && (
              <p className="text-[10px] text-amber-900 mt-1 font-semibold">
                ⚠ {MAPBOX_TOKEN_DIAGNOSTICS.strippedCount} invisible char(s) stripped from raw token · clean token now in use.
              </p>
            )}
          </section>

          <section>
            <h2 className="font-bold mb-2 text-sm">Probes · client-side fetch</h2>
            <table className="w-full text-[10px] border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="text-left px-2 py-1 border-b border-slate-300">endpoint</th>
                  <th className="text-left px-2 py-1 border-b border-slate-300">status</th>
                </tr>
              </thead>
              <tbody>
                {probes.length === 0 && (
                  <tr><td colSpan={2} className="px-2 py-2 text-slate-400">running…</td></tr>
                )}
                {probes.map((p) => (
                  <tr key={p.name} className={p.ok ? "" : "bg-rose-50"}>
                    <td className="px-2 py-1 border-b border-slate-100">{p.name}</td>
                    <td className="px-2 py-1 border-b border-slate-100 font-bold">{String(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2 className="font-bold mb-2 text-sm">Event log</h2>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] leading-relaxed max-h-[300px] overflow-y-auto">
              {events.length === 0 ? (
                <p className="text-slate-400">waiting for events…</p>
              ) : (
                events.map((e, i) => (
                  <div key={i}>{e}</div>
                ))
              )}
            </div>
          </section>

          <section className="text-[10px] text-slate-500">
            <p><strong>Expected (all probes 200, Map renders Madrid):</strong> token + URL + scope all OK.</p>
            <p><strong>style 200 + tile 401/403:</strong> token missing styles:tiles scope.</p>
            <p><strong>style 401/403:</strong> token URL/origin restricted.</p>
            <p><strong>All probes ERR:</strong> network / CORS / firewall block.</p>
            <p><strong>Probes 200 + Map onStyleData never fires:</strong> mapbox-gl bundle corrupt.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
