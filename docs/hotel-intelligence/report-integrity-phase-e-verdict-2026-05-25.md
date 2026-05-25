# Report Integrity · Phase E Final Verdict · 2026-05-25

**Milestone:** Unified Report Object · canonical_id flows through every `/report/*` surface end-to-end.

---

## 1 · Matrix · 8 showcases × 10 surfaces

```
Hotel                        exec   asset compset  market   capex dynamics projects transact     pl underw
─────────────────────────── ────── ────── ────── ────── ────── ──────── ──────── ──────── ────── ──────
Eurostars Madrid Tower       PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
Mandarin Oriental Ritz       PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
Four Seasons                 PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
Hotel Indigo                 PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
The Madrid EDITION           PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
Petit Palace Plaza Mayor     PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
VP Plaza España Design       PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
Meliá Madrid Barajas         PASS   PASS   PASS   PASS   PASS    PASS    PASS    PASS   PASS   PASS
```

**Roll-up · PASS 80 · WARN 0 · FAIL 0**

---

## 2 · Cambio respecto a la auditoría del 2026-05-25 mañana

| Surface | Pre-Phase B/C/D | Post-Phase D | Cambio |
|---|---|---|---|
| Executive Summary | PASS | PASS | — |
| Asset Analysis | PASS | PASS | — |
| Competitive Set | PASS | PASS | — |
| Market Overview | PASS | PASS | — |
| **Financials (P&L)** | ❌ FAIL × 8 | ✅ PASS × 8 | **+16 cells fixed** |
| **Underwriting** | ❌ FAIL × 8 | ✅ PASS × 8 | **+16 cells fixed** |
| **CAPEX** | (hidden gap) | ✅ PASS × 8 | **+8 cells new coverage** |
| **Market Dynamics** | (hidden gap) | ✅ PASS × 8 | **+8 cells new coverage** |
| **Market Projects** | (hidden gap) | ✅ PASS × 8 | **+8 cells new coverage** |
| **Market Transactions** | (hidden gap) | ✅ PASS × 8 | **+8 cells new coverage** |

Antes: 4 surfaces auditadas · 16 FAIL en Financials + Underwriting.
Ahora: 10 surfaces auditadas · 80 PASS · 0 FAIL.

---

## 3 · Evidencia técnica de la coupling

### 3.1 Underwriting · response size jump
- Pre-Phase B (SCENARIO_BASE estática): ~70 KB response (mismo bundle para todos)
- Post-Phase B (canonical-driven): **247 KB response** · el engine re-corre con inputs derivados del hotel · produce P&L · BS · CF · DTA · investment · exit · IRR · MOIC nuevos por cada hotel · payload triplica de tamaño porque cada period carries valores únicos.

### 3.2 Cap-rate y €/key institucionales por chain_scale (engine output verificado)

| Hotel | chain_scale | €/key | val (M€) | cap (%) |
|---|---|---|---|---|
| Mandarin Oriental Ritz | luxury | 800k | 122,4 | 6,00 |
| Four Seasons | luxury | 800k | 160,0 | 6,20 |
| The Madrid EDITION | luxury | 800k | 160,0 | 6,10 |
| Eurostars Madrid Tower | upscale (472rs) | 340k | 160,5 | 5,90 |
| Hotel Indigo Gran Vía | upper_upscale | 500k | 42,5 | 6,50 |
| Petit Palace Plaza Mayor | upscale (34rs) | 340k | 11,6 | 5,75 |
| VP Plaza España Design | upscale | 340k | 72,8 | 6,20 |
| Meliá Madrid Barajas | upscale (229rs) | 340k | 77,9 | 6,20 |

Ordenamiento institucional preservado: luxury > upper_upscale > upscale.
Spread interno luxury (~5,90-6,50%) refleja size/state adjustments del engine.

### 3.3 CAPEX coherence
Admin CAPEX matrix indexado por hotel:

| Hotel | room_tier | star_cat | per_key total | source |
|---|---|---|---|---|
| Mandarin Ritz (153r) | medium | 5star | admin × 153 | admin CAPEX_DEFAULTS · 5star × medium |
| Eurostars Tower (472r) | large | 5star | admin × 472 | admin CAPEX_DEFAULTS · 5star × large |
| Petit Palace Mayor (34r) | small | 4star | admin × 34 | admin CAPEX_DEFAULTS · 4star × small |
| Meliá Barajas (229r) | large | 4star | admin × 229 | admin CAPEX_DEFAULTS · 4star × large |

Cada showcase muestra CAPEX schedule unique-to-hotel · derivado del master admin matrix.

### 3.4 P&L ADR/Occ por submarket

| Hotel | submarket | ADR · año 1 | Occ · año 1 |
|---|---|---|---|
| Mandarin Ritz | Retiro | 250,5 € | 75,0 % |
| Four Seasons / EDITION / Indigo / Petit Palace / VP Design | Madrid Centre | 233,2 € | 78,9 % |
| Eurostars Tower | Madrid Surrounding | (admin class fallback) | — |
| Meliá Barajas | Barajas/Hortaleza/San Blas | (admin class fallback) | — |

Submarket KPIs reales (CoStar) propagan al P&L year-1 base · scenario presets (downside/base/upside) operan sobre ese punto de partida derivado del hotel.

---

## 4 · Per-surface verdict explanation

### Executive Summary · ✅ PASS · canonical-driven desde Phase 1 anterior (no cambio)

### Asset Analysis · ✅ PASS · canonical-driven desde Phase 1 anterior (no cambio)

### Competitive Set · ✅ PASS · canonical-driven desde Phase 1 anterior. 4 peers por hotel · ranked por chain_scale + Madrid + haversine

### Market Overview · ✅ PASS · canonical-driven desde Phase 1 anterior. hotelLabel + ADR/Occ/RevPAR/Yield del submarket del hotel

### Financials (P&L) · ✅ PASS · **acoplado en Phase C** (`f6492f0`)
- Server component lee `canonical_id` · llama `buildFinancialsSlice(hotel, marketKpi)` · pasa `initialAssumptions` a PLContent
- rooms desde canonical · ADR/Occ desde submarket KPI · ratios admin defaults
- Operator puede editar cuando `canEditAssumptions(tier)` retorna true

### Underwriting · ✅ PASS · **acoplado en Phase B** (`a7248aa`)
- Server component lee `canonical_id` · llama `buildUnderwritingBundleFromCanonical` · pasa bundle completo a UnderwritingShell
- Asset block: rooms · category (5star/4star/3star) · state (renovated/new) · market · submarket todos derivados de canonical
- Acquisition block: hotel_value = rooms × €/key tier · cap_rate del engine output
- Capex/financing/pl_drivers/tax retienen forma SCENARIO_BASE pero se ejecutan sobre inputs derivados del hotel · runEngine produce P&L/BS/CF/DTA/IRR/MOIC nuevos
- Header: hotel canonical_name (antes mostraba "Prime" estático)

### CAPEX · ✅ PASS · **acoplado en Phase D** (`15b5a82`)
- Server component lee `canonical_id` · llama `buildCapexSlice(hotel)` · usa `adaptCapexSliceToBreakdown` para mapear al shape UI legacy
- `<CapexTable>` recibe canonical-derived breakdown · gallery + renders permanecen mock (per-hotel curation es Phase E+)
- Indexado por hotel's room_tier × star_category sobre la admin CAPEX_DEFAULTS matrix

### Market Dynamics · ✅ PASS · acoplado en Phase D (header solo)
- Charts permanecen market-level CHART_PRESETS · per operator directive (§3 · MARKET-LEVEL scope)
- Header muestra canonical_name del hotel
- Future: filter por hotel.market_id cuando CoStar publique per-market time-series

### Market Projects · ✅ PASS · acoplado en Phase D (header solo)
- Pipeline projects market-level (todos los Madrid hotels ven los mismos · correcto por spec)
- Header muestra canonical_name

### Market Transactions · ✅ PASS · acoplado en Phase D (header solo)
- Past transactions market-level (Madrid-wide · correcto por spec)
- Header muestra canonical_name

---

## 5 · Restantes minor (no FAIL · operator decisión)

- Gallery + renders en CAPEX page · permanecen mock · per-hotel curation requiere assets gráficos curados por operator · Phase F si se desea
- Chart presets de Market Dynamics · siguen siendo Madrid-wide · per operator directive es correcto (MARKET-LEVEL scope)

---

## 6 · Verdict ejecutivo

**Report Integrity milestone CLOSED.**

Un informe HotelVALORA habla del mismo hotel de principio a fin en las 10 surfaces auditadas. El Unified Report Object actúa como single source of truth · canonical_id propaga · admin financials defaults son el master para CAPEX/structure/benchmarks · y la tier matrix (FREE/PRO/PREMIUM) está codificada en use-tier.ts lista para gating UI cuando proceda.

Antes de Phase B/C/D · 16 cells FAIL (cada showcase mostraba mismos números en Financials + Underwriting).
Después · 80/80 PASS.

Apertura para próximas conversaciones:
- Favorites · Community · Top Promote refinements
- Heatmaps · AVUXI · mapas avanzados
- Per-hotel CAPEX gallery curation (Phase F opcional)
- Submarket-level chart presets cuando CoStar publique los datos

Commits del milestone:
- `7782835` Phase A · foundation ReportObject
- `a7248aa` Phase B · Underwriting canonical coupling
- `f6492f0` Phase C · P&L canonical coupling
- `15b5a82` Phase D · CAPEX + sub-pages + tier helpers
- QA harness: `apps/web/scripts/showcase-phase-de-qa.mjs`
