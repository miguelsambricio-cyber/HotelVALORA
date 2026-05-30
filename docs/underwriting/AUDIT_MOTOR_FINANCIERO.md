# AUDITORÍA · MOTOR FINANCIERO — HotelVALORA

> Auditoría de **solo lectura**. Diagnóstico, no arreglo. Ningún commit de código.
> Fecha: 2026-05-29 · Modelo: Opus 4.8 (`claude-opus-4-8`) · Autor: Claude Code
> Revisores pendientes: Miguel + Mike. **No iniciar ningún arreglo hasta revisión conjunta.**
> Ubicación: `docs/underwriting/` (junto a `cap-rate-policy-divergence.md` y `pl-data-divergence.md`, los docs hermanos que esta auditoría amplía).

---

## 0 · Regla de evidencia (léase primero)

Cada hallazgo está marcado con cómo se verificó:

- **[CÓDIGO]** — leído en el código fuente (análisis estático).
- **[EXCEL]** — leído de celdas/fórmulas de un `.xlsx` con openpyxl.
- **[CALCULADO]** — aritmética ejecutada de verdad (réplica exacta de la fórmula del código sobre datos reales). Distinto de "leído".
- **[EJECUTADO]** — recorrido real del usuario en la app. **No se usó ninguna vez.**

### Lo que NO se ejecutó (límites honestos)

- No se levantó `apps/web` ni se renderizó ninguna URL de informe.
- No se consultó la Supabase viva ni se confirmó qué devuelven las tablas.
- **No hay ni una cifra de latencia medida.** Los números de §4 son derivados del código o citados de comentarios, nunca cronometrados.
- No se recorrió el flujo real `/compset → Continuar → informe`. El riesgo "Continuar → mock" (§3) está leído en el código del fallback, no ejercitado.

---

## 1 · Fidelidad a la metodología

Contrastado contra `VALUATION_METHODOLOGY.md` (incl. anexos firmados).

### F1 · EBITDA: tres fórmulas, ninguna = metodología — **CRÍTICA**

Metodología (anexo EBITDA HotelVALORA): `EBITDA = GOP − mgmt − property_taxes − insurance` (sin IT, sin alquiler).

| Origen | Fórmula implementada | ¿seguros? | ¿FF&E reserve? |
|---|---|---|---|
| Metodología firmada | GOP − mgmt − tax − **insurance** | ✅ | ❌ |
| `financials/calculations.ts` `computePL` (página /pl) L156-158 | GOP − mgmt − tax − **ffe_reserve** | ❌ falta | ✅ no debería |
| `underwriting/engine/pnl.ts` (IRR) L45-51 | GOP − mgmt − tax − **insurance − ffe_reserve** | ✅ | ✅ no debería |

El EBITDA de Financials/P&L y el que alimenta el IRR difieren entre sí, y ambos del modelo firmado. **[CÓDIGO]**

### F2 · Ratios USALI calibrados a un mockup, no a CoStar — **ALTA**

`assumptions.ts` declara *"hand-tuned to match the Stitch reference"* (mockup de diseño). Contrastado contra `services/costar/MASTER/COSTAR_MASTER_FINANCIALS.xlsx` (la referencia real del hotel) — ver §3B para el detalle celda a celda. Divergencias clave: gasto F&B código 0,65 vs Excel **0,792**; A&G cambia de base (rooms→total); ops&mant 4,5% vs 3,8%; S&M 6,0% vs 6,5%; impuestos 1,1% vs 0,7%; seguros ausentes; FF&E reserve 4% inexistente en el Excel. **[CÓDIGO + EXCEL + CALCULADO]**

### F3 · El valor NO sale de NOI/cap rate — invierte la metodología — **CRÍTICA**

`executive-summary.ts` L256-266: `estimatedValue = perRoom(€/key hardcodeado por chain_scale) × keys`. L283-286: `ebitdaAfterReplacement = estimatedValue × capRate` (deriva el NOI *del* valor, al revés). El cap rate dinámico se calcula y se muestra pero **no entra en la valoración**. `report-object/sections/underwriting.ts` L76-85 repite el patrón. **[CÓDIGO]**

### F4 · Cap-rate engine ignora la admin policy — **ALTA**

`cap-rate-engine/adjustments/index.ts`: coeficientes hardcodeados; `buildAdjustments()` no recibe `policy`. Base = mediana de comps semilla, no `policy.base_market_yield_pct`. Confirma `docs/underwriting/cap-rate-policy-divergence.md` vigente. **[CÓDIGO]**

### F5 · Comparables = semilla ficticia, no reales 12m — **ALTA**

`cap-rate-engine/evidence/seeded-comps.ts`: 12 transacciones marcadas *"NOT confidential real transactions … demo"*, fechas 2023-2026. `underwriting-runner.ts` siempre pasa `SEEDED_HOTEL_COMPS`. **[CÓDIGO]**

### F6 · El P&L del IRR está desconectado del P&L facility-aware — **CRÍTICA**

`engine/pnl.ts` lee `inputs.pl_drivers` (arrays 11y hardcodeados en `SCENARIO_BASE`). `buildUnderwritingSlice` L111-112 mantiene `pl_drivers = SCENARIO_BASE`. IRR/yield/exit no derivan del P&L real del hotel. Confirma `pl-data-divergence.md`. **[CÓDIGO]**

### F7 · IRR/MOIC del summary estáticos para los 226 hoteles — **ALTA**

`buildUnderwritingSlice` L124-126: `project_irr/equity_irr/moic = SCENARIO_BASE.computed.exit.*`. **[CÓDIGO]**

### F8 · "12m como año 1": OK en P&L 5y, ausente en el valor — **MEDIA**
`financials.ts` L47-52 sí usa `adr_12m`/`occupancy_12m` como Year 1 (✅). Crecimiento Y2-5 hardcodeado ("Stitch"). El valor no usa ese NOI (F3). **[CÓDIGO]**

### F9 · Modelado no documentado / anexos no cableados — **MEDIA/BAJA**
Split 70/30 indocumentado; `segmentation_type` no se lee; tramos por tamaño no cableados; perfiles apartahotel/hostel solo en doc; `ebitdaStabilizedTarget: 0.505` irreal (memo). **[CÓDIGO]**

---

## 2 · Completitud (las 6 páginas)

🟢 real · 🟡 heurístico · 🔴 mock/hardcodeado.

- **Executive Summary**: 🟢 asset/KPIs/guard no_data · 🔴 valor €/key (F3) · 🔴 charts TTM **sintetizados con jitter** (`ttmFromAggregate`) · 🔴 €/sqm resid./oficina y gopMargin hardcodeados.
- **Asset Analysis**: 🟢 metrics/facilities · 🔴 `roomMix` inventado (4-5 cat. con unidades y m² hardcodeados) — **contradice metodología FASE 1** (fallback honesto a 3 cat.) · 🔴 `guestInsights` plantillados · 🟡 "Location score" = "Confort score" = mismo `review_score` · 🔴 stories/lot/planta = "—".
- **Competitive Set**: 🟢 subject + peers de consulta real (geo-ranked) · 🔴 atado a `city_normalized="Madrid"` · 🔴 sin MPI/ARI/RGI ni ADR/RevPAR del compset.
- **Market Overview**: 🟡 solo inyecta ADR/Occ/RevPAR/Yield · 🔴 narrativa/pipeline/mapa = mock · 🔴 transacciones/proyectos en datos estáticos (la pieza de mayor peso de la metodología, sin cablear pese a existir `services/transactions/MASTER`). *(las 2 sub-páginas no deep-read — confirmar.)*
- **Financials/P&L**: 🟢 `computePL` facility-aware + Year 1 12m + bandera provisional · 🔴 ratios Stitch (F2), EBITDA sin seguros (F1).
- **Underwriting**: 🟢 re-ejecuta `runEngine` 11y · 🔴 drivers estáticos (F6), valor €/key (F3), cap rate hardcodeado (F4), IRR summary estático (F7).

---

## 3 · DOBLE / TRIPLE FUENTE DE VERDAD (código ↔ Excel ↔ metodología)

### 3A · `HotelVALORA_Modelo_Financiero.xlsx` (raíz) NO es el modelo de hoteles — **ALTA**

**Hallazgo central:** el Excel de la raíz que se señaló como contraparte del motor financiero es, leyendo sus hojas, el **plan de negocio SaaS de la empresa HotelVALORA**, no un modelo de valoración de hoteles.

- Hojas: `Dashboard`, `Assumptions`, `Proj_BASE/CONSERVADOR/OPTIMISTA` (60 meses).
- `Assumptions`: precios de suscripción (PRO 290 €/mes, PREMIUM 990 €/mes), % clientes premium, **CAC** (300-900 €), **churn** mensual, costes fijos (CoStar 1.800 €, RapidAPI, infra), equipo, marketing, impuesto sociedades 25%, colchón de caja.
- `Dashboard`: **MRR, ARR, clientes activos, punto más bajo de caja, CAPITAL A LEVANTAR, LTV:CAC**.
- `Proj_BASE` (filas): Marketing/mes · Clientes nuevos/mes · Clientes activos · PREMIUM/PRO · **MRR** · costes datos+infra · equipo · CAC · total costes operativos · caja acumulada.

**No contiene:** ni un P&L de hotel, ni EBITDA de hotel, ni cap rate, ni valoración de entrada/salida. **Por tanto la comparación pedida (motor de hoteles ↔ este Excel) no es posible: miden universos distintos.** La "doble fuente de verdad" asumida no existe en este fichero. **[EXCEL]**

### 3B · El gemelo real del lado hotel es `COSTAR_MASTER_FINANCIALS.xlsx` — **comparación efectiva**

`services/costar/MASTER/COSTAR_MASTER_FINANCIALS.xlsx` (hoja DATA, 150 filas × 29 cols) **sí** es la referencia USALI del hotel que describe la metodología §3.1: por `country/market/submarket/class/segmentation_type` con todos los `*_pct` (ingresos, gastos, GOP, mgmt, rent, taxes, insurance, EBITDA, staff memo). Filas apartahotel/hostel **vacías** (pending), coherente con el anexo de perfiles derivados.

**Pero tampoco tiene cap rate ni valoración de entrada/salida.** Esos conceptos viven SOLO en el motor de código y en la metodología → **no existe contraparte Excel para validar cap rate ni entrada/salida en todo el repo.** Solo los % de P&L son cross-checkables.

Comparación de % P&L · fila CoStar `national_ES` (la que usa la metodología) vs `assumptions.ts`: **[EXCEL + CÓDIGO]**

| Línea | Código `assumptions.ts` | Excel CoStar (national_ES) | Metodología §3.1 | ¿Coincide? |
|---|---|---|---|---|
| Gasto F&B | 0,65 | **0,792** | 0,792 | ✗ (−14,2 pp) |
| Gasto rooms | 0,257 | 0,257 | 0,257 | ✓ |
| Otros deptos | 0,85 | 0,858 | 0,858 | ~ |
| Admin & general | 0,072 × **total** | 0,072 (s/ habitaciones) | 7,2% s/ habitaciones | ✗ base |
| IT/telecom | ausente | 0,013 | excluido (HV) | ✓ HV |
| Ventas & mkt | 0,06 | 0,065 | 0,065 | ✗ |
| Ops & mant | 0,045 | 0,038 | 0,038 | ✗ |
| Utilities | 0,028 | 0,028 | 0,028 | ✓ |
| Mgmt fees | 0,046 | 0,046 | 0,046 | ✓ |
| Rent | ausente | 0,078 | excluido (HV pre-rent) | ✓ HV |
| Impuestos inmuebles | 0,011 | **0,007** | 0,007 | ✗ |
| Seguros | **ausente** | 0,004 | 0,004 | ✗ |
| FF&E reserve | 0,04 (en EBITDA) | **no existe columna** | no en línea EBITDA | ✗ invención |
| Staff memo | 0,317 | 0,317 | 0,317 | ✓ |

> Nota: incluso la metodología §3.1 ("Madrid Centro Upper-Upscale": rooms 67,5%) coincide con la fila `national_ES`/Salamanca del Excel (0,675), **no** con la fila Madrid Centre del Excel (rooms 0,692). Inconsistencia interna metodología↔Excel, menor pero anotada.

### 3C · EBITDA calculado de verdad: código vs Excel CoStar — **ALTA**

Réplica exacta de la aritmética de `computePL` en Year 1 (donde el split 70/30 y la inflación no influyen), `total_revenue = 1`: **[CALCULADO]**

| Escenario | GOP | EBITDA |
|---|---|---|
| (A) Código actual (`assumptions.ts`) | **39,3%** | **29,6%** |
| (B) % Excel CoStar (admin sobre total, como hace el código) | 36,1% | 30,4% |
| (C) % Excel CoStar (admin sobre habitaciones + fórmula EBITDA HV) | 38,5% | 32,8% |
| Metodología §3.1 declara | 36,7% | 23,3% CoStar / ≈31,2% HV pre-rent |
| Excel `ebitda_pct` (incl. IT+rent) | — | 23,2% (≈32,3% pre-rent-sin-IT) |

- **El GOP del código está +3,1 pp por encima del Excel CoStar.** Causa principal: gasto F&B infra-contado (0,65 vs 0,792) → infra-cuenta el gasto en ~3,5 pp de ingreso total, inflando GOP.
- El EBITDA del código (29,6%) no coincide con ninguna de las definiciones de referencia; difiere por el cóctel FF&E-sí/seguros-no.
- **Conclusión:** existe divergencia material y cuantificada **código ↔ Excel ↔ metodología** en GOP y EBITDA. Severidad alta. (Cap rate y entrada/salida: no comparables — sin contraparte Excel.)

### 3D · Bridge del gap de GOP (+3,15 pp) línea a línea — **[CALCULADO]**

Partiendo del GOP del Excel CoStar (36,14%) y mutando un parámetro a la vez hasta el set del código (39,29%):

| Paso | Contribución al gap |
|---|---|
| Gasto F&B 0,792 → 0,65 (**infra-cuenta**, driver dominante) | **+3,55 pp** |
| Ventas & Marketing 0,065 → 0,06 (infra-cuenta) | +0,50 pp |
| Otros departamentos 0,858 → 0,85 | +0,06 pp |
| Mix de ingreso F&B 0,245 → 0,25 (baja rooms residual) | −0,27 pp |
| Ops & mantenimiento 0,038 → 0,045 (**sobre-cuenta**) | −0,70 pp |
| **Total gap** | **+3,15 pp** |

El gap NO es ruido difuso: el 100% lo explica el gasto F&B mal calibrado (+3,55), parcialmente compensado por ops&mant. Corregir solo F&B ya alinea el GOP casi del todo.

### 3E · Impacto downstream si se arregla F3 (valor = NOI/cap) — **[CALCULADO]** — **ALTA**

Hoy el gap de GOP NO toca la valoración porque el valor sale de €/key (F3), no de NOI/cap. **Pero en el momento en que se arregle F3 (lo correcto según metodología), este gap de GOP se convierte en error directo de valoración:**

- Hotel de 300 llaves · ADR 175 · occ 65% → ingreso total Year 1 ≈ **18,56 M€**.
- Gap +3,15 pp → sobre-estimación de GOP/EBITDA ≈ **584 k€/año**.
- A cap rate 6,5% → **sobre-estimación de valor ≈ 9,0 M€ por hotel**.

**Implicación de orden:** F3 (valor desde NOI/cap) y F2/X3 (ratios CoStar) **deben arreglarse juntos**. Arreglar F3 sin recalibrar los ratios introduce un error de ~9 M€/hotel donde antes (con €/key) no lo había. Es la dependencia más importante del plan.

### 3F · Origen estructural: los % CoStar existen en datos pero NO llegan al motor — **CRÍTICA** **[CÓDIGO]**

La causa raíz de X3/F2 no es una errata de constantes: es que **el `computePL` del informe nunca lee los % de CoStar**.

- Los % correctos existen en `COSTAR_MASTER_FINANCIALS.xlsx` y están promovidos a la tabla Supabase `pnl_template` (149 filas).
- La FASE 3 (`pnl-dimensions`, `pnl-line-mapping`, `pnl-overrides`, `useDraftedOverridesSupabase`) construye el **panel admin** para editarlos — pero sus propios comentarios lo dicen: *"Nothing consumes this yet"* (`pnl-dimensions/route.ts`) y *"nothing imports it yet"* (`pnl-line-mapping.ts`).
- `buildFinancialsSlice` → `getDefaultAssumptions()` (constantes "Stitch" de `assumptions.ts`) + override de occ/ADR + facility-aware. **Nunca consulta `pnl_template` ni el Excel CoStar.**

Conclusión: el principio rector de la metodología ("P&L con estructura USALI rellenada con los % de CoStar por submercado y clase") **no está cableado**: el motor usa constantes de un mockup. Mientras `pnl_template` → `computePL` no se conecte, recalibrar `assumptions.ts` a mano sería un parche, no la solución.

### 3G · Verificación de `pnl_template` en Supabase VIVO — **[EJECUTADO sobre BD]**

Consultado el proyecto `twebgqutuqgonabvhzjk` (solo lectura, 4 queries). **149 filas confirmadas.**

**Q3 · ¿lo referencia el motor del informe? — NO.** `pnl_template` aparece SOLO en `app/api/admin/financials/{pnl-template,pnl-overrides,pnl-dimensions}/route.ts`, `lib/admin/financials/{pnl-line-mapping,pnl-i18n}.ts` y `lib/supabase/types.ts` (generado). **Cero referencias en `lib/report/`** (`computePL`, `buildFinancialsSlice`, `canonical-reader`). Confirma X4/3F con evidencia: el path del informe nunca toca la tabla. **[CÓDIGO + EJECUTADO]**

**Q1 · ¿calza celda a celda con el Excel?** Los **valores CoStar coinciden**, pero con divergencias de representación/cobertura:

| Divergencia | Excel `COSTAR_MASTER_FINANCIALS.xlsx` | BD `pnl_template` | Impacto |
|---|---|---|---|
| **Unidad** | fracciones (`0.675`, `0.792`) | **porcentajes (`67.50`, `79.20`)** = ×100 | **CRÍTICO para X4**: leer como % y no fracción, o el P&L sale ×100 |
| Filas apartahotel/hostel | **VACÍAS** (113 vacías de 149) | **RELLENAS** · 72 `derived_mvp_rule` | BD enriquecida más allá del Excel |
| Columnas | solo `expenses_fb_pct` | añade `expenses_food_pct`(57.22)+`expenses_beverage_pct`(21.98)+`ffe_reserve_pct`(4.00) | drift de esquema (migración 0036) |
| `data_source` | `costar_national_ES` | `costar_national` | naming |
| Submercado | `Arguelles-Chamberi`, `Chamartin-Plaza de Castilla` (guion) | `Arguelles & Chamberi`, `Chamartin & Plaza de Castilla` (ampersand) | Excel↔BD difieren; **pero BD ↔ tabla `submarket` SÍ calzan** (el join que importa para X4 funciona) |

Valores CoStar verificados idénticos (×100): Madrid Centre = 69,2/16,1/7,2 · GOP 30,7 · EBITDA 24,2 (submarket_aggregate); los otros 5 submercados = 67,5/17,7/6,8 · GOP 36,7 · EBITDA 23,2 (national fallback). Perfiles derivados **exactos** al anexo: apartahotel 92/4/1 · GOP 61,3 · EBITDA 40,2 · mgmt 20 · staff 18; hostel 82/3/5 · GOP 49,9 · EBITDA 36,8 · mgmt 12 · staff 22. El `ffe_reserve_pct=4.00` de la BD coincide con la constante Stitch del código (no viene del Excel CoStar).

**Q2 · Cobertura — para qué hoteles funcionaría X4 hoy:**

- **108 filas ES Madrid** = 6 submercados × 6 clases × 3 tipos. **Solo 1 submercado tiene dato real de submercado** (Madrid Centre · `costar_submarket_aggregate`); los otros 5 usan el **fallback nacional ES** (números idénticos). **Cero diferenciación por clase** (las 6 clases comparten fila dentro de un submercado). Confirma en BD el anexo "los 226 hoteles con la misma plantilla base".
- **`submarket` tiene 8 submercados; `pnl_template` cubre 6.** Sin fila: **Barajas/Hortaleza/San Blas** y **Madrid Province Regional** → hoteles ahí caerían a fallback/no_data bajo X4.
- **41 países en `pending_costar`, todos NULL** (AE, AR, AT, AU, BE, BG, BR, CA, CH, CN, CO, CZ, DE, DK, EG, FI, FR, GB, GR, HR, HU, IE, IL, IN, IT, JP, KR, MX, NL, NO, NZ, PE, PL, PT, RO, SA, SE, SG, TR, US, ZA). Para esos hoteles X4 → sin dato (coherente con el country-guard que ya bloquea el engine fuera de ES).

**Veredicto X4 (para planificar el arreglo):** el cableado `pnl_template → computePL` funcionaría hoy para **hoteles ES en 6 submercados de Madrid** (1 con dato real de submercado + 5 con fallback nacional, sin diferenciación de clase). Requisitos del cableado: (1) tratar los valores como **porcentajes ÷100**; (2) seleccionar por **`segmentation_type`** (hotel/apartahotel/hostel); (3) join por `submarket_name` (calza con la tabla `submarket`); (4) fallback explícito para los 2 submercados sin fila y para no-ES (no_data). Los datos están listos y son fieles; lo que falta es la conexión.

---

## 4 · Agilidad / rendimiento (derivado del código, sin ms medidos)

- **A1 [ALTA]** Sin `ReportObject` compartido entre secciones + `force-dynamic` en las 6 páginas → ~6× round-trips Supabase + 6× motor por informe, sin caché.
- **A2 [MEDIA]** `runForHotel` se ejecuta 2× por Executive Summary (mapper + write de librería).
- **A3 [BAJA]** `joinLookups` = 3 queries extra por hotel (paralelas).
- **A4 [MEDIA]** `runEngine` 11y por carga de Underwriting con drivers estáticos.
- **A5 [MEDIA, citado]** Parse de `snapshot.json` 4,6 MB en lambda fría (comentario cita 100-300 ms; write librería ~80-150 ms).

**3 cuellos más caros (sin ms reales):** (1) 6× recomputación por informe; (2) doble `runForHotel` + parse 4,6 MB en frío en la primera página; (3) `runEngine` 11y por Underwriting con drivers estáticos (trabajo desperdiciado hoy).

---

## 5 · Tabla de hallazgos

| # | Área | Qué | Severidad | Cómo se verificó | Esfuerzo |
|---|---|---|---|---|---|
| F1 | Fidelidad | EBITDA con 3 fórmulas; ninguna = metodología | CRÍTICA | [CÓDIGO] | M |
| F2 | Fidelidad | Ratios USALI = mockup Stitch, no CoStar; base A&G | ALTA | [CÓDIGO+EXCEL+CALC] | S* |
| F3 | Fidelidad | Valor = €/key × llaves; cap rate no entra (invierte NOI/cap) | CRÍTICA | [CÓDIGO] | L |
| F4 | Fidelidad | Cap-rate engine ignora admin policy | ALTA | [CÓDIGO] | M-L |
| F5 | Fidelidad | Comparables ficticios semilla, no reales 12m | ALTA | [CÓDIGO] | L |
| F6 | Fidelidad | IRR sobre `pl_drivers` estáticos, desconectado del P&L | CRÍTICA | [CÓDIGO] | L |
| F7 | Fidelidad | IRR/MOIC summary estáticos para 226 hoteles | ALTA | [CÓDIGO] | M |
| F8 | Fidelidad | "12m como año 1" OK en P&L; Y2-5 hardcodeado | MEDIA | [CÓDIGO] | S |
| F9 | Fidelidad | Split 70/30 indoc.; segmentation_type/tramos no cableados | MEDIA/BAJA | [CÓDIGO] | L |
| P-ES | Completitud | Exec Summary: charts TTM sintetizados + hardcodeos | ALTA | [CÓDIGO] | M |
| P-AA | Completitud | Asset: roomMix inventado + insights plantillados | ALTA | [CÓDIGO] | M |
| P-CS | Completitud | CompSet: real pero atado a Madrid; sin MPI/ARI/RGI | MEDIA | [CÓDIGO] | M |
| P-MO | Completitud | Market Overview: narrativa + transacciones en mock | ALTA | [CÓDIGO] | L |
| X1 | Excel | `HotelVALORA_Modelo_Financiero.xlsx` es el plan SaaS, NO el modelo de hoteles | ALTA | [EXCEL] | — |
| X2 | Excel | Sin contraparte Excel para cap rate ni entrada/salida en todo el repo | ALTA | [EXCEL] | — |
| X3 | Excel | GOP código +3,15 pp vs CoStar (3,55 pp del F&B 0,65 vs 0,792); EBITDA no casa | ALTA | [CALCULADO] | S* |
| X4 | Estructura | Los % CoStar (`pnl_template`/Excel) NO llegan a `computePL`; el motor usa constantes Stitch. FASE 3 aún no consume nada | CRÍTICA | [CÓDIGO] | L |
| X5 | Excel | Si se arregla F3, el gap de GOP → ≈9 M€/hotel de error de valoración. F3 y F2/X3 deben ir juntos | ALTA | [CALCULADO] | — |
| D1 | Integridad | canonical_id end-to-end bien diseñado | OK | [CÓDIGO] | — |
| D2 | Integridad | Guard no_data implementado, NO ejercitado | ALTA (verif.) | [CÓDIGO] | S (test) |
| D3 | Integridad | "Continuar → mock": fallback silencioso enmascara fallos | ALTA | [CÓDIGO] | S-M |
| D4 | Integridad | ~50% corpus sin llaves → valor sobre 2 heurísticos; total_sqm siempre inventado | MEDIA | [CÓDIGO] | M |
| D5 | Integridad | Consistencia base canónica tras promote: NO verificada | ? | no verificado | — |
| A1 | Rendimiento | 6× round-trips + 6× motor por informe; sin ReportObject; force-dynamic | ALTA | [CÓDIGO] | M |
| A2 | Rendimiento | `runForHotel` 2× por Executive Summary | MEDIA | [CÓDIGO] | S |
| A3 | Rendimiento | joinLookups 3 queries extra por hotel | BAJA | [CÓDIGO] | S |
| A4 | Rendimiento | runEngine 11y por Underwriting con drivers estáticos | MEDIA | [CÓDIGO] | M |
| A5 | Rendimiento | Parse snapshot 4,6 MB en frío (citado, no medido) | MEDIA | [CÓDIGO] | M |

\* "S" de código, pero requiere **decisión de producto** (qué % son canónicos, base del A&G, fórmula EBITDA) antes de tocar.

---

## 6 · Lista priorizada en dos columnas

### (A) Lo que BLOQUEA el informe completo de punta a punta
1. **F3** — Valor desde NOI/cap rate (hoy €/key; cap rate decorativo). *CRÍTICA*
2. **F6** — Conectar el P&L facility-aware al motor de IRR. *CRÍTICA*
3. **F1 + X3** — Fórmula EBITDA única y alineada con el Excel CoStar (seguros sí, FF&E fuera). *CRÍTICA*
4. **F7** — IRR/MOIC reales por hotel (cae con F6). *ALTA*
5. **X4 + F2** — Cablear `pnl_template` (% CoStar) → `computePL` (hoy usa constantes Stitch; los % correctos ya están en BD pero no se leen). Recalibrar a mano `assumptions.ts` sería un parche; la solución es conectar el pipeline. *CRÍTICA/ALTA*
6. **X5 — dependencia de orden:** F3 y X4/F2/X3 **deben ir juntos**. Arreglar F3 (valor=NOI/cap) sin los % CoStar correctos introduce ≈9 M€/hotel de error donde hoy no lo hay.
7. **D3** — Endurecer el fallback "Continuar → mock" (señal/telemetría, no enmascarar). *ALTA*
8. **F5 / P-MO** — Comparables y transacciones reales del submercado. *ALTA*
9. **P-AA** — Room mix honesto a 3 categorías; quitar insights plantillados. *ALTA*
10. **D2** — Ejercitar el guard no_data con un hotel no-ES, punta a punta. *ALTA, barato*
11. **F4** — Engine consume admin policy. *ALTA*

> **X1/X2 no se "arreglan" en el motor**: son una corrección de expectativa de fuente. Decisión de producto: ¿se quiere un Excel-gemelo de valoración de hoteles (cap rate + entrada/salida) para validar el motor? Hoy NO existe; el único Excel hotel es la tabla USALI de CoStar.

### (B) Lo que AGILIZA el motor
1. **A1** — `ReportObject` único por request, cacheado y compartido; revisar `force-dynamic`.
2. **A2** — Eliminar el doble `runForHotel` en Executive Summary.
3. **A4** — Memoizar/cachear `runEngine` mientras los drivers no varíen por hotel.
4. **A5** — Precomputar/encoger el snapshot o pasar a consultas indexadas.
5. **A3** — Sustituir `joinLookups` por una vista / select con joins.

---

## 7 · Recomendación de orden (diagnóstico — NO empezar)

**Paso 0 · Decisiones de producto (Miguel), sin código**
- Fórmula EBITDA canónica (¿FF&E dentro/fuera? ¿seguros?). Alinear con `COSTAR_MASTER_FINANCIALS.xlsx`.
- Qué ratios son canónicos (hoy Stitch vs CoStar) y base del A&G.
- ¿El valor debe ser NOI/cap (metodología) o se mantiene €/key como puente declarado? (alcance de F3).
- ¿Se crea un Excel-gemelo de valoración de hoteles (cap rate + entrada/salida) como fuente de verdad, o la metodología + motor son la única referencia para esos dos?

**Paso 1 · Verificar antes de tocar (barato) — [EJECUTAR]**
- Recorrer `/compset → Continuar → 6 secciones` con un hotel ES y uno no-ES → confirma D2 y D3 de verdad.
- Medir latencia real por sección (build + Network devtools) → sustituir las estimaciones de §4.

**Paso 2 · Núcleo de fidelidad (lo que bloquea el informe)**
F1 (EBITDA único primero, porque los demás dependen de qué EBITDA fluye) → **X4 (cablear `pnl_template` → `computePL`, que arrastra F2/X3)** → F6 → **F3 (junto a X4, por X5)** → F7. Subir `ENGINE_VERSION` + re-correr parity. **No arreglar F3 sin X4/F2 ya resueltos (X5: ≈9 M€/hotel de error).**

**Paso 3 · Datos reales que sostienen el método**
F5 → F4 (engine ↔ admin policy) → P-MO/P-AA.

**Paso 4 · Rendimiento**
A1 → A2 → A4 → A5 → A3. Después del Paso 2/3, para no optimizar fórmulas que aún van a cambiar.

### Experimentos para convertir a [EJECUTADO]
- Latencia por sección: `npm run build && npm run start`, devtools Network (frío y caliente).
- no_data real: hotel no-ES → confirmar "—".
- mock real: `/report/<uuid-inexistente>/executive-summary` → ver si sirve mock sin señal.

---

## 8 · Inventario de `docs/` (solo informativo · NO se mueve nada)

`docs/` contiene hoy **161 archivos `.md`**, organizados por subcarpetas temáticas según la "Documentation Architecture" de `CLAUDE.md` (estructura canónica · se mantiene tal cual).

**Top-level `docs/*.md` (31)**: `HANDOFF.md`, `HOTELVALORA_MASTER_SYSTEM.md`, `SNAPSHOT_2026_05_12.md`, `alias-registry.md`, `api.md`, `architecture.md`, `auth.md`, `backend.md`, `business-rules.md`, `changelog.md`, `component-library.md`, `data-pipeline.md`, `database.md`, `deployment.md`, `design-system.md`, `financial-engine.md`, `financial.md`, `frontend.md`, `imports.md`, `maps.md`, `merge-engine.md`, `normalization.md`, `observability.md`, `print-pdf.md`, `report-system.md`, `roadmap.md`, `routing.md`, `testing.md`, `underwriting.md`, `workflows.md`.

**Subcarpetas (130)**: `agents/` 4 · `ai-agents/` 10 · `architecture/` 7 · `business-rules/` 3 · `data-models/` 3 · `database/` 1 · `design-system/` 3 · `features/` 8 · `hotel-intelligence/` 21 · `infrastructure/` 7 · `integrations/` 9 · `intelligence/` 21 · `legacy/` 11 · `maps/` 6 · `meta/` 1 · `report/` 2 · `roadmap/` 3 · `underwriting/` 10 (este informe incluido).

La estructura `docs/` se conserva sin cambios. Este informe vive en `docs/underwriting/` por afinidad temática.

---

## 9 · Mantenimiento documental (pendiente, no ejecutado)

Al aceptar este informe, registrar:
- `ENTRYPOINTS.md` → fila en la sección "Domain — Report Module" → `docs/underwriting/AUDIT_MOTOR_FINANCIERO.md`.
- `docs/changelog.md` → una línea con la fecha.
