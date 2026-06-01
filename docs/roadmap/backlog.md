# Backlog

Three buckets: **Future ideas** · **Blocked** · **Technical debt**. Anything else lives in `master-roadmap.md` or `current-sprint.md`.

---

## Master por hotel · M0/M1 pendings (2026-06-01)

1. **M0.B · promover los 96 "Apartamento con servicios"** — promoción diferida (decisión Mike): mismo proceso verificado que los 172 de M0 (`data_quality_tier='costar_only'`, sin coords, fuera del front, mismas guardas anti-duplicado costar_id/slug/dirección). Ejecutar DESPUÉS de cerrar M1. `property_kind='apartment'`.
2. **`property_kind` de aparthoteles mal clasificados** — el Grupo 2 (~varios de los 108 que CoStar marca *Apartamento con servicios* pero entraron al corpus como hotel: limehome, Skyline Plaza España, Hyatt Regency Residences, Juan Bravo, Eric Vökel, Feelathome, Aspasios, Bob W, Smartr…) se MANTIENE como `property_kind='hotel'` por ahora (decisión consciente · no tocar el front). **Revisar y reclasificar a 'apartment' cuando se active el segmento apartamentos**, para que el master sea coherente ese día.

---

## X4b · Underwriting bridge + TRAMO 5 pendings (2026-05-30)

Capturados al cerrar el bridge config→motor (X4b · 4 tramos). Algunos ya tienen fila detallada en
*Technical debt* abajo (marcado ✓det).

1. **TRAMO 5 · ADR real + cap por submercado** — diseño completo en
   `docs/underwriting/TRAMO5_ADR_Y_SUBMERCADO.md`. (a) ADR real: cascada operador → CoStar por clase
   → CoStar submercado × índice Booking (BAR como índice relativo, nunca absoluto) → fallback ·
   barrida RapidAPI → tabla `hotel_rate_daily` → medias internas. (b) Cap por submercado: factor de
   ubicación ortogonal al prior de segmento, calibrado con €/llave por submercado de las 661 tx ·
   cascada €/llave → tier experto editable → etiquetado · validado por el espejo de cap implícito.
   **Decisión pendiente:** factor submercado vs liquidez (complementarios o fundidos) — se decide al
   abrir el Tramo 5. Es un tramo entero · NO empezar hasta cerrar X4b.
2. **Disparador "tipo de operación" (estabilizado / reposición)** — activa el CAPEX de reforma + el
   exit value-add, hoy dormidos. **Desacoplado de la condición** (2026-05-30): `repositionCapexForAsset`
   y `deriveExitState` se gobiernan por un flag `isReposition` (deal type), NO por `state==="needs_work"`
   (que ahora es condición age-derived, reward-only). Hoy `isReposition=false` siempre → reposición 0
   + exit estabilizado (no-regresión). Falta el selector/override de tipo de operación que ponga
   `isReposition=true` (value-add: reforma año 0 → reform CAPEX al CF[0] + exit renovated si hold≤10). ✓det
3. **ADR por segmento (CoStar por clase)** — ancla los `segment_base_priors` de `expert_prior` a
   `calibrated_from_kpi` vía el espejo de cap implícito. El market snapshot trae ADR mezclado por
   submercado (sesga el NOI · lujo infravalorado). ✓det
4. **21 hoteles Barajas sin `chain_scale`** — caen al fallback star→segmento del cap base; el L2
   USALI ya los rescata (clase-invariante), pero el segmento del cap queda aproximado. Backfill
   `chain_scale` (Booking class + Google priceLevel). (Relacionado con item 15 de Active pending.)
5. **Matriz CAPEX en localStorage → migrar a Supabase** — el override de la card CAPEX vive en
   `admin.financials.capex.v1` (localStorage); el motor lee `CAPEX_DEFAULTS` (per_key).
   `capexReformTotalEur` ya acepta `CapexMatrixState` → persistir server-side cablea las ediciones
   del operador al IRR. Mismo patrón que la persistencia del panel cap-rate. ✓det
6. **Sub-scores del Score · persistencia** — los 6 sub-scores Booking que alimentan el factor Score
   no están en tabla consultable (solo `review_score` global) → el flujo vivo pasa contexto vacío →
   ajuste Score 0 etiquetado. ✓det
7. **Liquidez aún sobre el stub de 12 comps** — el factor liquidez cuenta `SEEDED_HOTEL_COMPS`; el
   snapshot real (661 tx) tiene conteos por submercado. Retirar el stub. ✓det
8. **Desglose factor-a-factor del cap rate en el informe** — `capRate.adjustments` (incl. Score,
   operator, liquidity, base segmento) está en la salida del motor pero el informe solo muestra el
   cap final. Card de desglose en el Investment Memorandum. ✓det
9. **DX · default de auth en dev + arranque local showcase** — `AUTH_ENABLED="true"` commiteado en
   `.env.development` fuerza login Supabase (no cableado) en local → el admin/informe da 500/redirect.
   Hoy se esquiva con `$env:AUTH_ENABLED="false"`. Decidir default dev = false (showcase) + script de
   arranque local que ponga las env mínimas.
10. **Cablear Supabase Auth de verdad** — hoy esquivado con `AUTH_ENABLED=false`. Implementar el
    login Supabase + allow-list real (`ADMIN_OPERATOR_EMAILS`) para que el admin estricto funcione en
    preview/prod sin el bypass.
11. **Verificación de coherencia de las otras 5 páginas del informe con el motor nuevo** —
    asset-analysis · competitive-set · market-overview · executive-summary · financials: confirmar
    que consumen el cap/NOI/IRR del motor reconciliado (X4b) y no valores viejos/mock.
12. **select-corpus** — EN HOLD (plan hecho). Retomar cuando se decida.
13. **Poblar `year_renovated_last` del corpus → exit-cap se diferencia hotel a hotel** — ARREGLO DE
    FONDO del exit-cap dinámico (D4). Hoy solo **8/226** ES tienen `year_renovated_last` (59/226
    `year_opened`) → la mayoría cae a `needs_work` a la salida → +0,50 plano. La ventana de CAPEX
    reciente se amplió a ≤10 años (2026-05-30), pero solo diferencia a los ~13 hoteles con fecha en
    6-10y; el resto necesita el dato. Fuentes: Booking/CoStar/web oficial · reformas conocidas.

---

## Active pending (post 2026-05-26 sweep)

Captured at end-of-day shutdown. Ordered roughly by tomorrow's working order — PASO 4 first.

1. **PASO 4 · facility-aware P&L rule** — 3-factor by hotel type (urban 2% · mixed 3% · resort 4%) configurable in `/user/admin/financials`. Includes F&B uplift + drop absent facilities + proportional redistribution to 100%. **Tomorrow's session**.
2. **PASO 4 sub-task · MICE parser fix** — sweep produced **0/226** `meeting_rooms_count` because the parser doesn't catch the Booking pattern. Decision firmed: presence of *any* event space → MICE P&L line activates (no minimum count). Parser must extract this binary signal correctly.
3. **PASO 4 sub-task · F&B point-weighting** — open question, decided with the P&L document in hand. F&B + MICE both expanded in methodology.
4. **PASO 4 sub-task · `restaurants_count` empty fallback** — only 19/226 hotels surface `accommodationHighlights "N restaurants"`. Decide rule for the other 207 (default to 1? infer from amenities bitmap? hide line?).
5. **Methodology page 404** — `/methodology` (or equivalent route) returns 404. Page exists in concept but not in routing. Restore.
6. **Catastral map / floor-plan on Asset Analysis** — institutional surface for parcel imagery + cadastral overlay. Spec already filed at `docs/features/catastro-imagen-mapa-spec.md`.
7. **Rebrand policy** — 3-layer infrastructure shipped (`hotel_name_alias` + `hotel_canonical_history` + `same_building_rebrand` enum + 2 seeded). **Untouched today.** Future: same-building detector + admin UI for operator-curated merges + cross-border behaviour once CoStar mundial lands.
8. **Vercel Pro pre-demo** — current Hobby plan limits (1024MB function memory · 300s maxDuration · 2-4 daily crons) tight under demo load. Upgrade before institutional demo.
9. **Integrations key management** — `/user/admin/integrations` needs a clean operator UI for provisioning / rotating / invalidating API keys (RapidAPI · Google Places · Resend · CRON_SECRET · INGESTION_AUDIT_TOKEN). T1 credentials currently encrypted in Supabase; expose via admin without leaking values.
10. **Agents system review** — 9 operational agents + CEO seeded but mostly dormant. Review status of each, decide which to activate post-Paso 4.
11. **SSL apex cert** — `hotelvalora.com` apex Let's Encrypt cert only covers `www.hotelvalora.com`. Windows schannel rejects bare apex with `SEC_E_WRONG_PRINCIPAL` even though Vercel 307-redirects → www. Browsers tolerate it; institutional clients on strict TLS won't. Re-issue or extend cert to apex. Bundle with Vercel Pro upgrade pre-demo.
12. **CoStar full API integration** — replace the single Upper-Upscale Madrid Centro template currently loaded with the real CoStar dataset: full hotel inventory by market + USALI percentages segmented by country/market/submarket/class/segmentation_type + STR for real compsets. When complete: (a) engine starts reading the matching percentages per asset, no code change; (b) the "plantilla provisional" flag (added 2026-05-28) auto-retires for covered assets; (c) facility-aware rule keeps operating on the correctly segmented base. See `VALUATION_METHODOLOGY.md` annex "Alcance actual de cobertura CoStar" for full scope.
13. **Card admin editable de factores facility-aware** (urban/mixed/resort). Requiere persistencia server-side de overrides (no solo localStorage). Hoy los 3 factores son configurables editando `FACILITY_AWARE_FB_FACTORS` en `lib/admin/financials/defaults.ts` + redeploy. Estimación: 2-3h. Bloqueante: NO. Prioridad: media.
14. **Añadir columna `segmentation_type` a `hotel_canonical`** (`hotel` | `apartahotel` | `hostel`). Necesario para que el motor del P&L (`isProvisionalTemplate` + futuro lookup de % USALI segmentados) diferencie tipos de activo cuando lleguen datos CoStar segmentados. Hoy todos los hoteles se tratan como `'hotel'` por defecto en `coverage.ts`. Estimación: 1-2h (migración + backfill desde Booking property_type o manual). Bloqueante: cuando se rellenen datos CoStar segmentados de Madrid (ej. apartahoteles con sus % propios).
15. **Backfill `chain_scale` para los 111 hoteles `unknown`** — 49% del corpus tiene `chain_scale='unknown'` (problema preexistente, no introducido por el Paso 4). Implicaciones: (a) hoy esos 111 hoteles muestran banner "plantilla provisional" por `classLabel=null` → comportamiento correcto y conservador pero excesivo · varios pertenecen a clases conocidas que solo necesitan ser pobladas en BD; (b) el **Paso 5** (ajuste por tamaño/clase · tramos 0-75 / 76-200 / 201+ habs · wiring pendiente en `/user/admin/financials`) requiere `chain_scale` poblado en TODOS los hoteles para diferenciar tramos por clase + tamaño · sin backfill el Paso 5 queda parcialmente bloqueado. Fuentes razonables: Booking `class` field + Google Places `priceLevel`. Estimación: 1-2h.
16. **Auditar clasificación de `amenities.spa` en enrichment de Booking** — hipótesis: el parser etiqueta como `spa=true` elementos "wellness" / "gym premium" que NO son spas reales con tratamientos terapéuticos. Caso confirmado durante verificación del Paso 4 (2026-05-28): Hyatt Centric Gran Vía Madrid · BD dice `spa=true` · web oficial Hyatt + fuente independiente confirman que NO tiene spa propio (recomienda Hammam Al Andalus a 10 min). El motor del Paso 4 hace bien su trabajo (lee BD y muestra ingreso por spa cuando BD dice true); el problema vive en el enrichment previo, NO en el Paso 4. Spa & Wellness representa 2.2% del revenue base — auditarlo importa para la defendibilidad de las valoraciones ante cliente profesional.
    Tareas:
    - Re-revisar el parser `detectFacility(/spa/i)` en `apps/web/src/lib/enrichment/enrich-hotel.ts` · ahora dispara sobre cualquier match de "spa" en facility titles, demasiado laxo.
    - Lista de keywords que NO deberían disparar `spa=true`: "wellness suite", "wellness room", "wellness corner", "fitness premium", "gym 24h", "beauty corner".
    - Lista de keywords que SÍ: "spa center", "spa treatments", "massage", "thermal", "jacuzzi", "hammam" (interno).
    - Reglar manualmente Hyatt Centric Gran Vía → `amenities.spa = false`.
    - Auditar el resto del corpus: identificar todos los hoteles con `spa=true` y verificar contra fuente oficial (sample 10-15 al azar, calibrar tasa de falsos positivos).
    Estimación: 3-4h. Bloqueante: NO. Prioridad: **alta** antes de demo a inversores (defendibilidad de valoraciones).
17. **Ambigüedad parking Hyatt Centric** (no urgente) — Booking dice parking=true · fuente independiente sugiere parking concertado externo, no propio. Dejar como está hasta confirmación manual operador. Similar dinámica que #16 pero menor impacto (parking & rentals = 1.9% del revenue base).
18. **Importer `trigger_kind` default · 1-line microfix** — `import_pnl_to_supabase.py` actualmente emite `trigger_kind='scripted_import'` para el audit row de `ai_agent_runs`, valor que no está en el CHECK constraint real (`cron|event|manual|webhook|escalation|agent`). En el apply de Fase 2 lo corregí manualmente a `'manual'` (semántica correcta · script disparado por operador). El script sigue con el valor incorrecto · cambiar `emit_audit_sql` a usar `'manual'` para que runs futuros no fallen el INSERT. <30 min trabajo.
19. **X4b · Underwriting NOI/cap + IRR** — migrar la página de Underwriting para que su valor de adquisición y su IRR consuman el mismo NOI/cap que ya usa Executive Summary (commit X4+F3, rama `feat/x4-f3-costar-pnl-wiring`, hash `66813cc`). Hoy el slice de underwriting sigue en €/key **a propósito**: su motor de IRR (`engine/pnl.ts`) corre sobre `pl_drivers` estáticos (F6), así que meter NOI/cap como valor de adquisición daría un IRR inconsistente con sus propios cash flows. X4b = conectar el P&L facility-aware (`computePL`) al motor 11y (sustituir `pl_drivers` estáticos) + valor por NOI/cap. Es el tramo que cierra "Executive Summary → Underwriting" literal. Bloqueante: NO (Exec Summary ya correcto). Prioridad: alta (coherencia entre superficies). Depende de: F6.
20. **Parity 3a/3b re-run** — re-correr y actualizar `docs/underwriting/excel-parity-block-3a.md` y `-3b.md` con los números nuevos del commit X4+F3 (cambian a propósito: EBITDA pre/after-replacement, base A&G, seguros, rampa FF&E, `ENGINE_VERSION` 0.3.0). Sin runner automático · verificación manual. Bloqueante: NO.
22. **Deuda · costes de adquisición por-país (X4b)** — `acquisition-cost-policy.ts` tiene un campo `country` (anchor) pero NO un mapa/lookup por-país: es una política única ES (notario/AJD/ITP, ~0,08%). El motor consume `inputs.acquisition.costs` (decimales ES de `SCENARIO_BASE`). Hoy NO duele: el motor es ES-only (country guard), así que los costes ES solo se aplican a hoteles ES. Cuando se levante el guard de país (NY u otros), hace falta un `getAcquisitionCostsForCountry(code)` que devuelva los % por país (notario/registro/transfer tax difieren por jurisdicción) en vez de los ES hardcodeados. Agnóstico al mercado. NO bloqueante; deuda anotada (decisión Mike, X4b).
21. **Deuda de dato · `chain_scale='unknown'` en Barajas (21/36) bajo la cascada USALI** — la cascada de cobertura USALI (3 niveles · `pnl-template-reader.ts`) rescata los 36 hoteles de Barajas/Hortaleza/San Blas a Nivel 2 (USALI nacional aplicado) **sin necesitar clase**, porque el % nacional es invariante por clase. PERO 21 de esos 36 tienen `chain_scale='unknown'`. Hoy NO duele (Nivel 2 ignora la clase). Si en el futuro Barajas (u otro submercado) gana **USALI de submercado propio** (Nivel 1, que SÍ está segmentado por clase), esos 21 no podrán usar el dato fino sin categoría → se quedarían en Nivel 2 (nacional) cuando podrían estar en Nivel 1. Sub-caso del item 15 (backfill `chain_scale`), focalizado en Barajas. NO arreglar ahora; tarea de calidad de datos.

---

## Future ideas

### Library

- Multi-report comparison view (side-by-side underwriting deltas)
- Saved searches + saved filters (per user, sync to backend)
- Folders / tags inside Favorites
- Team collaboration: comments on reports, shared folders
- Export selected rows to Excel / PDF
- AI-ranked "Best match for your investment criteria" surface

### Top Promote marketplace

- Sponsor analytics dashboard (impressions / clicks / lead conversions per promotion)
- Auction-style boost bidding for premium map slots
- Geo-targeted promoted regions (`featuredRegion` ISO codes)
- Auto-expiration emails 7d / 1d before `promotedUntil`

### Report engine

- Section 5 (Financials) implementation — P&L, Underwriting & IRR, Sensitivity
- Section 6 (Methodology) implementation
- Server-side PDF rendering via Puppeteer (replace `window.print()`)
- Multi-currency support across sections

### Settings + Investment criteria

- HMA / lender-side investment criteria tabs
- Scenario import from Excel workbook
- Criteria-vs-asset match score on every Library row

### Cross-cutting

- Notifications system (sonner today is local-only; need persistent + filterable)
- Mobile-responsive Library list (today: optimised for desktop terminals)
- Dark mode (tokens exist but never tested)

---

## Blocked

- 🔴 *(none today)*

---

## Technical debt

| Item | Severity | Notes |
|---|---|---|
| Library map uses static grayscale image | Low | Acceptable for MVP; Phase 4 swaps to Mapbox |
| Mock `MOCK_LIBRARY_REPORTS` duplicated between map markers and table rows | Low | Single source today; will move to API in Phase 3 |
| `FavoritesTable` is named after favorites but used by both lists | Low | Considered rename to `LibraryReportsTable`; kept for commit-history continuity |
| `apps/web/src/lib/library/store.ts` carries no persistence | Low | By design — UI ephemeral state. Re-evaluate if users complain |
| Audit-log rollback paths only cover alias + merge mutations | Medium | Extend coverage when valuation mutations land |
| No type-tests on `LibraryReport` shape | Medium | Add `vitest` + type-only assertions in Phase 3 |
| `pdf-export.ts` is a `window.print()` wrapper | Medium | Replace with server-side render before institutional rollout |
| Auth store is mock-only, tier inferred from email | High | Replace with NextAuth + DB tier in Phase 3 |
| No CI yet — typecheck only via local `pnpm typecheck` | Medium | Add GitHub Actions before opening contributions |
| `ENTRYPOINTS.md` over 200-line cap (357 lines as of 2026-05-12) | Low | Surfaced by `scripts/docs-audit.mjs`. Compress entries that are derivable from `docs/HOTELVALORA_MASTER_SYSTEM.md`; rule is in `CLAUDE.md` |
| HotelVALORA Score cap-rate factor inert until sub-scores persisted | Medium | X4b · TRAMO 3. The 6 Booking sub-scores (location/comfort/cleanliness/staff/value/facilities) live in enrichment, NOT a queryable table (DB has only `review_score`). Core+engine+panel+tests are complete; `assembleScoreContext` from `hotel_profiles` activates the live factor. Until then the report passes empty context → adjustment 0 (labelled, no penalty). |
| Cap-rate per-factor breakdown not rendered in report | Low | The full `capRate.adjustments` list (incl. Score, operator, liquidity) is in the engine output but the report surfaces only the final cap pct. Add an Investment-Memorandum cap-rate breakdown card that maps the adjustments array (renders all factors generically). |
| Cap-rate engine still reads 12-comp stub for liquidity + €/key cascade | Medium | X4b · TRAMO 3b. The BASE now uses segment priors (real €/key-calibrated), but the Liquidity factor still counts the `SEEDED_HOTEL_COMPS` stub. The real `snapshot.json` (661 deals · Storage `costar-master/`) has per-submarket transaction counts + €/key. Wire: (1) liquidity tx-count from snapshot, (2) live submarket→market→national €/key cascade to refresh `segment_base_priors` backing. Retire the stub entirely. |
| Segment-level ADR to anchor cap priors (implied-cap mirror) | Medium | X4b · TRAMO 3b. `segment_base_priors` are `expert_prior` (EU band + €/key ordering). The implied-cap mirror (`implied-cap-check.ts`) can upgrade them to `calibrated_from_kpi` (±0.3pp) ONLY with segment-level ADR — the market snapshots carry submarket-BLENDED ADR, which biases the NOI (luxury understated). Ingest CoStar ADR/RevPAR by class → re-run the mirror → auto-anchor. Surface the mirror as an admin view on `/user/admin/financials`. |
| Reposition CAPEX trigger (needs_work) is dormant in the auto-flow | Medium | X4b · TRAMO 4. The reposition CAPEX path (admin matrix → `inputs.capex.reposition_capex_total_eur` → IRR CF[0]) is wired + tested, but `state` is auto-derived as new/renovated only (never `needs_work`), so reposition = 0 for every auto-valued hotel (exact no-regression). Activate via a "deal type / reposition" input (operator/Premium) that can set state=needs_work. |
| CAPEX matrix admin override not persisted server-side | Low | X4b · TRAMO 4. The CAPEX card edits (units + values) live in localStorage (`admin.financials.capex.v1`); the engine reads `CAPEX_DEFAULTS` (per_key). `capexReformTotalEur` already accepts a `CapexMatrixState`, so persisting the override to Supabase (like the pnl-template panel) wires operator edits straight to the IRR. Same pattern as the cap-rate panel persistence. |

---

## Promotion criteria

An item moves from this file to `current-sprint.md` when:
- It has a clear shape (no open design questions)
- It unblocks revenue, user retention, or a Phase milestone
- It fits in ≤ 2 days of focused work
