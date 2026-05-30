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

---

## ANEXO · Modelo HotelVALORA de EBITDA — exclusiones frente a CoStar (firmado 2026-05-28)

### Decisión

El cálculo del EBITDA en HotelVALORA **excluye dos líneas** que CoStar sí incluye en su tabla de rentabilidad USALI. Esta es una decisión metodológica deliberada del operador, no un error de extracción. El EBITDA resultante es por tanto un **EBITDA pre-alquiler**.

### Línea excluida 1 · Sistemas de información y telecomunicaciones (IT)

CoStar reporta "Sistemas de información y telecomunicaciones" como línea de gasto no distribuido (≈1,3% nacional / 1,9% Madrid Centre). HotelVALORA **NO la cuenta por separado** porque considera que ese gasto está ya incluido dentro de "Ventas y Marketing". Contarlo aparte sería **doble conteo**.

Implicación: el motor del P&L ignora la línea IT al encadenar gastos hacia el GOP y el EBITDA. El dato de CoStar se puede almacenar (para trazabilidad) pero no se resta.

### Línea excluida 2 · Precios de alquiler / rent

CoStar reporta "Precios de alquiler" (≈7,8% nacional / 0,4% Madrid Centre). HotelVALORA **NO la usa para calcular el EBITDA** porque el alquiler es un **coste discrecional** que depende de la estructura inmobiliaria de cada activo (propiedad vs arrendamiento), no un baremo aplicable de forma uniforme a todos los hoteles.

Esto es coherente con la práctica institucional de valorar el **negocio operativo** con independencia de cómo esté financiado o estructurado el inmueble. Un mismo hotel en propiedad o en alquiler tiene el mismo EBITDA operativo HotelVALORA; lo que cambia es la estructura de capital, que se trata por separado en el underwriting.

### Consecuencia: EBITDA HotelVALORA > EBITDA CoStar

Al excluir IT y alquiler, el EBITDA HotelVALORA es **superior** al EBITDA que reporta CoStar para el mismo activo. Ejemplo con el dato nacional España:

- EBITDA CoStar (con IT y alquiler): 23,2%
- EBITDA HotelVALORA (sin IT ni alquiler, pre-alquiler): ≈31,2%

Esta diferencia es **esperada y defendible**, pero debe poder explicarse a un inversor: "nuestro EBITDA es pre-alquiler y excluye IT como partida independiente; valoramos el negocio operativo y tratamos la estructura inmobiliaria por separado". Esto debe quedar claro en la presentación del informe para no inducir a comparaciones incorrectas con benchmarks que sí incluyen esas líneas.

### Fórmula EBITDA HotelVALORA

```
EBITDA = GOP − management_fees − property_taxes − insurance
         (SIN restar IT/telecom · SIN restar rent)
```

Donde el GOP se calcula restando de los ingresos totales: gastos departamentales (rooms, F&B, otros) + gastos no distribuidos (admin, ventas&marketing, operaciones&mantenimiento, utilities), **sin** la línea IT.

---

## ANEXO · Perfiles derivados para apartahotel y hostel — regla MVP (firmado 2026-05-28)

### Problema

CoStar, en los informes PDF de submercado disponibles hoy, entrega la tabla de rentabilidad USALI **solo para hoteles de servicio completo**. No hay tabla separada para apartamentos turísticos ni para hostels. Dejar estos tipos de activo en "pending" (sin valoración) no sirve para el MVP: hay hoteles de estos tipos en el corpus que deben poder valorarse para la demo a inversores.

### Principio: derivación honesta, no invención

Donde no hay dato CoStar para un tipo de activo, se aplica una **regla derivada** que parte del dato real de hotel y aplica ajustes **fundamentados en la lógica de negocio conocida del sector**. La clave de honestidad: estos perfiles se etiquetan como `data_source = "derived_mvp_rule"`, NO como dato real de CoStar. Son una aproximación operativa explícita, sustituible por dato real cuando entre la API de CoStar segmentada por tipo.

### Perfil APARTAHOTEL (derivado, modelo HotelVALORA)

Lógica de negocio: ingreso dominado por habitaciones, F&B casi nula (solo desayunos), sin MICE, sin spa, parking pequeño, mínima estructura de personal (frecuentemente sin recepción 24h), management fee alto (gestión externalizada de canales/check-in/limpieza).

| Línea | % | Nota |
|---|---|---|
| Habitaciones (ingreso) | 92,0% | dominante |
| F&B comida | 4,0% | solo desayunos |
| F&B bebida | 1,0% | mínima |
| Meeting/eventos | 0,0% | no aplica |
| Spa | 0,0% | no aplica |
| Parking/otros | 3,0% | |
| **Suma ingresos** | **100%** | cuadra |
| GOP | 61,3% | alto por poca estructura |
| Management fee | 20,0% | gestión externalizada |
| EBITDA (pre-alquiler) | 40,2% | alto pero defendible |
| Staff (memo) | 18,0% | sin recepción 24h |

El EBITDA de ~40% es alto pero coherente: un edificio de apartamentos turísticos sin personal de recepción y con el modelo HotelVALORA (sin IT ni alquiler) genuinamente alcanza ese margen. El management fee del 20% es lo que recoge el coste de la gestión profesional externalizada.

### Perfil HOSTEL (derivado, modelo HotelVALORA)

Lógica de negocio: habitaciones con peso alto (mix de camas compartidas y privadas), F&B mínima (bar social), ingreso ancillary alto (tours, lockers, lavandería, eventos sociales), sin MICE formal, sin spa, management fee moderado.

| Línea | % | Nota |
|---|---|---|
| Habitaciones (ingreso) | 82,0% | alto |
| F&B comida | 3,0% | mínima |
| F&B bebida | 5,0% | bar social |
| Meeting/eventos | 0,0% | no aplica |
| Spa | 0,0% | no aplica |
| Parking/ancillary | 10,0% | tours/lockers/lavandería |
| **Suma ingresos** | **100%** | cuadra |
| GOP | 49,9% | |
| Management fee | 12,0% | |
| EBITDA (pre-alquiler) | 36,8% | sano para hostel bien gestionado |
| Staff (memo) | 22,0% | recepción + limpieza intensiva |

### Etiquetado y comportamiento

- `data_source = "derived_mvp_rule"` distingue estos perfiles de los datos reales de CoStar.
- Decisión de bandera (a confirmar al ver en producción): probablemente bandera suave tipo "Estimación por tipo de activo según modelo HotelVALORA · datos CoStar segmentados pendientes", coherente con la jerarquía de honestidad (submarket_aggregate → national → derived → pending).
- Estos % son punto de partida MVP. Cuando CoStar entregue datos reales de apartahotel/hostel por submercado, se sustituyen y la etiqueta pasa a `costar_*`.

### Cuadre matemático obligatorio

Cualquier ajuste futuro de estos perfiles debe mantener: ingresos suman 100%, gastos encadenan correctamente a GOP, y EBITDA = GOP − mgmt − taxes − insurance (modelo HotelVALORA sin IT ni rent). Un P&L que no cuadre es inaceptable en una demo a inversores.

---

## ANEXO · Valoración: EBITDA after replacement, rampa FF&E, segmentation_type y año de salida por plan (firmado 2026-05-29)

Tres decisiones que cierran cómo el motor convierte el P&L en valor. Refinan las secciones 3.2 y 3.3 y el anexo EBITDA HotelVALORA. Provienen de la auditoría del motor financiero (`docs/underwriting/AUDIT_MOTOR_FINANCIERO.md`, hallazgos X3/X4/X5) y su plan de cableado (`docs/underwriting/PLAN_X4_F3_WIRING.md`).

### Decisión 1 · La valoración se hace sobre EBITDA AFTER REPLACEMENT (post-FF&E), con rampa

- El cap rate se aplica al **NOI después de restar la reserva FF&E**, no al EBITDA pre-reserva. Hay por tanto **dos cifras** de EBITDA:
  - **EBITDA (pre-replacement)** = `GOP − management_fees − property_taxes − insurance` (la del anexo EBITDA HotelVALORA · cifra de cabecera para el lector).
  - **EBITDA after replacement** = `EBITDA − reserva FF&E` (**la que se capitaliza al cap rate**).
- La reserva FF&E **depende del CAPEX, no del tipo de activo**:
  - **Default = 4% estable (sin rampa)** para activos **operativos sin CAPEX**.
  - **Rampa `2% → 3% → 4%` (estabiliza en 4%, techo en el año 3) SOLO cuando hay CAPEX**: tras invertir, el activo está nuevo → la reserva arranca baja y sube.
  - **Definición de la señal `hasCapex`** (separada del catch-all `renovated`): `hasCapex = true` cuando el activo es **obra nueva** (`year_opened` ≤ **10** años) **o tiene CAPEX reciente** (`year_renovated_last` ≤ **10** años), **o** está **seteado por el operador** (Premium · override del cálculo automático). Se considera **renovación/CAPEX reciente ≤ 10 años (antes 5)** — Mike, 2026-05-30 · parámetro de fuente única `CAPEX_RECENCY_YEARS`. En cualquier otro caso (sin dato, o renovación/apertura > 10 años) `hasCapex = false` → **4% plano**. (El eje de renovación del cap es **reward-only**: sin reno probada = neutro, no penaliza — ver anexo Decisión 4.) `deriveHasCapex` (D1 · rampa FF&E) mide a **hoy**; la frescura del cap de salida (D4 · `deriveExitState`) se mide al **año de venta** — señales separadas a propósito.
- La reserva FF&E es un **supuesto del operador** (`provenance = operator_assumption`), **NUNCA un dato de CoStar**. Cualquier valor de FF&E almacenado como `costar_*` es incorrecto por construcción (CoStar no publica reserva FF&E).
- Para los activos CON CAPEX, el punto de la rampa que entra en el NOI de valoración **depende del año de salida** (Decisión 3): salida en año 7 → 4% estabilizado; salida temprana → un punto menor de la curva.

### Decisión 2 · `segmentation_type` tiene CUATRO valores

`hotel` · `apartmenthotel` · `hostel` · `hotelproject`. La cadena Asset → Market → P&L → Valoración y la regla facility-aware son idénticas para los cuatro; lo que cambia son los % USALI (de CoStar) por tipo. (La rampa FF&E **no** depende del tipo sino del CAPEX — ver Decisión 1; `hotelproject` típicamente lleva CAPEX y por tanto rampa, pero la decisión se toma por la señal de CAPEX, no por el tipo.) El mapeo a la enum de CoStar es silencioso: `apartmenthotel → apartahotel`, `hotelproject → hotel`.

### Decisión 3 · El NOI de valoración depende del AÑO DE SALIDA, que depende del PLAN

El año de salida es un **parámetro del motor**, gateado por plan de suscripción:

| Plan | Año de salida | NOI de valoración |
|---|---|---|
| **FREE** | sin año de salida | **valor de mercado actual** = NOI sobre el compset **TTM (últimos 12 meses)** = año 1. Modo por defecto. |
| **PRO** | configurable de **TTM(12m) a 10 años**, default **año 7** (regla base HotelVALORA) · puede VER todo | NOI del año de salida elegido (EBITDA after replacement de ese año) |
| **PREMIUM** | igual que PRO + puede **MODIFICAR** supuestos | NOI del año de salida elegido |

Regla de honestidad (X5): el valor por NOI/cap **solo se calcula** cuando hay % de CoStar resueltos para el activo **y** cap rate no nulo. Si falta cualquiera de los dos, el motor no fabrica valor por NOI (no hereda, no inventa) — coherente con el guard de país y la sección 1.

Proyección Y6–Y10 (para salidas posteriores al año 5): **ocupación plana del año 5 + ADR a la última delta del escenario** (crecimiento terminal). Solo aplica a PRO/Premium con año de salida > 5; FREE usa TTM (año 1).

### Decisión 4 · El cap rate de SALIDA es dinámico (no un spread fijo)

El cap de **entrada** y el de **salida** salen ambos del **motor de cap rate dinámico** según el **estado del activo**, no de un diferencial fijo:

- Activo con CAPEX / renovado → **entrada ≈ salida** (sale al mercado en buen estado).
- **REWARD-ONLY (Mike · 2026-05-30):** el eje de renovación es **solo-premio**. Sin prueba de renovación reciente = **NEUTRO** (0 · no se castiga la falta de dato). CON prueba (fecha ≤10y) = **DESCUENTO** (renovado −0,10 · obra nueva −0,20). Se **elimina** la penalización +0,50 por `needs_work`: un activo sin reno probada **no sube el cap**, es el neutro. Los priors por segmento representan ese neutro ("hotel sin reno probada"); el renovado reciente baja desde ahí. → Resuelve la asimetría entrada/salida: un hotel sin reno probada (p.ej. NH) sale **neutro en entrada Y salida** (mismo cap, sin +0,50).
- **Entrada vs salida · MISMA regla, distinto año de medición:** entrada mide la frescura **a hoy** (`deriveEntryState`); salida **al año de venta** (`deriveExitState`). Un activo renovado ≤10y a hoy cobra el descuento en la entrada; si a la venta (hoy+hold) ya supera 10 años, el descuento decae a neutro (envejeció).
- Se **elimina** cualquier spread fijo de salida (+20 bps): el diferencial entrada↔salida lo determina el estado del activo a través del motor, no una constante.

**Frescura medida AL AÑO DE SALIDA, no a hoy** (Mike · 2026-05-30 · `deriveExitState`): el estado de salida evalúa si la renovación tendrá **≤10 años EN EL AÑO DE VENTA proyectado** = `(hoy + hold) − año_reno`. La ventana de 10 años está **alineada con el hold típico (7)**: un renovado reciente mantiene su **descuento** a la salida si la reforma no ha caducado (≤10y); si a la venta supera 10 años, el descuento decae a neutro. **Reposición / value-add** (comprar para renovar) es un **flag explícito de tipo de operación**, DESACOPLADO de la condición: cuando está activo, la reforma se hace en año 0 → a la salida cuenta como renovated (descuento) si hold ≤10. Un activo viejo **mantenido as-is** (condición `needs_work`, sin reposición) se queda **neutro** en ambos extremos (no se penaliza). Señales separadas: D1 (rampa FF&E · `deriveHasCapex`) mide a **hoy**; D4 (frescura del cap · `deriveExitState`) al **año de venta**; reposición = flag de deal (dormido · backlog).

### FUTURO (IP · NO implementar ahora) · Encaje de habitaciones por superficie

Para la selección de edificio (sobre todo `hotelproject`): derivar el nº de habitaciones por categoría a partir de la superficie. Ratios brutos de referencia (m²/hab brutos · % zonas comunes · neto resultante):

| Categoría | m²/hab brutos | Zonas comunes | Neto aprox. |
|---|---|---|---|
| 3★ | 30 | ~30% | ~21 |
| 4★ full service | 45 | ~40% | ~27 |
| 5★ | ≥55 | ~40% | ~33 |

Planta baja = lobby / zonas comunes; habitaciones en plantas superiores; cálculo sobre **superficie bruta sobre rasante** y **tamaño de planta**. Esto da sentido futuro al `segmentation_type = 'hotelproject'` (partir de un edificio y derivar el programa de habitaciones). Pendiente de implementación; aquí queda solo como propiedad intelectual del método.

---

## ANEXO · Cascada de cobertura USALI (3 niveles, agnóstica al mercado · firmado 2026-05-30)

Define QUÉ USALI aplica el motor a un activo según la cobertura disponible. Agnóstica: resuelve por la jerarquía **País → Mercado → Submercado** leyendo de los datos, sin nombrar ningún mercado en el código. Surge de la auditoría DATA-INTEGRITY-SUBMARKETS (la capa de datos de mercado estaba completa para los 8 submercados de Madrid; la capa USALI solo tenía fila propia para algunos).

### Las dos capas (no confundir)

- **Datos de mercado** (ADR / ocupación / RevPAR por submercado): snapshot CoStar (`market_snapshots`). Numerador real del P&L.
- **% USALI** (estructura ingresos/gastos): `pnl_template`. Forma del P&L. Puede existir a nivel submercado o solo nacional.

### La cascada (etiqueta visible en cada nivel)

1. **Nivel 1 · USALI de submercado propio.** El submercado tiene su tabla USALI real → se usa. Etiqueta **"dato de submercado"**. (Ej. Madrid Centre.)
2. **Nivel 2 · USALI nacional aplicado.** No hay USALI de submercado propio PERO hay datos de mercado del submercado **y** el país tiene USALI nacional → se aplica el **USALI nacional sobre el ADR/ocupación/RevPAR REALES del submercado**. Etiqueta **"USALI nacional aplicado"** (aproximado, NO "pendiente"). (Ej. Barajas/Hortaleza.)
3. **Nivel 3 · no_data.** Solo si el país tampoco tiene USALI nacional. Etiqueta **"cobertura pendiente"**.

Los % nacionales son **invariantes por submercado y por clase** (son la estructura del país), así que el Nivel 2 funciona también para activos con clase desconocida. La clase solo es requisito del Nivel 1 (submercado, segmentado por clase).

### Agnosticismo y escalado

La regla no nombra España ni Madrid. Si entra Nueva York: si EEUU tiene USALI nacional pero Manhattan aún no tiene USALI de submercado, Manhattan cae automáticamente en Nivel 2 (USALI nacional US sobre el ADR/occ real de Manhattan), sin tocar código. Las filas `costar_national` por submercado que pudieran existir son **opcionales**: el Nivel 2 deriva el mismo template nacional cuando faltan.

### Consecuencia para el guard de honestidad

Refina la sección 1 y el guard de país: "sin fila de submercado en `pnl_template`" ya **no** equivale a no_data. Solo es no_data la ausencia de USALI nacional del país (Nivel 3). Mientras haya datos de mercado + USALI nacional, el informe se sirve como aproximación nacional **etiquetada**, nunca como pendiente.

---

## ANEXO · Cap rate dinámico · reconciliación panel ↔ motor (X4b · TRAMO 3 · 2026-05-30)

El motor de cap rate dinámico (`lib/underwriting/cap-rate-engine`) **consume su política del panel admin** (`user/admin/financials` · Dynamic Cap Rate). Antes el panel mostraba pesos que el motor **no** usaba (estaban hardcodeados y diferían). Ahora el panel es VERDAD: lo que muestra = lo que el motor aplica. El motor es la referencia; el panel se corrigió hacia él (no al revés), preservando el cap de producción (Madrid Centre 4★ +200 renovado = **6,45%**, sin regresión).

### Base del cap rate = prior institucional por segmento (ver TRAMO 3b)

La base **NO** es una mediana de cap rates comparables (las transacciones reales CoStar **no traen cap rate**). Es un **prior institucional por segmento calibrado con €/llave real** — detallado en el anexo TRAMO 3b. El fijo `base_market_yield_pct` queda como **último recurso etiquetado**. La columna **Categoría se pone a 0** (el segmento ya está en la base · evita doble conteo).

### Ejes de ajuste (todos leídos del panel · firma del motor)

| Eje | Valores (defaults = paridad con el motor) | Convención |
|---|---|---|
| Categoría | **0** (residual · el segmento está en la base · TRAMO 3b) | evita doble conteo |
| Tamaño | ≥200 hab −0,10 · 100-199 0 · <100 +0,20 | escala / pool de compradores |
| Estado (renovación · REWARD-ONLY) | nuevo −0,20 · renovado −0,10 · sin-reno-probada 0 | **solo premio** · sin prueba = neutro (no castiga falta de dato) |
| Operador | cadena de marca −0,10 · independiente +0,10 | brand equity |
| Liquidez | ≥6 ops/12m −0,05 · 3-5 0 · <3 +0,20 | profundidad de salida |
| Escenario | conservador **+0,30** · base 0 · optimista **−0,20** · estrés +0,60 | overlay de prudencia |
| Macro | (Euribor − media LP) × 20 bps/100 bps | régimen de tipos |

### Signo del escenario CORREGIDO (era un bug)

El escenario **conservador ENSANCHA el cap (+0,30)** → valoración **más baja** (prudencia). El panel anterior lo tenía invertido (conservador −0,25 = estrechaba = inflaba la valoración), lo que habría hecho que el caso "conservador" subiera el valor — lo contrario de prudente. Convención firme: conservador/estrés ensanchan, optimista estrecha.

### Operator + liquidity ahora en el panel

El motor siempre aplicó **operador** y **liquidez**; el panel no los mostraba. Se añaden como ejes visibles y editables; sin ellos, conectar el panel los habría borrado.

### Nota de frontera de tamaño (deuda menor)

El motor resuelve la **banda de tamaño por habitaciones** (≥200 / 100-199 / <100) — esa es su semántica de producción, intacta. Las etiquetas de tramo del panel (−75 / 75-200 / +200) comparten los **valores** pero no las fronteras exactas; unificar la taxonomía de tamaño en toda la plataforma (cap rate + costes de adquisición) queda anotado para fase de escalado, no bloquea.

### Factor HotelVALORA Score · calidad relativa al COMPSET (±15 bps)

Un hotel mejor que sus competidores (ubicación / confort / calidad percibida) merece un cap **más bajo** (menos riesgo percibido → se paga más por su NOI); peor que ellos, cap **más alto**. El ajuste es **relativo al compset del propio hotel**, no a una media global — destacar sobre tus rivales es lo que se premia. Agnóstico: cada mercado trae su compset (escala a 190 mercados sin tocar código).

- **scoreCalidad** = HotelVALORA Score v1 **SIN el componente Class** (Class solapa el factor de categoría del cap rate → doble conteo). Los 6 componentes de huésped/ubicación se re-normalizan como en v1 (Location 0,30 · Comfort 0,20 · Cleanliness 0,15 · Staff 0,10 · Value 0,10 · Facilities 0,05). Sin solape con renovación (el Score no tiene componente de estado/CAPEX).
- **Pivote = media del scoreCalidad del COMPSET** (sus competidores · mismo compset que la valoración), NO del corpus.
- **Rango ASIMÉTRICO y ESCALONADO (postura metodológica consciente · Mike):** premio en pasos de **0,10** → 0 / −0,10 / −0,20 / −0,30pp; castigo en pasos de **0,05** → 0 / +0,05 / +0,10 / +0,15pp. El ajuste aplicado es **siempre uno de esos 7 valores** (incluido 0) — el cap rate nunca muestra cifras irregulares (nada de −0,1873%).
  **Justificación de la asimetría:** la excelencia hotelera es **escasa** y el mercado la premia con primas **mayores** que el descuento que aplica a activos mediocres. A igual distancia del compset, destacar al alza vale más (−0,30) que quedarse corto penaliza (+0,15). Deliberado, no sesgo accidental.
- **Escalonado por σ del compset:** `z = (scoreCalidad_hotel − media_compset) / σ_eff`, con `σ_eff = max(σ_compset, σ_floor)`. El nº de escalones = cuántos **cortes σ** supera `|z|`. **Cortes recomendados (editables): 0,67σ / 1,33σ / 2,0σ** → escalón 1 / 2 / 3. Banda muerta de ±0,67σ (hotel en línea con su compset → 0). Premio y castigo alcanzan su tope a ±2σ. `σ_floor = 0,30` evita sobre-sensibilidad (y divisón por cero) en compsets homogéneos.
- **Mismo score absoluto → ajuste distinto** según contra quién compita. Correcto y deseado.
- **Nunca penaliza por falta de dato:** hotel sin score calculable → 0 ("sin ajuste por Score"); compset con < N peers con score (default **N=4**) → 0 ("compset sin score").
- **No-regresión:** hotel con scoreCalidad = media de su compset → ajuste 0 → mismo cap que hoy.

**Editable por el administrador** (en la policy del Dynamic Cap Rate · mecánica "Saved · fecha" · el motor LEE de la policy): topes de premio y castigo **por separado**, tamaño de paso de cada lado, los **cortes σ** que disparan los escalones, σ_floor y N mínimo de compset. **NO editable aquí:** los pesos de los 6 componentes del Score (viven en `hotelvalora-score.ts`, afectan al Score en toda la app). UI: fila tipo "Base Market Yield" (no rejilla), con SELECTED = escalón aplicado al hotel. El factor entra en `capRate.adjustments` (trazabilidad: "HotelVALORA Score vs compset: −0,10pp").

**Dependencia de datos (pendiente):** los 6 sub-scores de Booking que alimentan el scoreCalidad **no están persistidos en una tabla consultable** (hoy viven en el enriquecimiento; en DB solo está `review_score` global). Hasta que se persistan, el flujo vivo pasa contexto vacío → ajuste **0 etiquetado** (sin penalizar). El núcleo, el motor, el panel y los tests están completos; activar el factor en producción solo requiere la fuente de sub-scores del compset.

## ANEXO · TRAMO 3b · Base del cap rate = prior institucional por segmento (2026-05-30)

**Hallazgo:** las **661 transacciones reales CoStar** (snapshot.json) traen precio, **€/llave**, habitaciones y **segmento** (chain_scale), pero **CERO cap rates**. El motor venía usando un **stub ficticio de 12 comps**. Por tanto la base **no puede** ser "la mediana de cap rates comparables" (no existen). Decisión (Mike · CAMINO 2): **prior institucional por segmento, calibrado con el €/llave real.**

### Cómo se origina la base

- **Prior por segmento** (banda de mercado europeo, ajustada a prime local) en la **policy editable** (`segment_base_priors`). El motor lee el prior del **chain_scale** del activo (6 niveles); si falta chain_scale, cae a un **segmento por estrellas** (etiquetado).
- **Calibración con €/llave real:** el orden de los cap rates es **coherente** con el orden del €/llave de las transacciones (más €/llave → cap más bajo). Cada prior **declara su €/llave y su nº de transacciones** (procedencia · nunca un número sin respaldo).
- **Cascada (paralela a USALI):** el €/llave de respaldo se toma del **submercado** si hay muestra → si no, **mercado/nacional** → si no, **prior sin calibrar etiquetado**. El valor del prior nunca queda sin procedencia declarada.
- **Agnóstico:** priors por país en la policy; un mercado nuevo trae los suyos. No se hardcodea Madrid en el motor.
- **NO es "mediana de cap rates comparables"** — es **"prior institucional por segmento calibrado con €/llave de transacciones reales CoStar"**. Honestidad metodológica explícita.

### REGLA de fijación de priors (sistemática · reproducible · misma para los 6)

**`prior = punto medio de la banda de mercado − 0,25pp = (banda_low + banda_high)/2 − 0,25`.**
"Mitad inferior de la banda" → compresión prime moderada, sin ir al extremo. NO es intuición:
la misma regla aplica a los 6 segmentos sobre su banda de mercado europeo. `provenance: expert_prior`
(regla sobre banda + orden calibrado por €/llave real); se auto-anclará a `calibrated_from_kpi`
con ADR por segmento (ver mecanismo de validación abajo).

### Priors ES seeded (Madrid · 2026-05 · validar/editar en panel)

| Segmento | Banda mercado | medio −0,25 = **prior** | €/llave real (n) |
|---|---|---|---|
| luxury | 4,5–5,5 | **4,75%** | €719.801 (11) |
| upper_upscale | 5,0–6,0 | **5,25%** | €422.705 (11) |
| upscale | 5,5–6,5 | **5,75%** | €388.650 (20) |
| upper_midscale | 6,0–7,0 | **6,25%** | €287.007 (3) |
| midscale | 6,5–7,5 | **6,75%** | €193.764 (3) |
| economy | 7,0–8,0 | **7,25%** | — (2) |

Bandas en escalera limpia (+0,5 por peldaño). Orden coherente: cap↑ a medida que €/llave↓. ✓ La regla es **uniforme en los 6 segmentos, sin excepciones ni overrides** (upscale = 5,75 sale de la regla pura sobre 5,5–6,5).

### Conexión y delta (corrección consciente, no regresión)

El cap-rate-engine **deja de usar el stub de 12 comps para la base** y lee el prior por segmento. Con la regla (mitad de banda −0,25) toda la curva comprime. Caps de salida (base + factores size/operador/macro/liquidez), Madrid Centre:

- **5★ lujo: ~6,25% → 5,00%** (−1,25pp · base luxury 4,75%).
- **5★ upper_upscale: → 5,50%** (base 5,25%).
- **4★ upscale (workhorse): 6,45% → 6,00%** (−0,45pp · base 5,75%).
- **3★ midscale: → 7,10%** (base 6,75%).

El lujo prime aterriza en **5,00%** (banda real 4,5–5,5); el 4★ baja a 6,00%. Es **corrección consciente del método**, no regresión.

**Doble conteo resuelto:** como el segmento está en la base, el factor **Categoría se pone a 0** (no se cuenta "es lujo" dos veces).

**Pendiente (follow-up):** el factor **Liquidez** aún usa el conteo de transacciones del stub; el snapshot real tiene conteos por submercado para reemplazarlo. El €/llave de respaldo está hoy en los priors de la policy (nivel mercado Madrid); cablear la cascada viva submercado→mercado→nacional desde el snapshot es la siguiente pieza de datos.

### Mecanismo de validación de priors · ESPEJO de cap implícito (permanente)

Para anclar los priors en evidencia (no solo en bandas europeas), se valida cada prior contra un **cap implícito**: para cada transacción real con precio+habitaciones, se estima el **NOI after-replacement** con el motor USALI (`estimateNoiAfterReplacement` · `lib/admin/financials/implied-cap-check.ts`) y se calcula `cap implícito = NOI ÷ precio real`. Por segmento se compara la **mediana del implícito** con el prior. Es un **espejo de sensatez**, NO una fuente nueva de base (evita circularidad): el prior sigue siendo lo que usa el motor. **Herramienta reutilizable y permanente** — se re-corre cuando entran más transacciones o nuevos mercados (valida los priors de CUALQUIER mercado).

**Regla de anclaje:** si prior e implícito coinciden (±0,3pp) **con muestra de NOI fiable**, el prior sube a `provenance: "calibrated_from_kpi"` (anclado reforzado). Si divergen o la muestra es pobre, el prior se queda como **`expert_prior`** (banda EU + orden por €/llave), etiquetado.

**Resultado de la primera corrida (Madrid · 2026-05) — priors NO anclados aún:** el ADR disponible es **mezclado por submercado** (no hay ADR por segmento), así que el NOI estimado es ∝ habitaciones y el cap implícito **colapsa a un inverso del €/llave**, sesgado para los extremos (lujo: ADR real ≫ media del submercado → NOI infravalorado → implícito artificialmente bajo, ~2,8%; n pequeño y rangos amplios). Por tanto la muestra con **NOI fiable por segmento es pobre en todos** y **todos los priors se mantienen `expert_prior`**. El anclaje a `calibrated_from_kpi` requiere **ADR por segmento (CoStar por clase)** — esa es la pieza de dato que falta. La herramienta queda lista para anclar automáticamente cuando llegue.

## ANEXO · TRAMO 4 · CAPEX de reforma → inversión inicial del IRR (2026-05-30)

Cierra el bridge config→motor (financiación · fricción · cap rate · **CAPEX**). El IRR ahora puede leer la **matriz CAPEX del admin** (`CAPEX_DEFAULTS` · 12 líneas €/hab por tier×categoría) como **coste de reforma**, en vez de un CAPEX hardcodeado a 0.

- **Trigger = estado del activo (Mike):** `state === "needs_work"` → **reposición** (lee la matriz) · `new` / `renovated` → **estabilizado** → CAPEX **0**. Un solo concepto de estado gobierna **cap rate** (eje de renovación) **y** CAPEX. El estabilizado es el caso por defecto → **no-regresión exacta** (IRR idéntico a hoy).
- **La matriz = total de reforma en €** (NO se descompone en el modelo de obra nueva): Σ líneas, respetando la **unidad de cada línea** — `per_key × habitaciones` · `per_m2 × m²` · `total` tal cual · `percent × asking`. Ese total entra como **`inputs.capex.reposition_capex_total_eur`** → se suma a `total_building_cost` → **CF[0] del IRR** (más inversión de reforma → IRR más bajo, correcto).
- **El modelo de obra nueva del motor** (`structure_pct` etc.) queda **intacto**; solo se añade el camino de reforma en €/hab. Sin doble conteo.
- **Agnóstico / tramos de tamaño:** la matriz usa sus propios tramos de habitaciones (`ROOM_TIERS`: 0-79 / 80-179 / 180+).
- **Ejemplo (4★, +200 hab, `needs_work`, todo per_key):** Σ matriz `large`×`4star` = 72.900 €/hab × 200 = **14,58 M€** de reforma → al CF[0].

**Estado del trigger (pendiente · no bloquea):** el flujo automático deriva `state` ∈ {new, renovated} (nunca `needs_work`), así que hoy la reposición sale **0** para todo hotel auto-valorado (no-regresión exacta). El camino está cableado + testeado; se activa cuando un activo se marca `needs_work` (futuro selector de "tipo de operación" / override de operador). La matriz vive en localStorage del panel; el motor lee los **defaults** (`CAPEX_DEFAULTS`, per_key) hasta que se persista el override server-side (mismo patrón que los otros paneles).
