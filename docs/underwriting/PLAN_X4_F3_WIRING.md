# PLAN · Commit X4 + F3 — cablear % CoStar (`pnl_template`) → motor P&L → valoración NOI/cap

> **PLAN. NO ejecutado. Espera OK FINAL de Miguel antes de tocar código.**
> Fecha: 2026-05-29 · Autor: Claude Code (Opus 4.8) · v2 (integra las 3 decisiones de Miguel).
> Deriva de `AUDIT_MOTOR_FINANCIERO.md` (X4/X5) + verificación BD viva §3G.
> Regla X5: **F3 (NOI/cap) solo se activa con ratios CoStar resueltos + cap rate no nulo.** Si no, no usa NOI. Nunca F3 sin X4.

---

## 0 · Objetivo

- **X4** — `computePL` lee los % USALI reales de `pnl_template` (hoy usa constantes "Stitch" y nunca toca la tabla).
- **F3** — el valor del activo sale de **NOI / cap rate** (hoy = €/key × llaves).
- **FUTURO (no se toca):** internacional no-ES (`pending_costar`), diferenciación por **clase**, F4/F5/F6/F7.

---

## 1 · Las TRES decisiones de Miguel (firmadas · van también a `VALUATION_METHODOLOGY.md`)

### D1 · Valoración sobre EBITDA AFTER REPLACEMENT + rampa FF&E
- El cap rate se aplica al **NOI después de restar la reserva FF&E** (EBITDA after replacement).
- La FF&E **no es plana**: es una **rampa** `2% (año 1) → +1%/año → estabiliza en 4%` ⇒ `2,3,4,4,4,…`.
- El `ffe_reserve_pct = 4,00` de la BD queda **OBSOLETO como constante** → se sustituye por la curva. Provenance de la FF&E = **`operator_assumption`**, NUNCA `costar_*`.
- El % de FF&E que entra en el NOI de valoración depende del **año de salida** (D3): salida en año 7 → 4% estabilizado; salida temprana → punto menor de la curva.

### D2 · `segmentation_type` tiene CUATRO valores
`hotel` / `apartmenthotel` / `hostel` / `hotelproject`. Se añade a `canonical-reader` **en este commit** (los 4). La curva FF&E (D1) tiene sentido sobre todo en `hotelproject` (arranca de cero); un activo estabilizado en marcha puede ir directo al 4%. Se deja el **enganche** para condicionar la curva por `segmentation_type`; el afinado por tipo se cierra después.

### D3 · El NOI de valoración depende del AÑO DE SALIDA, que depende del PLAN (gating de producto en el motor)
| Plan | Año de salida | NOI de valoración | Editar supuestos |
|---|---|---|---|
| **FREE** | sin salida | **valor de mercado actual** = NOI sobre compset **TTM (12m)** = año 1 | no |
| **PRO** | configurable **TTM(12m)…10 años**, default **año 7** | NOI del año de salida elegido | no (solo ver) |
| **PREMIUM** | igual que PRO | NOI del año de salida elegido | **sí** |

El motor toma el año de salida como **parámetro** (no constante): default 7 para PRO/Premium, TTM para Free. X5 sigue vigente.

---

## DELTA v3 (firmado 2026-05-30) · correcciones D2 y D4 + veredicto de anclajes

> Reemplaza lo que el plan v2 decía sobre la rampa-por-tipo (§3) y el spread de salida fijo (§11.4).

### Δ D2 · La rampa FF&E va por CAPEX, NO por `segmentation_type`
- **Default = 4% plano** para activos operativos **sin CAPEX**. **Rampa 2→3→4 solo CON CAPEX** (obra nueva o renovación).
- Disparador = `ffeReservePct(year, hasCapex)` (ver §3 actualizado), con `hasCapex` derivado de la señal de estado del motor de cap rate (ver anclaje abajo). `segmentation_type` deja de condicionar la curva.

### Δ D4 · Cap rate de salida DINÁMICO (se quita el +20 bps fijo)
- Entrada y salida salen ambos del motor dinámico según el **estado del activo**: con CAPEX/renovado → entrada ≈ salida; viejo sin CAPEX → salida más alta.
- Se **elimina** `sideAdjustment` (+0,20 fijo). La valoración de salida usa un **segundo run** del engine con el estado proyectado a salida.

### Anclaje D2 — la señal EXISTE, pero su derivación DIFIERE (⚠ requiere tu fallo)
- **Existe y se llama `AssetState`** (`"new" | "renovated" | "needs_work"`), en `lib/underwriting/cap-rate-engine/types.ts` + `lib/underwriting/types.ts`; la consume `renovationAdjustment(asset)` en `adjustments/index.ts` (new −10 bps · renovated 0 · needs_work +50 bps). Se deriva de canonical en `deriveAssetState(hotel)` (`underwriting-runner.ts`) desde `year_renovated_last` / `year_opened`. ✓ nombre confirmado.
- **DIVERGENCIA:** `deriveAssetState` **solo produce `new` o `renovated`** desde canonical — **nunca `needs_work`** (ese valor solo vive en los comps semilla). Y **`renovated` es además el valor por defecto** (catch-all cuando no hay señal). Por tanto la señal, tal como se deriva hoy, **no distingue limpio "CON CAPEX" de "operativo SIN CAPEX"**: `renovated` mezcla "renovado de verdad", "viejo con fecha" y "sin dato".
- **Mapeo `hasCapex` que propongo** (usa la propia racional del engine: *renovated = "recent capex absorbed · no near-term spend required"* → estabilizado): `new` → CON CAPEX (rampa) · `needs_work` → CON CAPEX (rampa) · `renovated`/default → SIN CAPEX (4% plano). **Esto choca con tu frase "rampa … o renovación"**: si un activo recién renovado debe ir a rampa, hace falta una señal explícita de "CAPEX reciente" que hoy no existe separada del default. **Necesito tu fallo:** (A) acepto el mapeo propuesto (renovated→4% plano), o (B) añadimos un flag explícito de CAPEX/renovación reciente (mínimo: operator-set o derivar "renovado ≤N años" como CON CAPEX, separándolo del default sin-dato).

### Anclaje D4 — existe el PARÁMETRO, pero hoy es spread fijo (mínimo planificado)
- **Existe:** `CapRateEngineContext.side: "entry" | "exit"`; `runDynamicCapRate(ctx)` acepta `side`; `buildAdjustments(..., side)` añade `sideAdjustment` = **+0,20 fijo** para exit. El engine PUEDE devolver un cap de salida.
- **DIVERGENCIA:** (1) hoy `runForHotel` solo llama `side:"entry"` → el informe **no calcula cap de salida**; (2) el exit = entry **+20 bps fijo**, **no** una re-derivación por estado; (3) no hay modelo del estado del activo **a la salida** (envejecimiento). Es justo el caso que anticipaste ("si hoy solo da uno … planificamos el mínimo").
- **Mínimo D4 (planificado):** (a) quitar `sideAdjustment` fijo; (b) derivar el **estado a salida** desde la misma señal (`new/needs_work` con CAPEX → a salida queda `renovated`/buen estado → exit≈entry; `renovated` sin CAPEX → envejece → estado peor → exit más alto); (c) segundo `runDynamicCapRate({ side:"exit", asset: assetAtExit })`. Cambio acotado en `adjustments/index.ts` + `underwriting-runner.ts`.

### Veredicto de proceso
**Ambos anclajes DIFIEREN de "como espero"** (D2: señal demasiado gruesa; D4: solo spread fijo). Según tu regla — *"si falta o difiere algún anclaje, PARA y repórtalo"* — **PARO y reporto. NO paso a código.** El auto-OK no se dispara. Necesito tu fallo en el anclaje D2 (opción A o B) y tu visto al mínimo D4. Con eso, sigo.

---

## 2 · Las 4 condiciones de la verificación BD (se mantienen)

1. **UNIDAD ÷100** — el reader divide /100; **test de guarda**: EBITDA ∈ `[0,1]` y cada ratio ≤ 1 tras ÷100 → un error ×100 **rompe el build**.
2. **SELECCIÓN por `segmentation_type`** — ahora con los 4 valores (D2) + mapeo a la enum de la BD (ver §6).
3. **JOIN por `submarket_name`** — verificado que calza con la tabla `submarket`.
4. **FALLBACK etiquetado** — submercado real → nacional → derivado → `no_data`, con el **nivel visible** en el informe.

---

## 3 · Modelo de la RAMPA FF&E (D1 · CAPEX-driven, ver DELTA v3) — cómo se calcula

Función pura, nueva en `lib/report/financials/ffe-reserve.ts`. **El disparador es el CAPEX, no el tipo de activo** (D2 corregida):

```ts
// Provenance: operator_assumption (NO CoStar).
// hasCapex deriva de la MISMA señal de estado de renovación que usa el
// cap-rate engine: AssetState ("new" | "needs_work" => CAPEX; "renovated"
// estabilizado/por-defecto => sin CAPEX). Ver DELTA v3 · anclaje D2.
export function ffeReservePct(yearIndex0: number, hasCapex: boolean): number {
  if (!hasCapex) return 0.04;                      // operativo sin CAPEX → 4% plano
  const ramped = 0.02 + 0.01 * yearIndex0;         // CON CAPEX: 0.02, 0.03, 0.04, 0.05…
  return Math.min(0.04, ramped);                   // techo 4% ⇒ 2,3,4,4,…
}
```

`computePL` deja de usar `expFfeReserve` constante y aplica `ffeReservePct(y, hasCapex)` por año:
```ts
const ffe = times(horizon, (y) => ffeReservePct(y, hasCapex) * totalRevenue[y]);
const ebitda               = gop.map((g,i) => g - mgmt[i] - tax[i] - insurance[i]);          // PRE-replacement (headline)
const ebitdaAfterReplacement = ebitda.map((e,i) => e - ffe[i]);                              // POST-replacement (valoración)
```

Dos series en `PLComputed.results`: `ebitda` (pre-FFE, para el lector) y **`ebitdaAfterReplacement`** (post-FFE, **la que va al cap rate**).

> Nota metodológica: el techo 4% se alcanza en el **año 3** (índice 2). Un exit en año 7 toma 4% (estabilizado); un exit en año 2 toma 3%.

---

## 4 · Modelo del AÑO DE SALIDA (D3) — cómo se pasa al motor

### 4.1 · Resolución del modo de valoración por plan
Nuevo en `lib/report/financials/valuation.ts`:
```ts
export type ValuationMode =
  | { kind: "current_ttm" }                 // FREE  → NOI del año 1 (TTM 12m)
  | { kind: "exit_year"; year: number };    // PRO/PREMIUM → NOI del año de salida

export function resolveValuationMode(tier: Tier, requestedExitYear?: number): ValuationMode {
  if (tier === "free") return { kind: "current_ttm" };
  const y = clamp(requestedExitYear ?? 7, 1, 10);   // default AÑO 7, rango TTM(1)…10
  return { kind: "exit_year", year: y };
}
```

### 4.2 · Cálculo del valor (NOI/cap), atado a X5
```ts
export function computeEntryValuation(args: {
  pl: PLComputed;
  capRatePct: number | null;        // del engine
  costarRatiosResolved: boolean;    // X4 resolvió ratios reales (no fallback duro)
  mode: ValuationMode;
}): number | null {
  // X5: sin ratios CoStar o sin cap rate → NO se valora por NOI.
  if (!args.costarRatiosResolved || args.capRatePct == null) return null;
  const yi = args.mode.kind === "current_ttm" ? 0 : args.mode.year - 1;
  const noi = args.pl.results.ebitdaAfterReplacement[yi];   // POST-FFE (D1)
  return Math.round(noi / (args.capRatePct / 100));
}
```

### 4.3 · Horizonte de proyección (sub-decisión, ver §11)
`computePL` hoy proyecta **5 años**; el año de salida llega a **10**. El plan parametriza `computePL(assumptions, { horizonYears })`:
- Y1–Y5: como hoy (presets de escenario).
- **Y6–Y10: crecimiento terminal** (mantener ocupación estabilizada del Y5 + ADR a una tasa terminal). La tasa terminal es una **sub-decisión de método** (§11): propongo ADR terminal = última delta del escenario, ocupación plana.
- Para FREE el horizonte sigue siendo Año 1 (TTM); no necesita extensión.

---

## 5 · EBITDA canónico (F1) + línea de seguros (queda alineado con D1)

- Añadir **`expInsurance`** a `PLAssumptions.ratios` y `"exp-insurance"` a `PLLineItemId` (hoy **no existen**).
- Fórmula firmada: `EBITDA = GOP − mgmt − property_tax − insurance` (pre-replacement) y `EBITDA after replacement = EBITDA − FFE_ramp` (la de valoración, D1).
- Base del **A&G**: resolver con el cross-check §7 (que el GOP reproduzca el de la fila CoStar).
- `engine/pnl.ts` (motor 11y del IRR) queda divergente hasta F6 (fuera de alcance) — se **anota** para no olvidarlo.

---

## 6 · Ficheros que se tocan

### Nuevos
- `lib/report/financials/ffe-reserve.ts` — rampa FF&E (§3) + tipo `SegmentationType`.
- `lib/report/financials/valuation.ts` — `resolveValuationMode` + `computeEntryValuation` (§4).
- `lib/report/financials/pnl-template-reader.ts` (server-only) — lee `pnl_template`, escalera de fallback, **÷100**, mapeo de `segmentation_type`, devuelve `{ ratios, source_level, data_source }`.

### Modificados
- **`lib/report/canonical-reader.ts`** — añadir `segmentation_type: "hotel"|"apartmenthotel"|"hostel"|"hotelproject"|null` a `CanonicalHotelRow` + `SELECT_COLS` (D2). **Mapeo a la enum BD** (`pnl_template` usa `hotel|apartahotel|hostel`): `apartmenthotel→apartahotel`, `hotelproject→hotel` (un proyecto usa plantilla hotel hasta tener dato propio, pero con rampa FF&E desde cero). Documentar el mapeo en el reader.
- **`lib/report/financials/types.ts`** — `expInsurance` en `ratios`; `"exp-insurance"` en `PLLineItemId`; `ebitdaAfterReplacement` en `PLComputed.results`; quitar el rol "constante" de `expFfeReserve` (pasa a derivarse de la rampa). `assumptionDenominator` por línea para documentar la base.
- **`lib/report/financials/calculations.ts`** (`computePL`) — `horizonYears` param; línea de seguros; rampa FF&E por año; dos series EBITDA (pre / after replacement); base A&G según §7; crecimiento terminal Y6+.
- **`lib/report/report-object/sections/financials.ts`** (`buildFinancialsSlice`) — consume `pnl-template-reader` para los ratios (mantiene occ/ADR de `marketKpi` + facility-aware); pasa `segmentation_type`; puebla `provenance.source` con `source_level`; **fallback duro etiquetado** a `getDefaultAssumptions()` si el reader falla.
- **F3:** `canonical-mappers/executive-summary.ts` + `report-object/sections/underwriting.ts` — `estimatedValue = computeEntryValuation(...)` (sustituye `perRoom × keys`). €/key se conserva solo como banda de sanity o cuando `capRate === null` (etiquetado). El **año de salida** y el **tier** llegan vía `BuildReportOptions` (el report-object ya recibe `tier`); añadir `exitYear?` opcional.
- **`lib/report/financials/coverage.ts`** — unificar: `source_level`/`isProvisionalTemplate` se derivan del `pnl-template-reader` (una sola fuente = `pnl_template`). Deprecar el JSON build-time `costar-financials-master.generated.json` (hoy **desincronizado** con la BD).
- **`lib/underwriting/versioning.ts`** — `ENGINE_VERSION` 0.2.0 → **0.3.0**.

### Tests
- `financials/calculations.test.ts` — guarda de rango EBITDA/GOP ∈ [0,1] (mata el ×100); cuadre ingresos 100%; fórmula EBITDA exacta; **rampa FF&E** `2,3,4,4,4`; `ebitdaAfterReplacement = ebitda − ffe`.
- `financials/valuation.test.ts` — `resolveValuationMode` (free→TTM, pro→7 default, clamp 1..10); `computeEntryValuation` devuelve `null` sin cap rate / sin ratios CoStar (X5); valor = NOI(año salida)/cap.
- `financials/pnl-template-reader.test.ts` — escalera de fallback, ÷100, mapeo segmentation_type, etiqueta.
- `financials/costar-crosscheck.test.ts` — §7.

---

## 7 · Cross-check de validación (obligatorio antes de cerrar)

El modelo HotelVALORA es **pre-rent y pre-IT**; la fila CoStar Madrid Centre publica **GOP 30,7 / EBITDA 24,2 con IT y rent**. Dos tests:

1. **Reconciliación CoStar (ground-truth de componentes):** reconstruir GOP/EBITDA *a la CoStar* (re-incluir IT en undistributed, rent en non-operating, **sin** rampa FF&E) desde los % de la fila → debe dar **GOP 30,7 % / EBITDA 24,2 %** ±0,5 pp. Valida mapeo de columnas + bases.
2. **Modelo HV (lo que se muestra):** `computePL` (sin IT, sin rent) sobre la misma fila → **GOP ≈ 32,6 %** (30,7 + IT 1,9). EBITDA pre-replacement ≈ 26,4 %; **EBITDA after replacement** = 26,4 − FFE(año) (p.ej. año 7 → −4 % → ≈ **22,4 %**). Congelar el número exacto tras §11.

**Cierre del gap F&B:** con `expFB = 0,792` (vs 0,65 Stitch) el GOP baja ~3,5 pp respecto al 39,3 % actual → ~36 %. El test 2 lo verifica.

---

## 8 · Seguridad del cambio (no romper el 80/80)

- **Fallback duro etiquetado:** si el reader falla → `getDefaultAssumptions()` con etiqueta "plantilla por defecto (sin CoStar)". Nunca fallo silencioso.
- **`no_data` real** (Barajas/Hortaleza, Madrid Province Regional, no-ES) → "cobertura CoStar pendiente", sin número fabricado.
- **X5 codificado:** `computeEntryValuation` devuelve `null` sin ratios CoStar o sin cap rate → F3 no calcula valor por NOI (evita ≈9 M€/hotel).

---

## 9 · ENGINE_VERSION + parity
1. `ENGINE_VERSION` 0.2.0 → 0.3.0.
2. Re-correr parity y actualizar `excel-parity-block-3a.md` / `-3b.md` (los números cambian a propósito).
3. `docs/changelog.md` + `ENTRYPOINTS.md`.

---

## 10 · Verificación final — LA HACE MIGUEL (con sus ojos), por plan
1. **Madrid Centre** → P&L con % de submercado + etiqueta **"Dato de submercado CoStar"**.
2. **Salamanca** → P&L nacional + etiqueta **"Fallback nacional ES"**.
3. **Barajas/Hortaleza** o **Madrid Province Regional** → **"cobertura CoStar pendiente"**.
4. **FREE** → solo "valor de mercado actual" (NOI TTM/cap), sin año de salida.
5. **PRO** → año de salida = **7** por defecto, configurable TTM…10; el valor cambia con el año y con el cap rate; NOI = **EBITDA after replacement** (post-FFE de ese año).
6. **PREMIUM** → como PRO + puede modificar supuestos.
7. EBITDA sano (no ×100), GOP convergido al ~36 %, rampa FF&E visible `2→3→4`.

---

## 11 · Sub-decisiones abiertas antes del OK final
1. **Crecimiento terminal Y6–Y10** (para exit > año 5): propongo ocupación plana del Y5 + ADR a la última delta del escenario. ¿OK o tasa terminal fija?
2. **Rampa FF&E por `segmentation_type`:** este commit aplica la misma rampa a los 4 tipos con el enganche marcado. ¿Confirmas diferir el "estabilizado va directo a 4%" o lo quieres ya para hotel/apartmenthotel/hostel y rampa solo para hotelproject?
3. **Mapeo `segmentation_type` canonical→BD:** `apartmenthotel→apartahotel`, `hotelproject→hotel`. ¿OK? (la BD no tiene filas `hotelproject` ni `apartmenthotel` con esa grafía).
4. **Cap rate de salida vs entrada:** ¿el NOI del año de salida se capitaliza al cap rate de **salida** (engine `side:"exit"`, +20 bps) o al de entrada? Hoy F3 usaría el de entrada; institucionalmente el exit value usa exit cap.

---

## 12 · Orden de ejecución (cuando haya OK final)
1. Sub-decisiones §11 — Miguel.
2. `ffe-reserve.ts` + `valuation.ts` + `pnl-template-reader.ts` (+ tests, incl. guarda ×100 y X5) — sin tocar `computePL`.
3. `canonical-reader.ts` (segmentation_type 4 valores + mapeo).
4. `types.ts` + `calculations.ts` (insurance + EBITDA pre/after + rampa + horizonte + base A&G) + cross-check §7.
5. `buildFinancialsSlice` consume reader + etiqueta + fallback duro.
6. `coverage.ts` unificado (deprecar JSON stale).
7. F3 (NOI/cap con modo por tier + año salida) en exec-summary + underwriting slice, atado a X5.
8. `ENGINE_VERSION` + parity + docs.
9. **Verificación humana §10 por Miguel.**
