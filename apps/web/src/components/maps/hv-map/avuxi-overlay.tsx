"use client";

/**
 * <AvuxiOverlay> · Phase 1 stub · renders nothing.
 *
 * The institutional encapsulator for the AVUXI Map Layers for Mapbox
 * integration. Today (Phase 1) this is a no-op so the <HVMap> shell
 * can ship without touching production behavior. Phase 2 lifts the
 * working implementation from `/experiment-avuxi` (validation surface)
 * into this component.
 *
 * Future Phase 2 responsibilities (all currently UNIMPLEMENTED here):
 *
 *   1. Script injection · idempotent ·
 *      https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js
 *
 *   2. Race-safe initialisation · wait for both
 *        · window.AVUXI.mapStart to be a function
 *        · the parent mapbox-gl <Map> to fire its onLoad event
 *      then call mapStart with the canonical 4-arg signature:
 *        AVUXI.mapStart(mapboxglMap, window.mapboxgl, scriptId, options)
 *
 *   3. Error surfacing · network · CORS · CSP · script load failure ·
 *      mapStart throws · all forwarded via onError prop
 *
 *   4. Optional · institutional category curation · gated on
 *      empirical per-category identifier confirmation (see operator
 *      directive 2026-05-21 in `feedback_avuxi_no_dom_overlay.md` ·
 *      memory). Today NEVER attempted.
 *
 *   5. Optional · proxy panel · HotelValora-owned buttons proxying
 *      clicks to AVUXI's underlying category controls when label
 *      curation graduates from frozen baseline. Today NEVER attempted.
 *
 * Reference validation implementation lives at
 *   apps/web/src/app/experiment-avuxi/page.tsx
 * which carries the v9 baseline (race-fixed · network-intercepted ·
 * DOM-inspected) that this overlay will lift in Phase 2.
 *
 * For the technical contract see
 *   docs/maps/avuxi-integration-architecture.md §3.2
 */

export interface AvuxiOverlayProps {
  /** Phase 2+ feature flag · today: ignored. */
  enabled?: boolean;
}

export function AvuxiOverlay(_props: AvuxiOverlayProps = {}): React.ReactElement | null {
  // Phase 1 · intentionally renders nothing. Phase 2 will wire AVUXI
  // here using the lifted implementation from /experiment-avuxi.
  return null;
}
