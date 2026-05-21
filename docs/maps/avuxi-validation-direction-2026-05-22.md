# AVUXI · Active Validation Direction · 2026-05-22

> Status: **active operator directive · supersedes the categorisation proposal in `avuxi-underwriting-utility.md`**
> Trigger: operator pivot 2026-05-22 · pause all categorisation decisions · simplify scope to validation-only
> Companion to: `docs/maps/avuxi-integration-architecture.md` (architecture · still active · Phase 1 scaffolding shipped)

---

## 0 · Operator directive · verbatim

> La validación realizada hasta ahora confirma únicamente que:
> · AVUXI funciona correctamente con Mapbox.
> · Las capas se renderizan.
> · El metro se renderiza.
> · Los heatmaps se renderizan.
> · La integración es potencialmente escalable a nivel internacional.
>
> Todavía no quiero decidir:
> · qué categorías son Tier 1/2/3;
> · qué categorías participan en underwriting;
> · qué categorías participan en scoring;
> · qué categorías estarán ocultas;
> · qué categorías estarán activadas por defecto.
>
> Mi objetivo inmediato es más simple:
> 1. Mantener el panel CAPAS existente en HotelVALORA.
> 2. Permitir que las capas AVUXI puedan controlarse desde ese panel.
> 3. Mantener disponibles todas las categorías AVUXI durante la fase de validación.
> 4. Mantener Centro Histórico como capa independiente de HotelVALORA.
> 5. Posponer cualquier decisión de scoring o weighting para una fase posterior.

---

## 1 · What this means for the architecture

Five concrete consequences:

### 1.1 · CAPAS panel as the integration point

The existing `<MapLegend>` (institutional 3-toggle panel · Heatmap · Líneas de Metro · Centro Histórico) is the canonical UI for layer control. Phase 2 (whenever approved) integrates AVUXI WITHIN this panel · NOT alongside · NOT replacing.

The operator confirmed in QA #001 that this collapsible panel (triggered by the Layers icon top-right) is the institutional shape they want. We extend it · we do not redesign it.

### 1.2 · All AVUXI categories remain available

During the validation phase the operator wants to be able to reach Eating · Sightseeing · Shopping · Nightlife · Parks · Transport at any time. No suppression. No tiering. The integration design must preserve full reach to AVUXI's 6 categories.

This is consistent with the v9 baseline (`/experiment-avuxi`) where AVUXI's native button group remains exposed.

### 1.3 · Centro Histórico stays HotelValora-native

The Almendra polygon stays as a HV-curated layer · separate from AVUXI's category model · controlled by its own toggle in the CAPAS panel. No coupling to AVUXI.

(This is consistent with the architecture doc §1.4 · Centro Histórico is HV IP · per the 2026-05-21 review the operator explicitly downgraded `Historic Center polygon` global library work but kept the Madrid-specific polygon as legacy. Still applies.)

### 1.4 · No category decisions today

The proposal in `avuxi-underwriting-utility.md` (Tier 1/2/3 ranking · default-on policy · scoring potential) is **shelved**. It stays as reference for a future review · the operator will reopen the question when ready.

### 1.5 · No production migration until CAPAS integration model is visible

Phase 2a (ReportMap activates AVUXI) is NOT approved at the moment. The operator wants to see HOW AVUXI categories fit into the existing CAPAS panel before approving any production activation.

---

## 2 · Concrete integration sketch · for future approval

> This section is a **sketch · not a build** · documents the working approach for the operator's next review. No code changes follow from this section today.

The existing CAPAS panel today carries 3 toggles:

```
CAPAS
[●] Heatmap           ← controls MapHeatmapLayer (manual Madrid POIs · 21)
[●] Líneas de Metro   ← controls MapMetroLayer (manual L1+L6 Madrid)
[●] Centro Histórico  ← controls MapPolygonLayer (manual Almendra)
```

Phase 2 (when approved) re-wires the 3 toggles WITHOUT changing their visual shape:

```
CAPAS
[●] Heatmap           ← controls AVUXI heatmap (default category · operator can switch
                         to any of the 5 AVUXI heatmap categories via a small dropdown
                         OR via the AVUXI native button group · which remains visible
                         during validation)
[●] Líneas de Metro   ← controls AVUXI transit overlay
[●] Centro Histórico  ← controls MapPolygonLayer (UNCHANGED · HV-native · Madrid only)
```

Net effect:
- Operator sees the same panel · same toggles · same labels
- Heatmap toggle now drives AVUXI's worldwide overlay (vs the 21-POI Madrid manual data)
- Metro toggle now drives AVUXI's 70+ city curated transit (vs the L1+L6 Madrid manual lines)
- Centro Histórico toggle stays exactly as today · HV-curated Almendra polygon
- All 5 AVUXI heatmap categories remain reachable (via dropdown OR AVUXI's native button group · TBD in Phase 2 design)

This integration preserves:
- The institutional CAPAS panel UX
- All AVUXI categories available
- Centro Histórico independence
- Zero category-tier decisions required from operator

---

## 3 · What is NOT being designed today

| Question | Status |
|---|---|
| Should Shopping be hidden? | NOT DECIDED · all categories available |
| Should Nightlife default off? | NOT DECIDED · all categories available |
| Should we re-label categories with HV institutional terms? | NOT DECIDED · keep AVUXI native labels during validation |
| Should AVUXI scores feed cap-rate / underwriting / scoring? | DEFERRED · post-validation decision |
| Should we build a proxy panel hiding AVUXI's native UI? | NOT NEEDED · CAPAS panel extension is the path |
| Phase 2a (ReportMap activates AVUXI) | NOT APPROVED · awaiting CAPAS-integration design review |
| Phase 2b (CompsetMap activates AVUXI) | NOT APPROVED · deferred behind Phase 2a |

---

## 4 · What stays active

| Item | Status |
|---|---|
| `<HVMap>` shell + `<AvuxiOverlay>` stub (Phase 1 scaffolding) | ✅ shipped 2026-05-21 |
| ReportMap migrated to `<HVMap mode="report-embed">` (Phase 1b · byte-equal) | ✅ shipped 2026-05-21 |
| `/user/admin/integrations` registry · AVUXI · CoStar · Wikidata · D-8 entries | ✅ live |
| `/experiment-avuxi` v9 baseline · raw AVUXI · DOM inspector | ❄️ frozen baseline · validation continues |
| Production `/compset` · manual heatmap + metro + polygon | ❄️ untouched |
| `lib/maps/geo-data.ts` Madrid manual data | ❄️ active in production |

---

## 5 · Maintenance commitment

Per operator directive 2026-05-22:

> También quiero que cualquier nueva integración incorporada al ecosistema quede documentada y visible en /user/admin/integrations.

Confirmed standing commitment:
- Every new external integration or provider goes into `lib/admin/integrations/platform-registry.ts`
- Status taxonomy: `live` · `partial` · `testing/validation` · `configured_not_wired` · `planned`
- Layer assignment: `infrastructure` · `auth` · `ai` · `analytics` · `communications` · `relationship_intelligence` · `external_data` · `maps_geo_intelligence` · `commercial` · `developer_infrastructure`
- New layers acceptable when an integration genuinely doesn't fit existing categories (precedent: `maps_geo_intelligence` added for AVUXI · ¡no recently-discovered missing entries today)

This doc is a directive checkpoint · not a build trigger. Code changes only flow from explicit phase approvals.
