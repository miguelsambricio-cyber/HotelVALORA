# TRAMO 5 · ADR real por hotel + Cap rate por submercado

> Diseño aprobado para **escribir, no implementar** (2026-05-30). X4b se cierra primero.
> Dos problemas independientes pero complementarios: el **ADR** corrige el NUMERADOR del valor
> (NOI); el **cap por submercado** corrige el DENOMINADOR (cap rate). Ambos se montan como
> **factores nuevos en la policy editable** + **cascada** + **validación por el espejo de cap
> implícito existente** (`lib/admin/financials/implied-cap-check.ts`) — misma arquitectura que
> X4b, sin reescribir el motor.

---

## 1 · ADR real por hotel (sobre todo lujo)

### Problema
`buildFinancialsSlice` fija `adrYear1` desde `marketKpi.adr_12m` = **ADR mezclado del submercado**
(un único ~€233 para todo Madrid Centre). Un hotel de lujo (Four Seasons, ADR real ~€700) hereda
€233 → NOI y valor **infravalorados**. El cap es correcto; el numerador no. (Verificado: Four
Seasons sale a 114 M€ / 572k€/llave vs deal real ~225 M€ / 1,125M€/llave.)

### Caveat clave — Booking es BAR, no ADR achieved
Las tarifas de Booking/RapidAPI son **BAR/rack** (pre-descuento, pre-mix de canal/corporate/grupo).
Como **nivel absoluto sobreestiman** el ADR achieved. → **NUNCA usar Booking como ADR absoluto.**
Sí sirven como **ÍNDICE RELATIVO dentro del submercado** (el ratio cancela el sesgo BAR-vs-achieved,
que es ~uniforme dentro de un mismo submercado).

### Solución — cascada de ADR (4 niveles)
```
1. ADR real del operador (OM del deal · input Premium)        ← más exacto al subscribir un deal
2. ADR CoStar por clase (submercado × clase) si se ingesta     ← achieved por segmento (gold)
3. ADR_submercado_CoStar × (tarifa_Booking_hotel /             ← NIVEL CoStar × ÍNDICE Booking
                            tarifa_Booking_media_submercado)
4. Fallback: ADR submercado mezclado (comportamiento de hoy)   ← etiquetado
```
Nivel 3 (núcleo de la propuesta):
```
ADR_hotel ≈ ADR_submercado_CoStar (achieved, fiable)
          × (media tarifa Booking del hotel ÷ media tarifa Booking del submercado)
```
CoStar pone el **nivel absoluto correcto**; Booking pone la **dispersión relativa** intra-submercado.
Ej.: Four Seasons con tarifa Booking 3× la media → ADR ≈ 233 × 3 ≈ €700.

### Barrida RapidAPI → medias internas (infra ya existente)
Existe el cron de enriquecimiento Booking (`/api/cron/hotel-enrichment`, 226 hoteles/día) +
RapidAPI Booking key + `lib/admin/hotels/booking-fetcher.ts`. Extensión incremental:
- **Sweep forward** de tarifas: `Get_Min_Price` / `Get_Availability_Calendar` por hotel · ventana
  **forward 30-90 días** · fechas muestreadas (capta estacionalidad) · LOS 1 · 2 pax.
- **Tabla nueva `hotel_rate_daily`**: `hotel_id · stay_date · scraped_at · rate · currency · los ·
  occupancy_signal?` · append-only → construye **medias internas** (trailing 30/90d).
- **Índice por submercado** = media tarifa hotel ÷ media tarifa submercado (misma cesta de fechas)
  → se aplica al ADR CoStar del submercado.
- Refresco con el cron diario existente.

**Caveats:** Booking = BAR (solo ratio) · cobertura (hotel sin `booking_id` → fallback etiquetado) ·
ocupación NO sale de Booking (sigue CoStar; el calendario de disponibilidad solo da señal gruesa de
sold-out — opcional fase 2).

---

## 2 · Cap rate por submercado

### Problema
El cap **base es por segmento** (`segment_base_priors_by_market[país][segmento]`), **sin dimensión
de submercado**. Madrid Centre upscale y Barajas upscale arrancan ambos en 5,75; solo difieren por
el factor liquidez (aún sobre el stub de 12 comps). Resultado real medido: Centre 6,00% vs Barajas
5,80% — **al revés** (Barajas, aeropuerto/secundario, debería abrir MÁS que Centre prime). El prior
de segmento captura **qué clase es** (asset) pero no **dónde está** (location premium/discount).

### Solución — factor de ubicación ortogonal, calibrado con €/llave real
Nuevo factor "submercado" en el motor (como los demás ejes), grounded en el **€/llave real por
submercado** de las **661 transacciones CoStar** (mismas que calibran los priors de segmento):
```
ajuste_submercado(submercado) ∝ −(€/llave_submercado − €/llave_mediana_mercado)
```
Más €/llave (Centre prime) → delta **negativo** (cap más bajo) · menos €/llave (Barajas) →
**positivo** (cap más alto). Calibrado a un rango (p.ej. **±0,50pp** en los extremos). Cap final:
```
cap = base_segmento(país, segmento)   ← "qué clase es"
    + ajuste_submercado(submercado)    ← "dónde está"  (NUEVO)
    + size + operator + liquidity + score + scenario + macro
```

**Por qué híbrido (no base per-submercado):** mantener el prior de segmento a nivel mercado/nacional
+ añadir **un** factor de ubicación es más robusto que `priors[país][submercado][segmento]` (que
explota el dato y deja casi todo submercado sin muestra).

**Cascada del factor submercado:**
```
€/llave del submercado (≥ N tx)  →  tier experto de submercado editable  →  etiquetado
                                     (prime CBD / urbano secundario /
                                      aeropuerto-periferia / regional)
```
**Procedencia:** `expert_prior` (tier) hasta que el €/llave del submercado tenga muestra suficiente
→ `calibrated_from_kpi`. **Validación:** con el espejo de cap implícito existente, igual que los
priors de segmento. **Agnóstico:** el mapa de submercados (€/llave + tiers) vive en la policy por
país; otro mercado trae los suyos. El panel admin gana tabla/columna de submercado editable.

### DECISIÓN PENDIENTE (no resuelta · se decide al abrir el Tramo 5)
**Factor submercado vs liquidez: ¿complementarios o fundidos?** El factor liquidez (nº de deals) y
el de submercado (€/llave/ubicación) están correlados.
- **Complementarios:** liquidez = profundidad de salida · submercado = premium de ubicación.
- **Fundidos:** un solo eje de "mercado-local" (€/llave + profundidad).

---

## Encaje conjunto (ejemplo)
- **Four Seasons** (Centre prime, lujo): ADR fix sube NOI a real (~3×) **+** submercado Centre da
  delta **negativo** (cap aún más bajo, ~4,75%). → valor sube por NOI **y** por cap. Realista.
- **Meliá Barajas** (aeropuerto, upscale): submercado Barajas da delta **positivo** (cap abre,
  p.ej. 5,80 → ~6,5-7,0%) → valor baja correctamente. ADR Barajas ya es bajo (€112), poco cambio.

El ADR corrige el numerador (NOI), el submercado el denominador (cap); juntos dan un valor realista.

## Fases
| | Fase 1 (rápida · expert) | Fase 2 (calibrada con dato) |
|---|---|---|
| **ADR** | input ADR operador (Premium) + fallback etiquetado | barrida Booking → `hotel_rate_daily` → índice submercado |
| **Submercado** | tiers de submercado editables en panel (`expert_prior`) | €/llave por submercado de las 661 tx → `calibrated_from_kpi` |

Ambos: **factores nuevos en la policy editable** + **cascada** + **validación por espejo de cap
implícito** — misma arquitectura que X4b, sin reescribir el motor.

---

## 3 · Modelo de calidad del cap rate · confort + ubicación (diseño · NO implementar)

Tres señales que Mike separó (2026-05-30) al cerrar el ajuste de renovación reward-only en X4b
(el confort se sacó de X4b y se difiere aquí):

- **UBICACIÓN — palanca estructural e IRREVERSIBLE.** Una reforma no cambia la ubicación; merece
  más peso. **Recomendación a evaluar: subir su peso DENTRO del Score** (hoy Location 0,333),
  **NO** sacarla como factor separado del cap → evita el **DOBLE CONTEO** (la ubicación contaría
  dos veces: en el Score y como factor propio). Un solo canal, más peso.
- **CONFORT como componente de CALIDAD** — ya está en el Score (Comfort 0,222). Ajustar su peso si
  procede (mismo canal Score).
- **CONFORT como DETECTOR de necesidad de renovación** — función NUEVA y distinta del componente de
  calidad: confort bajo → activo cansado → marca `needs_work` aunque falte la fecha de renovación.
  Esto SÍ podría ser un mecanismo aparte del Score (un detector de condición, no un peso de
  calidad). A diseñar. (En X4b se descartó: el ajuste de renovación es reward-only, sin reno
  probada = neutro, sin necesidad de detector — el detector solo aportaría si se quisiera volver a
  un esquema con penalización por condición.)

### DECISIÓN PENDIENTE (se decide al abrir el Tramo 5)
¿Ubicación/confort **solo vía pesos del Score** (un canal, evita doble conteo), **o** confort como
**detector de condición aparte** (mecanismo separado)? La primera es más simple y limpia; la
segunda reintroduce una señal de condición. Mike lo decide al abrir el Tramo 5.

---

## 4 · ADR diario por hotel · visión de producto + lección de 2023

> Complementa la §1 (ADR para valoración). Aquí el ADR diario por hotel se mira como **feature de
> producto** (poblar las tarjetas de selección de activo y de competidor), no solo como input del
> NOI. Misma fuente (`hotel_rate_daily`), dos consumidores: el motor (§1) y la UI de compset.

### VISIÓN
Capturar una **ESTIMACIÓN de ADR diario por hotel** vía **agentes que corren automáticamente cada
día** (RapidAPI/Booking → poblar `hotel_rate_daily` → **medias internas** trailing 30/90d).
- **Dónde se muestra:** en las **tarjetas de selección de activo** y de **competidor** del `/compset`.
- **Etiquetado obligatorio:** SIEMPRE como **"ADR estimado"** — es **precio de escaparate Booking
  (BAR/rack), NO ADR realizado** · sesgo al alza conocido (ver §1 "Booking es BAR, no ADR achieved").
  Nunca presentar como dato realizado del hotel.
- **Uso:** que el usuario **construya su compset según sus preferencias** viendo el ADR estimado de
  cada candidato (hoy, por decisión D2, las tarjetas muestran marca + submercado + distancia +
  estrellas, SIN ADR — porque no hay dato por hotel en ningún sitio; esto es lo que lo desbloquea).
- **DIFERENCIADOR:** STR **no** da ADR individual por hotel; esto **sí**. Ventaja competitiva.

### LECCIÓN DE 2023 — autopsia del backup metcub (2026-06-01)
El intento previo (DB `metcub`, `docs/0. Software 2024 HOTEL REPORT...`) **NO capturó ADR por
hotel**. La tabla `properties_propertyrates` (107.545 filas) **colapsó a una plantilla de CATEGORÍA
por estrellas**, no por activo:
- **44 series distintas** para 1.287 hoteles; las 10 más comunes cubren **1.253/1.287**. **28 hoteles
  5★ comparten byte-a-byte la serie −36/67/153**; **188 hoteles 4★** comparten −28/53/122; etc. →
  Bless = Mandarin Oriental Ritz = Eurostars Tower con el mismo número (imposible si fuera real).
- **Densidad falsa:** ~106 puntos **mensuales** 2015-2023 (1 día/mes, hueco 31d), **no 365/año**.
- **Precios NEGATIVOS** (−36, −29…) → **bug de parseo** sin validación.
- Solo distinguía `guests` + `breakfast`, **sin tipo de habitación**.
- (`properties_propertyoccupancy` y `properties_adrseries` estaban **vacías** — cero ocupación/ADR.)

**El nuevo sistema DEBE:**
- **(a)** guardar precio genuinamente **POR HOTEL** (clave por `hotel_id` real · `booking_id` propio),
  nunca un valor de categoría replicado.
- **(b)** **validar/descartar negativos y outliers** (rango plausible por clase · filtro de saltos).
- **(c)** **normalizar** tipo de habitación + ocupación (LOS/pax) + desayuno antes de promediar
  (aislar "doble estándar, 2 pax, sin desayuno" como cesta comparable).
- **(d)** capturar **densidad intra-año real** (fechas muestreadas forward 30-90d con estacionalidad),
  **no 1 punto/mes**.

### TODO Tramo 5 (antes de montar la barrida nueva)
Hacer una **autopsia más profunda del scraper Python de 2023** (`metcub-datos-delivery.zip`:
`booking.py`, `giata.py`, `hotel_codes.py`, `match_giata_booking.py`, `csv_import_rates.py`) para
extraer el **resto de errores concretos** (por qué colapsó a categoría, de dónde salen los negativos,
cómo emparejaba GIATA↔Booking) y no repetirlos en el sistema nuevo.
