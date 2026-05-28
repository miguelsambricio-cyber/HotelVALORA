# VALUATION_METHODOLOGY.md — HotelVALORA

> Documento maestro de la metodología de valoración. Define **qué hace cada fase del informe** y **de dónde sale cada número**. Es la fuente de verdad que las páginas del informe (Asset Analysis, Competitive Set, Market Overview, Financials, Underwriting) deben seguir. Refleja el método real de un analista de adquisiciones hotelero.

---

## Principio rector

El modelo replica el trabajo de un analista de adquisiciones: foto del activo hoy → mercado y comparables → P&L y EBITDA → underwriting con valor de entrada y salida. La estructura del P&L sigue el estándar **USALI** y se rellena con los **porcentajes que CoStar entrega por submercado y clase**. La misma mecánica es válida en cualquier país: solo cambian los porcentajes locales, no la lógica. El producto es geográficamente agnóstico por diseño; un mercado se "enciende" en cuanto CoStar aporta sus datos.

Un hotel rebrandeado, uno existente y un proyecto se tratan igual: se parte de la **situación actual** del activo, no de su historia. El nombre antiguo es un alias del mismo `canonical_id`.

---

## Jerarquía de datos (de dónde sale cada número)

```
País → Mercado → Submercado → Clase → CompSet → Hotel
```

- **Datos del hotel** (físicos): nombre, habitaciones, categoría, año, facilities, áreas de ingreso. Fuente: CoStar a nivel hotel + enriquecimiento (Booking, Google).
- **Datos de mercado** (ADR, RevPAR, ocupación, % USALI, cap rate, €/key): se toman del nivel que corresponda. Los **% de estructura P&L** vienen de CoStar **por submercado y clase**.
- **Comparables transaccionales**: operaciones reales del submercado/clase. **Pieza de mayor peso del análisis** — es la realidad del mercado.

Regla de honestidad: si falta cobertura de datos para un nivel, el informe muestra "dato no disponible / cobertura pendiente", **nunca** un valor fabricado ni heredado de otro mercado (ver guard de país, commit C).

---

## FASE 1 · HOTEL ASSET — foto del activo hoy

Objetivo: capturar el activo en su estado actual, con foco en **todas las áreas que generan ingreso**.

- Características y facilities.
- Áreas de ingreso: habitaciones, F&B (comida y bebida), meeting rooms y eventos, spa y wellness, parking y rentals.
- **Room mix**: dato difícil. Jerarquía de fuentes: (1) Booking.com; (2) si no aparece, otra fuente con descripción de habitaciones; (3) fallback honesto a tres categorías — **individual, doble, suite**. No se inventa.

Página del informe: **Asset Analysis**.

---

## FASE 2 · HOTEL MARKET — compset y mercado

Objetivo: situar el activo en su mercado macro y micro.

- **CompSet**: hoteles competidores del activo.
- Mercado macro y micro: ADR, RevPAR, ocupación, pipeline, por submercado y clase.
- **Comparables transaccionales** ← la pieza que más mira el analista. Operaciones reales recientes de activos similares. Es la verdad del mercado, por encima de medias teóricas.

Páginas del informe: **Competitive Set** + **Market Overview**.

---

## FASE 3 · P&L Y VALORACIÓN — EBITDA, cap rate, underwriting

### 3.1 · P&L (estructura USALI)

El P&L se construye con la estructura USALI rellenada con los **% de CoStar por submercado y clase**. Ejemplo de plantilla — **España / Madrid / Madrid Centro / Upper-upscale** (los % cambian por mercado; la estructura no):

**Ingresos**
| Línea | % |
|---|---|
| Habitaciones | 67,5% |
| F&B — comida | 17,7% |
| F&B — bebida | 6,8% |
| F&B total | 24,5% |
| Meeting rooms y eventos (otros A&B) | 3,8% |
| Spa y wellness (otros departamentos) | 2,2% |
| Parking y rentals (ingresos varios) | 1,9% |

**Gastos de explotación** (cada % sobre su base de ingreso departamental)
| Línea | % | Base |
|---|---|---|
| Habitaciones | 25,7% | s/ ingreso habitaciones |
| F&B | 79,2% | s/ ingreso F&B |
| Otros departamentos | 85,8% | s/ meeting + spa |
| Administrativo y general | 7,2% | s/ habitaciones |
| Sistemas de información y telecom | 1,3% | |
| Ventas y marketing | 6,5% | |
| Operaciones y mantenimiento | 3,8% | |
| Servicios básicos (utilities) | 2,8% | |

**Resultado**
| Línea | % |
|---|---|
| Margen bruto de operaciones (GOP) | 36,7% |
| Tarifas de gestión (management fees) | 4,6% |
| Precios de alquiler (rent) | 7,8% |
| Impuestos sobre inmuebles | 0,7% |
| Seguros | 0,4% |
| **EBITDA** | **23,3%** |
| Coste total del personal (memo) | 31,7% |

> Nota: los % anteriores son la plantilla de Madrid Centro Upper-upscale. Para cualquier otro submercado/clase del mundo se sustituyen por los % de CoStar correspondientes. La estructura es idéntica.

### 3.2 · Cap rate dinámico

El cap rate **no es fijo**. Se ajusta por categoría, ubicación, estado de renovación, número de habitaciones, liquidez del mercado, etc. El motor de cap rate dinámico, junto con el capex y la estructura financiera base, está descrito en `user/admin/financials`.

> Guard de país (commit C): el motor solo se ejecuta donde hay cobertura de mercado real. Fuera de cobertura, no inventa cap rate — espera a los datos de CoStar de ese submercado.

### 3.3 · Underwriting — valor de entrada y salida

Con el **P&L a 5 años** se construye el underwriting completo:

- **Valor actual / de mercado**: se calcula tomando los datos del **compset de los últimos 12 meses como si fueran el primer año de explotación**, combinados con los **% de CoStar por submercado y clase**.
- **Valor de salida**: se calcula a futuro (exit).
- De la relación entrada → salida salen: **yield, IRR project, IRR equity**.

Página del informe: **Financials** + **Underwriting**.

---

## Edición premium

El usuario PREMIUM puede modificar:
- Hotel Asset (características, áreas de ingreso).
- Escenarios de mercado (ADR/ocupación, RevPAR DOWN/BASE/UP).
- Estructura de valor (adquisición, exit, cap rate, financiación).

Todo recalcula en cadena hasta el underwriting.

---

## Por qué el modelo es mundial (nota para producto e inversores)

La estructura USALI es universal. CoStar entrega los % por submercado y clase **en cualquier parte del mundo**. Por tanto el motor no necesita lógica por país: necesita los datos locales de CoStar. Un mercado nuevo se activa cargando sus datos, sin cambios de código. Esta es la base de la escalabilidad del producto.

---

## Mapa fase → página → fuente de datos (para sincronización del informe)

| Fase | Página(s) | Datos del hotel | Datos de mercado |
|---|---|---|---|
| 1 · Asset | Asset Analysis | físicos + áreas de ingreso + room mix | — |
| 2 · Market | Competitive Set, Market Overview | ubicación, clase | compset + macro/micro + **comparables transaccionales** |
| 3 · P&L/Valoración | Financials, Underwriting | base del activo | **% USALI CoStar** por submercado/clase + cap rate dinámico + comps 12m |

Todas las páginas leen el mismo `canonical_id` vía `hotel_report` (commit C). Ninguna fabrica datos: o es del hotel, o es de un nivel superior etiquetado, o es "no disponible".

---

## ANEXO · Definiciones de F&B y Eventos/MICE (añadido 2026-05-26)

Estas definiciones precisan QUÉ conceptos se cuentan dentro de cada área de ingreso. Importan para (a) el parser de enriquecimiento — qué términos buscar en Booking/Google — y (b) la regla de ajuste del P&L por facilities reales.

### F&B (Alimentos y Bebidas) — qué engloba

El componente de F&B NO es solo "restaurante". Incluye todos los puntos de venta de comida y bebida del hotel:
- Bar
- Cafetería
- Lobby bar
- Restaurante
- Buffet
- Desayunos
- Rooftop (bar/restaurante en azotea)

Implicación para el enriquecimiento: el parser debe detectar todos estos términos (y sus variantes en otros idiomas) como señales de F&B, no solo "restaurant".

> A AFINAR EN PASO 4 (no cerrado): la regla aprobada de "+2-4% al F&B por restaurante por encima del primero" probablemente debe aplicarse a los RESTAURANTES de servicio completo, mientras que bar/cafetería/buffet/rooftop/desayunos definen la PRESENCIA y el peso general del F&B pero NO se acumulan uno a uno con el mismo factor (si no, un hotel con 7 puntos de F&B dispararía el % irrealmente). Decisión final de Miguel con el P&L delante.

### Eventos / MICE — qué engloba

La capacidad de eventos NO es solo "sala de reuniones". Incluye:
- Salas de reuniones
- Salones de reuniones
- Salones de eventos
- Jardines (para eventos)
- Espacios para eventos corporativos
- Espacios para bodas

Implicación para el enriquecimiento: esto explica el meeting_rooms_count = 0/226 del sweep — el parser buscaba un patrón demasiado estrecho ("N meeting rooms"). Debe ampliarse para detectar todos estos conceptos como señal de capacidad de eventos.

Regla CERRADA (Miguel, 2026-05-26): la PRESENCIA de cualquier espacio de eventos (salas, salones, salones de eventos, jardines, eventos corporativos, bodas) activa la línea de ingreso MICE en el P&L. Basta con que exista uno. Si no hay ninguno, la línea desaparece (coherente con la regla facilities-aware). Esta decisión está firme, no es "a afinar".

> A AFINAR EN PASO 4 (no cerrado): valorar si los eventos sociales (bodas, jardines) deben tratarse como sub-línea distinta de las salas corporativas, dado que tienen dinámicas de ingreso diferentes. Decisión de Miguel con el P&L delante.

### Conexión con el conteo del sweep

- restaurants_count se pobló solo en ~8% (19/226): Booking solo emite el número exacto vía accommodationHighlights para algunos hoteles. Decisión pendiente para el P&L: qué hacer cuando el conteo no está (¿presencia = 1? ¿estimar por clase?).
- meeting_rooms_count = 0/226: parser demasiado estrecho. Ampliar con las definiciones MICE de arriba. Revisar en Paso 4.
