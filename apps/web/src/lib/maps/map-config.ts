import type { MapViewport } from "./types";

/**
 * Defensive token normaliser · QA #002 root-cause fix.
 *
 * The raw env value can carry invisible characters that make the
 * resulting URL malformed and trigger a browser-side "Failed to fetch"
 * BEFORE any network request leaves the device.
 *
 * Symptom signature matched in QA #002:
 *   `Failed to fetch https://api.mapbox.com/styles/v1/mapbox/light-v11?...&access_token=<invisible>pk...`
 *   · Mapbox watermark + Marker overlays still render (DOM only)
 *   · base canvas stays empty · slate-200 shows through · uniform gray
 *
 * Stripped codepoints (explicit numeric · source stays ASCII-only):
 *   0xFEFF       BOM / ZWNBSP  (UTF-8 BOM saved into .env on Windows)
 *   0x200B       ZWSP          (zero-width space)
 *   0x200C       ZWNJ          (zero-width non-joiner)
 *   0x200D       ZWJ           (zero-width joiner)
 *   0x200E,0x200F LRM/RLM      (left/right-to-left marks)
 *   0x2060       WORD JOINER
 *   0x202A-0x202E bidi controls (LRE/RLE/PDF/LRO/RLO)
 *   plus all ASCII whitespace
 *
 * Harmless on a clean token · no false positives.
 */
const INVISIBLE_CODEPOINTS = [
  0xfeff,
  0x200b, 0x200c, 0x200d, 0x200e, 0x200f,
  0x2060,
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e,
];

const INVISIBLE_SET = new Set<number>(INVISIBLE_CODEPOINTS);

function normalizeMapboxToken(raw: string | undefined): string {
  if (!raw) return "";
  let out = "";
  for (const ch of raw) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (INVISIBLE_SET.has(cp)) continue;
    if (cp <= 0x20) continue; // ASCII control + whitespace (incl. space, \t, \r, \n)
    out += ch;
  }
  return out;
}

export const MAPBOX_TOKEN = normalizeMapboxToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

/**
 * Diagnostic surface for QA #002 · exposes how many characters the
 * normaliser removed plus the first/last codepoints of the RAW env
 * value. Consumed by the /diagnose-map page · not used at runtime.
 */
export const MAPBOX_TOKEN_DIAGNOSTICS = (() => {
  const raw = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const normalised = MAPBOX_TOKEN;
  return {
    rawLength: raw.length,
    normalisedLength: normalised.length,
    strippedCount: raw.length - normalised.length,
    rawFirstCodepoint: raw.length > 0 ? (raw.codePointAt(0) ?? null) : null,
    rawLastCodepoint:
      raw.length > 0 ? (raw.codePointAt(raw.length - 1) ?? null) : null,
    normalisedPrefix: normalised.slice(0, 8),
    normalisedSuffix: normalised.slice(-4),
  };
})();

/** Mapbox Light style — clean institutional aesthetic */
export const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

/** Madrid Centro (Puerta del Sol) — default viewport · matches the
 * institutional Madrid Centro flow (/madrid-centro/*). Previous default
 * pointed at Sevilla which was a leftover from an earlier prototype. */
export const DEFAULT_VIEWPORT: MapViewport = {
  longitude: -3.7038,
  latitude:  40.4168,
  zoom:      14,
  pitch:     0,
  bearing:   0,
};

export const MAP_LAYER_IDS = {
  heatmapSource:    "tourist-heatmap-source",
  heatmapLayer:     "tourist-heatmap-layer",
  metroSource:      "metro-lines-source",
  metroLayer:       "metro-lines-layer",
  metroStations:    "metro-stations-layer",
  historicoSource:  "historico-source",
  historicoFill:    "historico-fill-layer",
  historicoStroke:  "historico-stroke-layer",
} as const;
