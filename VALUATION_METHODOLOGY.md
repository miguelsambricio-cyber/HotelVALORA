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

---

## ANEXO · Tipos de activo y segmentation_type (añadido 2026-05-28)

### Principio: un solo motor, tres conjuntos de porcentajes

El motor de valoración es **uno solo y universal**. NO hay "tres modos" del P&L codificados en la lógica. La metodología de underwriting es idéntica para hoteles tradicionales, apartamentos turísticos y hostels: misma estructura USALI, misma cadena Asset → Market → P&L → Valoración, misma regla facility-aware.

**Lo que cambia entre tipos son los porcentajes USALI mismos**, y CoStar ya los entrega segmentados por tipo de activo. El campo `segmentation_type` de CoStar identifica cada activo como una de tres categorías:

- **Hotel** (tradicional, con mix diversificado de ingresos)
- **Apartamento turístico** (ingreso dominado por habitaciones, F&B/MICE residuales)
- **Hostel** (modelo propio: dormitorios compartidos típicos, F&B básica, menos servicios, márgenes GOP/EBITDA típicamente superiores por menor estructura de personal)

CoStar entrega los % USALI **diferenciados** para cada tipo en cada submercado/clase. Por ejemplo, el % de F&B sobre ingresos totales de un apartamento turístico en Madrid Centro será muy inferior al de un hotel tradicional del mismo submercado/clase, porque CoStar ya refleja esa realidad de mercado en sus datos. El motor solo tiene que leer el `segmentation_type` del activo y aplicar los % correspondientes de CoStar.

### Implicación 1 · arquitectura mundial intacta

Esta lógica refuerza el principio mundial del modelo: ningún tipo de activo necesita lógica especial en código. La diferenciación viene de los datos de CoStar, no de reglas hardcodeadas. Un mercado nuevo se activa cargando los datos de CoStar de sus tres tipos de activo, sin tocar el motor.

### Implicación 2 · la regla facility-aware aplica IGUAL a los tres tipos

La regla de ajuste por facilities reales (commit 2026-05-26) opera del mismo modo sobre los tres `segmentation_type`. Si un apartamento turístico no tiene restaurante, la línea F&B se ajusta o desaparece exactamente igual que en un hotel. La regla actúa sobre los % USALI que CoStar entrega para ESE tipo de activo, no sobre los de "hotel" como base universal.

Consecuencia natural y deseable: si un apartamento turístico genuinamente carece de restaurante, MICE, spa, etc. (lo habitual del modelo de negocio), su P&L resultante reflejará un mix dominado por habitaciones, con márgenes GOP/EBITDA típicamente superiores. No porque el motor "sepa" que es un apartahotel, sino porque los % de CoStar para apartamentos en ese submercado ya describen ese mix, y la regla facility-aware solo retira lo que en ese activo concreto tampoco existe.

### Implicación 3 · el "fallback" de restaurants_count vacío

El re-sweep del 2026-05-28 deja muchos hoteles con `restaurants_count = NULL`, mayoritariamente apartamentos turísticos. NO hay que inventar un valor de fallback (default a 1, asumir por clase, etc.). El sistema se comporta correctamente:

1. CoStar entrega un % de F&B bajo o nulo para apartamentos turísticos del submercado.
2. La regla facility-aware lee `restaurants_count = NULL` o `amenities.restaurant = false` y retira la línea F&B.
3. El P&L resultante refleja la realidad: ingreso casi monolínea de habitaciones.

Esto resuelve sin invento la decisión que quedó abierta sobre "qué hacer cuando el conteo de restaurantes está vacío". La respuesta es: nada — el motor ya hace lo correcto leyendo el `segmentation_type` y aplicando la regla facility-aware sobre los % de CoStar de ese tipo.

### Implementación para Paso 4

El motor del P&L debe:
1. Leer `segmentation_type` del `canonical_id`.
2. Cargar los % USALI de CoStar **para ese submercado, clase Y segmentation_type**.
3. Aplicar la regla facility-aware sobre esos % (no sobre los % "de hotel" como base).
4. Aplicar el factor 2/3/4% (urban/mixed/resort) por restaurante adicional sobre el F&B base que CoStar entregue **para ese tipo de activo**.

Si en algún submercado CoStar no ha entregado todavía los % segmentados por tipo (cobertura parcial), aplicar el guard: "datos no disponibles para este tipo de activo en este submercado", NUNCA fabricar usando los % de hotel como fallback. Coherente con el principio de honestidad de la sección 1.

---

## ANEXO · Alcance actual de cobertura CoStar (añadido 2026-05-28)

### Situación real de datos a fecha 2026-05-28

El producto NO tiene todavía suscripción completa a CoStar. Lo que hay cargado hoy en el sistema es **un ejemplo descargado**:

- Cobertura geográfica: **España → Madrid → submercados de Madrid**.
- Cobertura de clase: **un solo segmento, Upper-Upscale**, con su compset de referencia.
- Cobertura USALI: los porcentajes de la **plantilla "Madrid Centro Upper-Upscale"** (los que aparecen en la sección 3.1).

Esto significa que, a fecha de hoy, **los 226 hoteles del corpus se valoran usando los mismos % USALI base** —los de Upper-Upscale Madrid Centro—, independientemente de su submercado real o de su clase real. Un hotel midscale de un submercado periférico de Madrid se calcula hoy con los porcentajes de un upper-upscale del centro. Es una limitación de **datos cargados**, NO de la arquitectura del motor.

### Por qué la arquitectura es correcta aunque los datos sean parciales

El motor del P&L está diseñado para **leer dinámicamente** los % USALI por submercado/clase/`segmentation_type` de la base de datos. Hoy todos los lookups devuelven la misma plantilla porque solo hay una cargada. Cuando entren los datos completos de CoStar:

1. El sistema cargará los % USALI segmentados por submercado, clase y `segmentation_type` (ver anexo anterior).
2. El motor leerá automáticamente los % correctos para cada activo según su ubicación, clase y tipo.
3. La regla facility-aware seguirá operando idénticamente — solo cambia la base de % sobre la que actúa.

**Ningún cambio de código será necesario** cuando llegue CoStar completo. Solo cambian los datos cargados. Esta es la base del argumento de escalabilidad mundial del producto.

### Mitigación parcial vía regla facility-aware

La regla facility-aware (commit 2026-05-26) mitiga PARCIALMENTE la limitación de datos cargados:

- Un hotel midscale boutique sin spa, sin meeting rooms y con 1 restaurante NO recibe esas líneas en su P&L porque facility-aware las pone a 0. El peso se concentra en rooms.
- Esto acerca el P&L resultante a la realidad económica del activo, aunque la plantilla base de partida sea la de Upper-Upscale.

Sin embargo, los % que SOBREVIVEN al filtrado de facility-aware siguen siendo los de Upper-Upscale Madrid Centro, no los del segmento real del activo. Por tanto la valoración resultante es una **aproximación funcional pero provisional**.

### Bandera visible "plantilla provisional · cobertura CoStar pendiente"

Decisión operador (Miguel, 2026-05-28): mantener el cálculo del P&L con la plantilla disponible, pero mostrar al usuario una **bandera visible** en el informe (en Financials, donde se sirve el P&L) que advierta:

> "Plantilla USALI provisional · cobertura CoStar pendiente. Los porcentajes base aplicados corresponden a Madrid Centro Upper-Upscale. La valoración se recalibrará automáticamente cuando se carguen los datos segmentados de CoStar para el submercado y la clase de este activo."

La bandera debe ser visible pero no alarmante. El usuario debe poder ver el P&L y la valoración, entendiendo que es una aproximación con la plantilla actualmente cargada. Esta transparencia es coherente con el principio de honestidad de la sección 1.

Cuando un activo pertenezca al subgrupo exacto que sí tiene plantilla cargada (Madrid Centro Upper-Upscale en su submercado real), la bandera NO se muestra — esos activos sí están valorados con sus % reales de CoStar.

### Plan de cobertura futura

Cuando se contrate la suscripción completa de CoStar y se integre la API:

1. **Actualizar el inventario de hoteles por mercado** (la lista canónica de cada país/mercado/submercado).
2. **Cargar los datos completos de país/mercado/submercado/clase** para cada submercado del mundo (% USALI por segmentación).
3. **Activar la integración STR** para construir compsets reales por activo.
4. **Retirar la bandera** "plantilla provisional" automáticamente para todos los activos cuyo submercado/clase/`segmentation_type` esté ya cubierto.

Hasta entonces, la bandera es el mecanismo de honestidad visible que mantiene el producto utilizable sin engañar al usuario sobre el alcance real de los datos.

---

## ANEXO · Ajuste por tamaño del activo (añadido 2026-05-28 · pendiente de cableado)

### Observación profesional

Un hotel de 11 habitaciones y uno de 490 habitaciones no comparten el mismo perfil de rentabilidad, aunque pertenezcan a la misma clase y submercado. Los hoteles pequeños tienen:

- Menor peso de F&B (frecuentemente sin restaurante de carta, sin banquetes).
- Menor peso de MICE (sin salas dedicadas, sin departamento de eventos).
- Menor estructura de personal administrativo y de ventas/marketing (un boutique de 30 habitaciones no sostiene un departamento de A&G del 7,2% del ingreso, ni un equipo de ventas del 6,5%).

Aplicar la misma plantilla USALI a ambos extremos del corpus distorsiona la valoración de ambos. Esta observación es un principio profesional bien establecido en el sector hotelero institucional.

### Tramos firmados (criterio operador, 2026-05-28)

El criterio de tramos por tamaño ya está definido en el producto en `/user/admin/financials`:

- **Tramo 1**: 0–75 habitaciones (boutique / pequeño)
- **Tramo 2**: 76–200 habitaciones (mediano)
- **Tramo 3**: 201+ habitaciones (grande)

Estos tramos NO son inventados aquí — son la propiedad intelectual del operador ya codificada en el panel admin.

### Estado actual y plan de cableado

**Estado a fecha 2026-05-28**: los tramos existen como configuración en admin, pero el motor del P&L NO los lee todavía. Aplica la plantilla USALI única para todos los tamaños dentro de un mismo (submercado × clase). Esto es un wiring pendiente, NO una regla por inventar.

**Plan**: tras cerrar el Paso 4 (regla facility-aware) y la carga manual de los 6 submercados de Madrid en `COSTAR_MASTER_FINANCIALS.xlsx`, se abre un Paso 5 dedicado a:

1. Calibrar los porcentajes diferenciales por tramo, partiendo de los datos CoStar segmentados cuando estén disponibles. Si CoStar no entrega segmentación por tamaño explícita, usar el criterio profesional del operador como fuente.
2. Cablear el motor del P&L para que lea el tramo según `restaurants_count` o equivalente (número real de habitaciones) y aplique los % correspondientes.
3. Verificar el efecto en valoraciones comparando hoteles del mismo (submercado × clase) pero de tramos distintos.

Coherente con el principio de honestidad: ningún número se inventa. Los tramos están firmados por el operador, los porcentajes diferenciales se calibran con evidencia (CoStar o juicio profesional documentado), y el motor lee dinámicamente.

Hasta el cableado, el motor sigue operando con la plantilla única por (submercado × clase), reflejando la limitación en la bandera "plantilla provisional" ya existente.
