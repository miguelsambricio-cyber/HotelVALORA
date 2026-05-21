"use client";

/**
 * /experiment-avuxi · v5 · accountId configuration + full network interception.
 *
 * Operator confirmed (2026-05-21) the AVUXI account dashboard shows
 * "Active". The previous prototype was using the accountId from the
 * documentation reference snippet (67d80ff2-d56c-4d93-ab90-87e4f8abd043)
 * which is likely a PUBLIC DEMO accountId · NOT the operator's actual
 * account. A demo accountId may load the SDK successfully but the
 * AVUXI backend will reject data requests from unauthorised domains.
 *
 * v5 adds:
 *   1. Configurable accountId · text input + localStorage persistence
 *   2. Fetch + XHR globally wrapped for *.avuxi.com to capture URL ·
 *      HTTP status · response body preview · timing
 *   3. "Re-init mapStart" button that re-applies with the current
 *      accountId without a page reload
 *   4. Visible accountId banner so the operator confirms which ID is
 *      in play at any moment
 *   5. "Validate accountId" probe button that fires a manual fetch to
 *      api.avuxi.com with the current ID to test authorization
 *
 * v4 race-fix (mapReady state + guard logging) is preserved.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Map, { type MapRef } from "react-map-gl/mapbox";
// Import mapbox-gl explicitly · we MUST pass the namespace to AVUXI.mapStart
// as the second argument. react-map-gl imports mapbox-gl internally but
// doesn't attach to window.mapboxgl · so we import + pass directly.
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/maps/map-config";
import { ALL_MADRID_AS_COMPETITORS } from "@/lib/api/compset";
import { HotelMarker } from "@/components/maps/hotel-marker";
import { LandingHeader } from "@/components/landing/landing-header";
import { cn } from "@/lib/utils";

// AVUXI · operator-provisioned scriptId for the HotelVALORA project ·
// product "Map Layers for Mapbox" (NOT the Google Maps variant) ·
// confirmed enabled in the AVUXI dashboard 2026-05-21. The previous
// demo id (67d80ff2-…) from the documentation snippet has been removed.
const OFFICIAL_SCRIPT_ID = "fad4d930-e615-4c0c-9d15-e5f8fdd2224a";
const SCRIPT_TYPE_LABEL = "Map Layers for Mapbox";
const ACCOUNT_ID_STORAGE_KEY = "hotelvalora.avuxi.scriptId.v2"; // v2 · bust v1 demo cache
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
      // 4-arg signature per the operator's AVUXI dashboard reference:
      //   (map, mapboxgl-namespace, scriptId, options)
      mapStart: (
        mapInstance: unknown,
        mapboxglNamespace: unknown,
        scriptId: string,
        options: AVUXIOptions,
      ) => void;
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
];

/**
 * Institutional category curation · QA #002 final UX.
 *
 * v8 selectors · confirmed via SDK source audit (grep on the minified
 * bundle of map-layers-for-mapbox.js):
 *
 *   AVUXI category buttons use CLASS TEMPLATING (no data-* attributes):
 *     .category-btn-container-{name}     · heatmap variant
 *     .category-btn-t-container-{name}   · transport variant
 *
 *   Metro is a separate element keyed by id:
 *     id="category-control-container-metro-button{n}"
 *
 *   Internal category keys: eating · food · nightlife · shopping ·
 *   sightseeing · transport (NO "parks", NO "metro" as a heatmap key).
 *
 * Single source of truth · to RE-ENABLE a category in the future,
 * change its label from `null` to a string. The implementation reads
 * this config at runtime · no other code change needed.
 */
const INSTITUTIONAL_CATEGORIES: Record<string, string | null> = {
  sightseeing: "Atracción turística",
  eating: "Gastronomía",
  food: "Gastronomía",          // AVUXI alias · same Spanish label
  transport: "Conectividad",
  metro: "Conectividad",        // SDK has separate metro button · same label
  // Hidden for institutional underwriting view · flip to a label string to re-enable
  shopping: null,
  nightlife: null,
  parks: null,                  // not in current SDK keys but reserved for future
};

/** Selectors that match AVUXI category container elements. */
const AVUXI_CONTAINER_PATTERNS = [
  /^category-btn-container-(.+)$/,
  /^category-btn-t-container-(.+)$/,
];

const AVUXI_METRO_ID_PREFIX = "category-control-container-metro-button";

interface ResourceEvent {
  ts: string;
  url: string;
  duration: number;
  size: number;
}

interface InterceptedRequest {
  ts: string;
  url: string;
  via: string; // "fetch" | "xhr" — relaxed to string for inference simplicity
  status: number;
  ok: boolean;
  elapsedMs: number;
  body: string;
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

function isAvuxiUrl(url: string): boolean {
  return AVUXI_HOSTS.some((h) => url.includes(h));
}

export default function ExperimentAvuxiPage() {
  const mapRef = useRef<MapRef>(null);
  const [scriptStatus, setScriptStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [mapStartStatus, setMapStartStatus] = useState<"idle" | "called" | "error">("idle");
  const [mapReady, setMapReady] = useState(false);
  const [avuxiGlobalReady, setAvuxiGlobalReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [cityId, setCityId] = useState("madrid");

  // v6 · scriptId default is the operator's official Map Layers for Mapbox.
  // localStorage from prior demo-id sessions is invalidated via the v2 key.
  const [accountId, setAccountId] = useState<string>(OFFICIAL_SCRIPT_ID);
  const [accountIdDraft, setAccountIdDraft] = useState<string>(OFFICIAL_SCRIPT_ID);

  // v5 · network interception
  const [interceptions, setInterceptions] = useState<InterceptedRequest[]>([]);

  // PerformanceObserver counters (kept from v3)
  const [avuxiRequests, setAvuxiRequests] = useState<ResourceEvent[]>([]);
  const [mapboxSourcesCount, setMapboxSourcesCount] = useState(0);
  const [mapboxLayersCount, setMapboxLayersCount] = useState(0);
  const [avuxiDomElements, setAvuxiDomElements] = useState(0);
  const [avuxiCategoryButtons, setAvuxiCategoryButtons] = useState<string[]>([]);
  const [categorySnapshots, setCategorySnapshots] = useState<CategorySnapshot[]>([]);
  const [categoryProgress, setCategoryProgress] = useState<string | null>(null);

  const city = CITIES.find((c) => c.id === cityId) ?? CITIES[0];

  // Ensure window.mapboxgl is present · the AVUXI SDK and the sandbox
  // HTML both reference it. react-map-gl bundles mapbox-gl internally
  // but does NOT attach to window. We mirror the sandbox setup here.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).mapboxgl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mapboxgl = mapboxgl;
    }
  }, []);

  const log = useCallback((msg: string) => {
    // eslint-disable-next-line no-console
    console.log(`[avuxi-exp] ${msg}`);
    setEvents((p) => [...p, `${new Date().toISOString().slice(11, 23)} · ${msg}`].slice(-60));
  }, []);

  // ─── Hydrate scriptId from localStorage on mount (v2 key) ────────────
  // Bust any stale demo-id from the previous experiment by removing
  // the v1 key. Only the new v2 key (post-2026-05-21) is honoured.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Force-clear the deprecated v1 key once · prevents stale demo id resurrection
    try { localStorage.removeItem("hotelvalora.avuxi.accountId"); } catch { /* noop */ }
    const stored = localStorage.getItem(ACCOUNT_ID_STORAGE_KEY);
    if (stored && stored.length > 0 && stored !== "67d80ff2-d56c-4d93-ab90-87e4f8abd043") {
      setAccountId(stored);
      setAccountIdDraft(stored);
      log(`scriptId hydrated from localStorage v2: ${stored.slice(0, 8)}…`);
    } else {
      log(`scriptId default: ${OFFICIAL_SCRIPT_ID.slice(0, 8)}…${OFFICIAL_SCRIPT_ID.slice(-4)} (operator official · ${SCRIPT_TYPE_LABEL})`);
    }
  }, [log]);

  // ─── Network interception · fetch + XHR globally wrapped for *.avuxi.com ──
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Wrap fetch
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
      if (!isAvuxiUrl(url)) return originalFetch(input, init);

      const ts = new Date().toISOString().slice(11, 23);
      const start = performance.now();
      try {
        const response = await originalFetch(input, init);
        try {
          const cloned = response.clone();
          const text = await cloned.text();
          const truncated = text.length > 240 ? text.slice(0, 237) + "…" : text;
          setInterceptions((p) => [...p, {
            ts, via: "fetch",
            url: url.length > 90 ? url.slice(0, 87) + "…" : url,
            status: response.status,
            ok: response.ok,
            elapsedMs: Math.round(performance.now() - start),
            body: truncated || "(empty body)",
          }].slice(-25));
        } catch {
          setInterceptions((p) => [...p, {
            ts, via: "fetch",
            url: url.length > 90 ? url.slice(0, 87) + "…" : url,
            status: response.status, ok: response.ok,
            elapsedMs: Math.round(performance.now() - start),
            body: "(body read failed)",
          }].slice(-25));
        }
        return response;
      } catch (e) {
        setInterceptions((p) => [...p, {
          ts, via: "fetch",
          url: url.length > 90 ? url.slice(0, 87) + "…" : url,
          status: 0, ok: false,
          elapsedMs: Math.round(performance.now() - start),
          body: `FETCH ERROR: ${(e as Error).message}`,
        }].slice(-25));
        throw e;
      }
    };

    // Wrap XHR
    const OriginalXHR = window.XMLHttpRequest;
    function PatchedXHR(this: XMLHttpRequest) {
      const xhr = new OriginalXHR();
      let capturedUrl = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalOpen = xhr.open;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (xhr as any).open = function (method: string, url: string | URL, ...rest: unknown[]) {
        capturedUrl = typeof url === "string" ? url : url.href;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (originalOpen as any).apply(xhr, [method, capturedUrl, ...rest]);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalSend = xhr.send;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (xhr as any).send = function (body?: any) {
        const ts = new Date().toISOString().slice(11, 23);
        const start = performance.now();
        if (capturedUrl && isAvuxiUrl(capturedUrl)) {
          xhr.addEventListener("loadend", () => {
            let preview = "";
            try { preview = String(xhr.responseText ?? "").slice(0, 240); }
            catch { preview = "(responseText not accessible)"; }
            setInterceptions((p) => [...p, {
              ts, via: "xhr",
              url: capturedUrl.length > 90 ? capturedUrl.slice(0, 87) + "…" : capturedUrl,
              status: xhr.status,
              ok: xhr.status >= 200 && xhr.status < 300,
              elapsedMs: Math.round(performance.now() - start),
              body: preview || "(empty body)",
            }].slice(-25));
          });
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (originalSend as any).call(xhr, body);
      };
      return xhr;
    }
    (PatchedXHR as unknown as { prototype: XMLHttpRequest }).prototype = OriginalXHR.prototype;
    window.XMLHttpRequest = PatchedXHR as unknown as typeof XMLHttpRequest;

    log("fetch + XHR interceptors active for *.avuxi.com");

    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = OriginalXHR;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── PerformanceObserver · capture *.avuxi.com via Resource Timing ───
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceResourceTiming;
        if (!isAvuxiUrl(e.name)) continue;
        setAvuxiRequests((p) => [...p, {
          ts: new Date().toISOString().slice(11, 23),
          url: e.name.length > 80 ? e.name.slice(0, 77) + "…" : e.name,
          duration: Math.round(e.duration),
          size: e.transferSize ?? 0,
        }].slice(-30));
      }
    });
    observer.observe({ type: "resource", buffered: true });
    return () => observer.disconnect();
  }, []);

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
      } catch { /* style loading */ }
    }, 700);
    return () => window.clearInterval(id);
  }, []);

  // ─── v8 · Institutional curation with REAL selectors from SDK audit ───
  // AVUXI uses class templating: .category-btn-container-{name}
  // No data-* attributes. Live counters for found/hidden/relabeled +
  // DOM inspector of every AVUXI element rendered.
  const [curationStats, setCurationStats] = useState<{
    foundContainers: number;
    foundButtons: number;
    foundMetro: number;
    detected: { selector: string; category: string; visible: boolean }[];
    inspector: { tag: string; classes: string; id: string; ariaLabel: string; text: string }[];
  }>({
    foundContainers: 0, foundButtons: 0, foundMetro: 0, detected: [], inspector: [],
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const style = document.createElement("style");
    style.id = "hv-avuxi-institutional";
    style.textContent = `
      [data-hv-hidden="true"] {
        display: none !important;
        visibility: hidden !important;
      }
      [data-hv-relabeled="true"] {
        position: relative !important;
      }
      [data-hv-relabeled="true"] > *:not([data-hv-label]):not(style):not(script) {
        opacity: 0 !important;
        pointer-events: none !important;
      }
      [data-hv-label] {
        position: absolute !important;
        inset: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 9px !important;
        font-weight: 700 !important;
        color: #0E4B31 !important;
        padding: 4px 6px !important;
        letter-spacing: 0.03em !important;
        text-align: center !important;
        line-height: 1.1 !important;
        background: white !important;
        border-radius: inherit !important;
        z-index: 10 !important;
      }
    `;
    document.head.appendChild(style);

    /**
     * Identify category from an element's class list using the templated
     * patterns AVUXI generates · returns null if not an AVUXI category container.
     */
    function categoryFromClasses(el: HTMLElement): string | null {
      for (const cls of Array.from(el.classList)) {
        for (const pattern of AVUXI_CONTAINER_PATTERNS) {
          const m = cls.match(pattern);
          if (m) return m[1].toLowerCase();
        }
      }
      return null;
    }

    function applyInstitutional() {
      // 1. Find all category buttons via class-templating (v8 selectors)
      const allEls = document.querySelectorAll<HTMLElement>(
        "[class*='category-btn-container-'], [class*='category-btn-t-container-']"
      );
      const detected: { selector: string; category: string; visible: boolean }[] = [];

      allEls.forEach((el) => {
        const category = categoryFromClasses(el);
        if (!category) return;

        const label = INSTITUTIONAL_CATEGORIES[category];
        if (label === undefined) {
          // Unknown category · log but leave alone
          detected.push({ selector: "category-btn-container-" + category, category, visible: true });
          return;
        }

        if (label === null) {
          // Hide
          el.setAttribute("data-hv-hidden", "true");
          detected.push({ selector: "category-btn-container-" + category, category, visible: false });
          return;
        }

        // Relabel · idempotent
        el.setAttribute("data-hv-relabeled", "true");
        el.removeAttribute("data-hv-hidden");
        el.setAttribute("aria-label", label);
        el.setAttribute("title", label);

        let labelEl = el.querySelector<HTMLElement>("[data-hv-label]");
        if (!labelEl) {
          labelEl = document.createElement("span");
          labelEl.setAttribute("data-hv-label", "true");
          el.appendChild(labelEl);
        }
        if (labelEl.textContent !== label) {
          labelEl.textContent = label;
        }
        detected.push({ selector: "category-btn-container-" + category, category, visible: true });
      });

      // 2. Metro button · separate element identified by id prefix
      const metroEls = document.querySelectorAll<HTMLElement>(
        "[id^='" + AVUXI_METRO_ID_PREFIX + "']"
      );
      metroEls.forEach((el) => {
        const label = INSTITUTIONAL_CATEGORIES["metro"];
        if (label === null) {
          el.setAttribute("data-hv-hidden", "true");
          return;
        }
        if (label !== undefined) {
          el.setAttribute("data-hv-relabeled", "true");
          el.removeAttribute("data-hv-hidden");
          el.setAttribute("aria-label", label);
          el.setAttribute("title", label);
          let labelEl = el.querySelector<HTMLElement>("[data-hv-label]");
          if (!labelEl) {
            labelEl = document.createElement("span");
            labelEl.setAttribute("data-hv-label", "true");
            el.appendChild(labelEl);
          }
          if (labelEl.textContent !== label) {
            labelEl.textContent = label;
          }
        }
      });

      // 3. Inspector · capture full snapshot of all AVUXI-related elements
      const inspectorEls = document.querySelectorAll<HTMLElement>(
        "[class*='category-'], [id*='category-']"
      );
      const inspector = Array.from(inspectorEls).slice(0, 30).map((el) => ({
        tag: el.tagName.toLowerCase(),
        classes: el.className && typeof el.className === "string"
          ? el.className.split(/\s+/).filter((c) => c.includes("category")).join(" ")
          : "",
        id: el.id || "",
        ariaLabel: el.getAttribute("aria-label") || "",
        text: (el.textContent || "").trim().slice(0, 30),
      }));

      setCurationStats({
        foundContainers: document.querySelectorAll(".category-btns-container").length,
        foundButtons: allEls.length,
        foundMetro: metroEls.length,
        detected,
        inspector,
      });
    }

    applyInstitutional();
    const mo = new MutationObserver(() => queueMicrotask(applyInstitutional));
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      style.remove();
    };
  }, []);

  // ─── Inject AVUXI script (only once) ─────────────────────────────────
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
      let attempts = 0;
      const probe = window.setInterval(() => {
        attempts++;
        if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
          log(`window.AVUXI detected (attempt ${attempts})`);
          setAvuxiGlobalReady(true);
          window.clearInterval(probe);
        } else if (attempts >= 30) {
          log(`window.AVUXI never appeared after ${attempts * 100}ms`);
          window.clearInterval(probe);
          setErrorMessage("Script loaded but window.AVUXI never appeared");
        }
      }, 100);
    };
    script.onerror = () => {
      log("script.onerror fired");
      setScriptStatus("error");
      setErrorMessage("Failed to load AVUXI script");
    };
    document.body.appendChild(script);
  }, [log]);

  // ─── mapStart caller · uses CURRENT accountId from state ─────────────
  const callMapStart = useCallback(() => {
    log("callMapStart entered");
    if (mapStartStatus !== "idle") {
      log(`SKIP · mapStartStatus is "${mapStartStatus}"`);
      return false;
    }
    if (typeof window === "undefined") {
      log("SKIP · no window");
      return false;
    }
    if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") {
      log("SKIP · window.AVUXI.mapStart not present");
      return false;
    }
    const ref = mapRef.current;
    if (!ref) {
      log("SKIP · mapRef.current null");
      return false;
    }
    const mapInstance = ref.getMap();
    if (!mapInstance) {
      log("SKIP · ref.getMap() null");
      return false;
    }
    if (typeof mapInstance.loaded === "function" && !mapInstance.loaded()) {
      log("SKIP · mapInstance.loaded() false");
      return false;
    }
    try {
      // 4-arg signature per AVUXI dashboard reference (verified 2026-05-21):
      //   AVUXI.mapStart(mapInstance, mapboxgl-namespace, scriptId, options)
      // mapboxgl is imported from "mapbox-gl" at module scope · must be
      // the SAME module instance react-map-gl uses internally (same import).
      log(`calling AVUXI.mapStart(map, mapboxgl, "${accountId.slice(0, 8)}…${accountId.slice(-4)}", options)`);
      log(`scriptId in use: ${accountId} · type: ${SCRIPT_TYPE_LABEL}`);
      window.AVUXI.mapStart(mapInstance, mapboxgl, accountId, {
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
      log("AVUXI.mapStart returned · awaiting AVUXI fetches…");
      return true;
    } catch (e) {
      const msg = (e as Error).message ?? String(e);
      log(`AVUXI.mapStart threw: ${msg}`);
      setMapStartStatus("error");
      setErrorMessage(`mapStart threw: ${msg}`);
      return false;
    }
  }, [mapStartStatus, accountId, log]);

  // Auto-fire when preconditions satisfied
  useEffect(() => {
    if (mapStartStatus !== "idle") return;
    if (!avuxiGlobalReady) return;
    if (!mapReady) return;
    log("preconditions OK · auto-calling mapStart");
    callMapStart();
  }, [avuxiGlobalReady, mapReady, mapStartStatus, callMapStart, log]);

  // ─── FlyTo city on change ────────────────────────────────────────────
  useEffect(() => {
    const m = mapRef.current?.getMap();
    if (!m) return;
    log(`flyTo ${city.label}`);
    m.flyTo({ center: [city.lng, city.lat], zoom: city.zoom, essential: true });
  }, [city.id, city.label, city.lng, city.lat, city.zoom, log]);

  // ─── Apply new accountId · reset mapStart + try again ────────────────
  const applyAccountId = useCallback(() => {
    const trimmed = accountIdDraft.trim();
    if (!trimmed) {
      setErrorMessage("accountId cannot be empty");
      return;
    }
    if (trimmed === accountId) {
      log("accountId unchanged · resetting mapStart anyway");
    } else {
      log(`accountId changed: ${trimmed.slice(0, 8)}…`);
      setAccountId(trimmed);
      if (typeof window !== "undefined") {
        localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, trimmed);
      }
    }
    setMapStartStatus("idle");
    setInterceptions([]);
    setCategorySnapshots([]);
    setAvuxiRequests([]);
    setTimeout(() => callMapStart(), 200);
  }, [accountIdDraft, accountId, callMapStart, log]);

  // ─── Validate accountId · manual probe to AVUXI ──────────────────────
  const validateAccountId = useCallback(async () => {
    const id = accountId;
    log(`probing accountId via direct fetch · ${id.slice(0, 8)}…`);
    // We don't know an exact validation endpoint · try the most likely
    // endpoint paths. The interception wrapper above will record the
    // status + body of whatever the server returns.
    const candidates = [
      `https://api.avuxi.com/v1/accounts/${id}`,
      `https://topplaces.avuxi.com/account/${id}`,
      `https://api.avuxi.com/v1/check?account=${id}`,
    ];
    for (const url of candidates) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _ = await fetch(url, { method: "GET" });
      } catch (e) {
        log(`probe ${url} → ${(e as Error).message}`);
      }
    }
  }, [accountId, log]);

  // ─── Programmatic category cycler ────────────────────────────────────
  const cycleCategories = useCallback(async () => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(AVUXI_BTN_SELECTOR));
    if (buttons.length === 0) {
      log("no AVUXI category buttons found");
      return;
    }
    log(`cycling ${buttons.length} categories`);
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
  }, [avuxiRequests.length, log]);

  const avuxiActive =
    scriptStatus === "loaded" &&
    mapStartStatus === "called" &&
    avuxiDomElements > 0;
  const isOfficialScriptId = accountId === OFFICIAL_SCRIPT_ID;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800">
      <LandingHeader />
      <main className="flex-grow relative overflow-hidden">
        {/* Map · v5 fix · explicit container id required by AVUXI SDK.
         *  The SDK reads `map.getContainer().id` as the FIRST operation in
         *  mapStart. Without an id, the SDK no-ops silently · explains
         *  DOM mounted = no even with all preconditions green. */}
        <div id="avuxi-map-host" className="absolute inset-0 z-0 bg-slate-200">
          {MAPBOX_TOKEN ? (
            <Map
              id="avuxi-map"
              ref={mapRef}
              mapboxAccessToken={MAPBOX_TOKEN}
              initialViewState={{ longitude: city.lng, latitude: city.lat, zoom: city.zoom, pitch: 0, bearing: 0 }}
              style={{ width: "100%", height: "100%" }}
              mapStyle="mapbox://styles/mapbox/light-v11"
              attributionControl={false}
              reuseMaps
              onLoad={() => {
                log("mapbox-gl onLoad");
                setMapReady(true);
                // Diagnostic · log the actual container id the SDK will read
                const m = mapRef.current?.getMap();
                const containerId = m?.getContainer()?.id ?? "(none)";
                log(`map container id: "${containerId}" · empty means SDK no-ops`);
              }}
              onError={(e) => log(`mapbox-gl onError: ${e?.error?.message ?? "unknown"}`)}
            >
              {city.id === "madrid" &&
                ALL_MADRID_AS_COMPETITORS.map((h) => (
                  <HotelMarker key={h.id} hotel={h} type="explore" isSelected={false} onSelect={() => { /* read-only */ }} />
                ))}
            </Map>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-rose-700 font-bold">
              NEXT_PUBLIC_MAPBOX_TOKEN missing
            </div>
          )}
        </div>

        {/* Top-left badges */}
        <div className="absolute top-4 left-4 z-30 flex flex-col gap-1 text-[10px] font-mono pointer-events-none">
          <span className={cn("px-2 py-1 rounded shadow border font-bold",
            avuxiActive ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                        : "bg-rose-50 border-rose-300 text-rose-900")}>
            AVUXI: {avuxiActive ? "ACTIVE" : "INACTIVE"}
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700">
            req: <strong className={avuxiRequests.length > 0 ? "text-emerald-700" : "text-rose-700"}>{avuxiRequests.length}</strong>
            {" · "}intcp: <strong className={interceptions.length > 0 ? "text-emerald-700" : "text-rose-700"}>{interceptions.length}</strong>
            {" · "}src: <strong>{mapboxSourcesCount}</strong>
            {" · "}lyr: <strong>{mapboxLayersCount}</strong>
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700">
            DOM: <strong className={avuxiDomElements > 0 ? "text-emerald-700" : "text-rose-700"}>{avuxiDomElements}</strong>
            {" · "}btns: <strong>{avuxiCategoryButtons.length}</strong>
          </span>
          <span className={cn(
            "px-2 py-1 rounded shadow border font-bold",
            isOfficialScriptId ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                : "bg-amber-50 border-amber-300 text-amber-900"
          )}>
            scriptId: {accountId}
          </span>
          <span className="px-2 py-1 rounded shadow border bg-white border-slate-200 text-slate-700 font-bold">
            type: {SCRIPT_TYPE_LABEL}
          </span>
          <span className="px-2 py-1 rounded shadow border bg-emerald-50 border-emerald-300 text-emerald-900 font-bold">
            institutional view · 3 of 6 AVUXI categories visible
          </span>
        </div>

        {/* Panel · v5 */}
        <div className="absolute bottom-4 left-4 z-30 w-[min(500px,calc(100vw-2rem))] bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-xl p-3 space-y-3 text-xs font-mono max-h-[90vh] overflow-y-auto">
          <p className="font-bold text-sm">AVUXI · evidence v5 · accountId + network interception</p>

          {/* Institutional category curation v8 · with live DOM inspection */}
          <section className="bg-forest-900/[0.04] border border-forest-900/20 rounded p-2 space-y-2">
            <p className="text-[10px] font-bold tracking-widest text-forest-900 uppercase">
              Institutional view · live curation
            </p>

            {/* Counters · what the curation actually found in the DOM */}
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div className={cn("px-1.5 py-1 border rounded text-center",
                curationStats.foundContainers > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900")}>
                <div className="font-bold">{curationStats.foundContainers}</div>
                <div className="text-[9px]">btns-container</div>
              </div>
              <div className={cn("px-1.5 py-1 border rounded text-center",
                curationStats.foundButtons > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900")}>
                <div className="font-bold">{curationStats.foundButtons}</div>
                <div className="text-[9px]">cat buttons</div>
              </div>
              <div className={cn("px-1.5 py-1 border rounded text-center",
                curationStats.foundMetro > 0 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-amber-50 border-amber-200 text-amber-900")}>
                <div className="font-bold">{curationStats.foundMetro}</div>
                <div className="text-[9px]">metro buttons</div>
              </div>
            </div>

            {/* Detected categories with status */}
            {curationStats.detected.length > 0 && (
              <table className="w-full text-[10px] border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-1.5 py-1 text-left">Detected class</th>
                    <th className="px-1 py-1 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {curationStats.detected.map((d, i) => {
                    const label = INSTITUTIONAL_CATEGORIES[d.category];
                    return (
                      <tr key={i} className={cn(
                        "border-b border-slate-100",
                        label === null ? "bg-rose-50/60 text-rose-900" :
                        label === undefined ? "bg-amber-50 text-amber-900" :
                        "bg-emerald-50/60 text-emerald-900"
                      )}>
                        <td className="px-1.5 py-1 font-mono">.{d.selector}</td>
                        <td className="px-1.5 py-1 text-right font-semibold">
                          {label === null ? "✗ hidden" : label === undefined ? "? unknown" : "→ " + label}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Config reference · sortable table */}
            <details>
              <summary className="text-[10px] font-bold tracking-widest text-slate-500 uppercase cursor-pointer">
                Config (click to expand · {Object.keys(INSTITUTIONAL_CATEGORIES).length} entries)
              </summary>
              <table className="w-full text-[10px] border border-slate-200 mt-1">
                <tbody>
                  {Object.entries(INSTITUTIONAL_CATEGORIES).map(([key, label]) => (
                    <tr key={key} className={cn(
                      "border-b border-slate-100",
                      label === null ? "bg-slate-50 text-slate-400" : "bg-emerald-50/40 text-emerald-900"
                    )}>
                      <td className="px-1.5 py-1 font-mono">{key}</td>
                      <td className="px-1.5 py-1 text-right font-semibold">
                        {label === null ? "hidden" : "→ " + label}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>

            {/* DOM inspector · raw view of all AVUXI elements rendered */}
            <details>
              <summary className="text-[10px] font-bold tracking-widest text-slate-500 uppercase cursor-pointer">
                DOM inspector ({curationStats.inspector.length} category-* elements)
              </summary>
              <div className="bg-slate-900 text-slate-100 rounded p-2 text-[9px] leading-tight max-h-44 overflow-y-auto mt-1 font-mono">
                {curationStats.inspector.length === 0 ? (
                  <p className="text-slate-400">No category-* elements found yet · AVUXI may still be mounting.</p>
                ) : (
                  curationStats.inspector.map((el, i) => (
                    <div key={i} className="border-b border-slate-700 py-1">
                      <div><span className="text-amber-300">{el.tag}</span>{el.id && <span className="text-emerald-300"> #{el.id}</span>}</div>
                      {el.classes && <div className="text-slate-300 break-all">.{el.classes.replace(/\s+/g, " .")}</div>}
                      {el.ariaLabel && <div className="text-slate-400">aria-label: &quot;{el.ariaLabel}&quot;</div>}
                      {el.text && <div className="text-slate-500">text: &quot;{el.text}&quot;</div>}
                    </div>
                  ))
                )}
              </div>
            </details>

            <p className="text-[9px] text-slate-500 italic leading-snug">
              Selectors based on SDK source audit · class-templating (<code>category-btn-container-{`{name}`}</code>) ·
              NOT data-attributes. To re-enable a category flip <code>null</code> to a string.
            </p>
          </section>

          {/* ScriptId configuration · v6 · operator official Map Layers for Mapbox */}
          <section className={cn(
            "border rounded p-2 space-y-2",
            isOfficialScriptId ? "bg-emerald-50/40 border-emerald-200" : "bg-amber-50/40 border-amber-200"
          )}>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              Script · {SCRIPT_TYPE_LABEL}
            </p>
            <p className="text-[10px] text-slate-700 leading-snug font-mono break-all">
              {accountId}
            </p>
            <p className="text-[10px] text-slate-600 leading-snug">
              {isOfficialScriptId
                ? "✓ Using the operator-provisioned scriptId from the AVUXI dashboard."
                : "⚠ Custom scriptId in use. Click Reset to return to the official Mapbox scriptId."}
            </p>
            <input
              type="text"
              value={accountIdDraft}
              onChange={(e) => setAccountIdDraft(e.target.value)}
              placeholder="Paste a different scriptId to test"
              className="w-full px-2 py-1.5 text-[11px] font-mono border border-slate-300 rounded"
            />
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={applyAccountId}
                className="px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-forest-900 text-white hover:brightness-110"
              >
                Apply + reinit
              </button>
              <button
                type="button"
                onClick={() => { setAccountIdDraft(OFFICIAL_SCRIPT_ID); }}
                className="px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Reset official
              </button>
              <button
                type="button"
                onClick={validateAccountId}
                className="px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white hover:bg-blue-700"
              >
                Probe AVUXI
              </button>
            </div>
            <p className="text-[9px] text-slate-500 leading-snug italic">
              Default scriptId = operator&apos;s &quot;Map Layers for Mapbox&quot; product (Active in dashboard).
              No Google Maps script is referenced anywhere in this prototype.
            </p>
          </section>

          {/* Guards table */}
          <section>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              mapStart preconditions
            </p>
            <table className="w-full text-[10px] border border-slate-200">
              <tbody>
                {[
                  ["scriptStatus === loaded", scriptStatus === "loaded"],
                  ["window.AVUXI.mapStart is function", avuxiGlobalReady],
                  ["mapbox-gl loaded()", mapReady],
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
                setMapStartStatus("idle");
                setTimeout(() => callMapStart(), 100);
              }}
              className="mt-2 w-full px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider bg-rose-600 text-white hover:bg-rose-700"
            >
              Force mapStart
            </button>
          </section>

          {/* Network interceptions · v5 NEW · the actual evidence */}
          <section>
            <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1">
              *.avuxi.com network interceptions ({interceptions.length})
            </p>
            {interceptions.length === 0 ? (
              <p className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                Zero intercepted calls. Either AVUXI is not making fetch/XHR calls, or the interceptors haven&apos;t caught them yet. The PerformanceObserver count above is the canonical request count.
              </p>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded p-1.5 max-h-44 overflow-y-auto space-y-1.5 text-[9px]">
                {interceptions.slice(-12).reverse().map((r, i) => (
                  <div key={i} className={cn("border rounded px-1.5 py-1",
                    r.ok ? "bg-emerald-50/60 border-emerald-200" :
                    r.status === 0 ? "bg-rose-50 border-rose-300" :
                    "bg-amber-50 border-amber-300")}>
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-500">{r.ts}</span>
                      <span className={cn("font-bold px-1 rounded",
                        r.ok ? "bg-emerald-200 text-emerald-900" :
                        r.status === 0 ? "bg-rose-200 text-rose-900" :
                        "bg-amber-200 text-amber-900")}>
                        {r.status === 0 ? "ERR" : r.status}
                      </span>
                      <span className="text-slate-500">{r.via}</span>
                      <span className="text-slate-500 ml-auto">{r.elapsedMs}ms</span>
                    </div>
                    <div className="text-slate-700 break-all mt-0.5">{r.url}</div>
                    <div className="text-slate-500 italic break-all mt-0.5 line-clamp-3">{r.body}</div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* City + cycle */}
          <section className="space-y-2">
            <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase">City</label>
            <select value={cityId} onChange={(e) => { setCityId(e.target.value); setCategorySnapshots([]); }}
              className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded font-medium">
              {(["EU-S", "EU-N"] as const).map((region) => (
                <optgroup key={region} label={region}>
                  {CITIES.filter((c) => c.region === region).map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button type="button" onClick={cycleCategories}
              disabled={!avuxiActive || avuxiCategoryButtons.length === 0 || !!categoryProgress}
              className={cn("w-full px-3 py-2 rounded text-[11px] font-bold uppercase tracking-wider",
                avuxiActive && avuxiCategoryButtons.length > 0 && !categoryProgress
                  ? "bg-forest-900 text-white hover:brightness-110"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed")}>
              {categoryProgress
                ? `Cycling: ${categoryProgress}`
                : `Cycle ${avuxiCategoryButtons.length || "?"} categories`}
            </button>
          </section>

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

          {errorMessage && (
            <p className="text-rose-700 text-[11px] bg-rose-50 border border-rose-200 px-2 py-1 rounded">
              {errorMessage}
            </p>
          )}

          <details>
            <summary className="text-[10px] font-bold tracking-widest text-slate-500 uppercase cursor-pointer hover:text-slate-700">
              Event log ({events.length})
            </summary>
            <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] leading-relaxed max-h-40 overflow-y-auto mt-1">
              {events.slice(-25).map((e, i) => <div key={i}>{e}</div>)}
            </div>
          </details>

          <p className="text-[9px] text-slate-500 leading-relaxed italic">
            <strong>How to find your accountId:</strong> AVUXI dashboard → Account / Settings · usually a UUID like xxxxxxxx-xxxx-…<br />
            Paste it above + click &quot;Apply + reinit&quot; · then watch the interception table for {`{`}status, body{`}`} of AVUXI&apos;s actual calls. 401/403 = domain not authorised. 200 + non-empty body = active rendering.
          </p>
        </div>
      </main>
    </div>
  );
}
