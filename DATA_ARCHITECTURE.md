# DATA_ARCHITECTURE.md — HotelVALORA

> Documento maestro de la arquitectura de datos del producto. Define **cómo entran los datos al sistema**, **dónde se almacenan**, **cómo se consolidan entre fuentes**, y **cómo se mantiene la trazabilidad**. Complementa a `VALUATION_METHODOLOGY.md`, que define la lógica de valoración. Aquí no hay metodología de valoración: aquí hay cañerías y almacenes.

---

## Principio rector

El producto se alimenta de múltiples fuentes: CoStar (datos de mercado), Booking vía RapidAPI (datos de hotel enriquecido), Google Places (ubicación, fotos, reseñas), web scraping puntual (cuando no hay otra opción), y otras integraciones futuras (STR, HotelsAVE, etc.). Cada fuente entrega información en su propio formato y sobre su propia parte del hotel o del mercado.

El producto necesita consolidar todo eso en una **vista unificada por hotel** —un "perfil 360" del activo— que sea la fuente de verdad sobre la que opera el motor de valoración, las páginas del informe, y cualquier herramienta de operador.

Tres reglas que rigen toda la arquitectura de datos:

1. **Trazabilidad de fuente.** Cada dato lleva consigo de dónde viene (`data_source`, `last_updated`, `notes`). Nunca se pierde el origen.
2. **No fabricamos datos.** Si una fuente no entrega un dato, el campo queda vacío con etiqueta clara (`pending`, `not_available`). No se inventa, no se hereda de otro hotel, no se rellena con valores por defecto.
3. **Mundial por diseño.** La arquitectura no codifica geografía. Un mercado nuevo se activa cargando sus datos en la misma estructura, sin cambios de código.

---

## El pipeline de ingesta (descripción funcional)

La carpeta `services/costar/` (y, por analogía, las carpetas futuras de otras integraciones) está diseñada como un **pipeline de ingesta** con tres etapas por cada tipo de archivo:

```
INPUT/  →  proceso de lectura  →  MASTER/ (actualizado)  →  OLD/ (archivado)
```

**Flujo previsto:**

1. Un administrador (operador del producto) coloca el archivo actualizado en la carpeta `INPUT/` correspondiente. Puede ser un Excel de CoStar (`COSTAR_MASTER_*.xlsx`), un PDF de submercado, o cualquier export futuro.
2. El programa **lee el archivo**, identifica su tipo, y **actualiza el archivo maestro** correspondiente en `MASTER/`, añadiendo registros nuevos o refrescando los existentes. Las actualizaciones respetan el principio de trazabilidad: cada cambio queda registrado con fecha y fuente.
3. Cuando termina el procesamiento, el archivo de `INPUT/` se **mueve a `OLD/`** como histórico, con timestamp en el nombre. Así queda traza de qué se procesó, cuándo, y qué versión.

**Carpetas que siguen este patrón:**

- `services/costar/PAIS/` (datos por país)
- `services/costar/MERCADO/` (datos por mercado)
- `services/costar/SUBMERCADO/` (datos por submercado — incluye los PDFs de Madrid)
- `services/costar/HOTELESperMARKET/` (lista canónica de hoteles por mercado)
- `services/costar/MASTER/` (archivos maestros consolidados, salida del pipeline)

---

## Estado actual del pipeline (a fecha 2026-05-28)

**Funcionamiento parcial.** El pipeline tiene partes que funcionan y partes que no están construidas. Conviene documentar la realidad para no confundir "carpeta creada" con "lógica implementada".

### Lo que sí funciona

Los archivos maestros básicos (`COSTAR_MASTER_PAIS`, `COSTAR_MASTER_MERCADOS`, `COSTAR_MASTER_SUBMERCADOS`, `COSTAR_MASTER_CLASS`) se han generado en algún momento desde sus inputs correspondientes y están operativos. El motor del P&L y otras partes del sistema los leen para componer las combinaciones del Excel `COSTAR_MASTER_FINANCIALS` (generado en Paso 4, 2026-05-28).

### Lo que NO funciona todavía

Tres deudas concretas identificadas por el operador en sesión 2026-05-28:

**Deuda 1 · Procesamiento de PDFs no implementado.** Los 6 PDFs de submercados de Madrid colocados en `services/costar/SUBMERCADO/INPUT/` (Madrid Centre, Salamanca, Retiro, Arguelles-Chamberí, Chamartín, Madrid Surroundings) NO se procesan. El pipeline solo lee Excel hoy. Los datos USALI segmentados por submercado que contienen esos PDFs (tabla "Rentabilidad de hoteles con servicio completo (anual)") siguen sin extraerse, y el motor del P&L sigue trabajando con porcentajes hardcodeados o con la plantilla universal Madrid Upper-Upscale.

**Deuda 2 · COSTAR_MASTER_HOTELESperMARKET incompleto.** El archivo maestro actual (185 KB, fecha 20/05/2026) NO contiene todas las columnas del export crudo de CoStar (`1.1 CostarExport - INMUEBLES LISTA HOTELES MADRID.xlsx`). Le faltan campos relevantes como número de habitaciones, clase explícita, y posiblemente más. El operador asume que el pipeline copiaba todo, pero solo copió un subset. Origen del problema: la lógica de mapeo de columnas está incompleta o nunca se ejecutó sobre la versión completa del export.

**Deuda 3 · Ningún sistema de movimiento INPUT → OLD automatizado.** Los archivos llegan a `INPUT/` y se quedan ahí. El operador tiene que moverlos a `OLD/` manualmente, si lo recuerda. No hay garantía de que el archivo procesado quede claramente diferenciado del pendiente.

**Causa raíz común:** la lógica del pipeline está parcialmente implementada. Las carpetas con la nomenclatura `INPUT/MASTER/OLD` existen como **diseño intencionado** del operador, pero el código que las orquesta end-to-end nunca se cerró del todo. Esto es deuda técnica histórica, no introducida por trabajo reciente.

---

## El "perfil 360 del hotel" (objetivo arquitectónico)

### Concepto

Cada hotel del producto debe tener una **ficha unificada** que consolide TODO lo que el sistema sabe de él, independientemente de la fuente original. Esto es la base sobre la que opera el motor de valoración, las páginas del informe, y cualquier herramienta de operador. Sin esta consolidación, los datos viven dispersos en tablas distintas y la trazabilidad se pierde.

### Estructura propuesta

Por cada hotel del corpus, la ficha tiene **bloques diferenciados por fuente**, con todas las columnas literales de cada fuente preservadas (no resumidas) y la trazabilidad explícita:

**Bloque 1 · CoStar (datos de mercado y clasificación).** Todas las columnas del export `INMUEBLES LISTA HOTELES`, sin perder ninguna: identificación oficial, dirección, año de apertura/renovación, número de habitaciones, clase (`chain_scale`), submercado, mercado, país, marca/cadena si aplica, datos de inventario adicionales.

**Bloque 2 · Booking vía RapidAPI (datos de hotel enriquecido).** Lo que ya se está recolectando hoy: amenities (boolean por servicio), `restaurants_count`, `meeting_rooms_count`, fotos, descripción, score y review_score, room_types si disponibles, etc.

**Bloque 3 · Google Places (ubicación y reputación).** Coordenadas, dirección normalizada, place_id, rating, número de reseñas, fotos adicionales, `priceLevel` (señal indirecta de clase).

**Bloque 4 · Otras fuentes (cuando aplique).** Web scraping puntual, integraciones futuras (STR, HotelsAVE, plataformas de gestión, etc.). Cada una con su propio bloque etiquetado.

**Columnas transversales de trazabilidad por cada bloque:**
- `data_source` (cuál fuente concreta)
- `last_updated` (cuándo se actualizó por última vez)
- `confidence` o `notes` (cuán fiable es, o aclaración manual del operador)

### Forma material del perfil unificado

Sobre la pregunta abierta de "Excel maestro vs vista en la app", el operador clarificó en sesión 2026-05-28 que la prioridad es el **Excel maestro** (`COSTAR_MASTER_HOTELESperMARKET` ampliado) como salida del pipeline, donde un administrador puede ver, exportar y verificar la ficha completa de cada hotel. La vista en la app es objetivo secundario, alcanzable después.

Por tanto el archivo objetivo es:

```
services/costar/MASTER/COSTAR_MASTER_HOTELESperMARKET.xlsx
```

ampliado para contener, por cada hotel, los cuatro bloques con todas sus columnas. Generado por el pipeline a partir de los inputs de cada fuente. Re-ejecutable sin perder datos manuales.

---

## Pendientes formales en el pipeline (resumen ejecutivo)

Los siguientes ítems se trabajarán como **Paso 6 del proyecto** en sesión dedicada, después de cerrar el Paso 4 (regla facility-aware) y Paso 5 (ajuste por tamaño del activo):

1. **Diagnóstico completo del `COSTAR_MASTER_HOTELESperMARKET` actual.** Comparar columnas del export crudo de CoStar con las del maestro actual. Identificar qué columnas se perdieron y por qué. Ampliar el script de mapeo para preservar todas.
2. **Lectura de PDFs CoStar.** Implementar parser para los PDFs de submercados (al menos las tablas USALI). Alternativa: si la API de CoStar entra antes, este parser se descarta y se sustituye por integración API directa.
3. **Consolidación multi-fuente por hotel.** Construir el archivo unificado con los 4 bloques (CoStar + Booking + Google + otros) por cada hotel.
4. **Automatización INPUT → MASTER → OLD.** Cerrar el ciclo del pipeline para que los archivos procesados se muevan automáticamente y queden archivados con timestamp.
5. **Política de actualización.** Definir cómo se manejan los conflictos cuando una fuente actualiza un dato que ya existía: ¿sobrescribe?, ¿conserva el más reciente?, ¿pide confirmación del operador?

---

## DECISIÓN DE ARQUITECTURA · Fuente única de verdad para los % USALI (firmada 2026-05-28)

### El problema detectado

Los porcentajes USALI (los que determinan el P&L y por tanto la valoración de cada hotel) viven hoy en TRES sitios desconectados entre sí:

1. **Panel admin** `/user/admin/financials` ("P&L Forecast COSTAR") → lee de `apps/web/src/lib/admin/financials/defaults.ts` (constantes hardcodeadas) y guarda los cambios en **localStorage del navegador** vía `use-overrides.ts`.
2. **Excel maestro** `services/costar/MASTER/COSTAR_MASTER_FINANCIALS.xlsx` → generado por script, contiene ahora los datos reales de CoStar con jerarquía de 3 niveles.
3. **Motor del P&L** → hoy usa los % de `getDefaultAssumptions()` (hardcoded), no lee de ninguno de los dos anteriores de forma dinámica completa.

Los tres coinciden en los números solo por casualidad (todos parten de la misma plantilla nacional hardcodeada). No se sincronizan. Cambiar uno no actualiza los otros.

### Problema crítico de persistencia

El panel admin guarda en **localStorage**, que es almacenamiento local del navegador del operador. Implicaciones graves para un producto institucional:

- Los cambios solo existen en el navegador donde se hicieron. Otro dispositivo o usuario no los ve.
- Se borran si se limpia la caché del navegador. No hay copia de seguridad.
- Los datos maestros que determinan el valor de cada hotel (el corazón del negocio) NO deben vivir en localStorage.

### Decisión firmada (operador Miguel, 2026-05-28): Opción C · La base de datos es la fuente única de verdad

```
                 ┌─────────────────────────────┐
                 │   SUPABASE (fuente de verdad) │
                 │   tabla: costar_financials    │
                 │   (% USALI por país/mercado/  │
                 │    submercado/clase/seg_type) │
                 └──────┬───────────┬────────────┘
                        │           │
        ┌───────────────┘           └──────────────┐
        │ LEE/ESCRIBE                    LEE        │
        ▼                                           ▼
  ┌──────────────┐                        ┌──────────────────┐
  │ Panel admin   │                        │ Motor del P&L     │
  │ /admin/       │                        │ (lookupUsali...)  │
  │ financials    │                        │ lee % por activo  │
  │ (ver+editar)  │                        └──────────────────┘
  └──────────────┘
        ▲
        │ CARGA MASIVA (import)
  ┌──────────────────────────────┐
  │ Excel COSTAR_MASTER_FINANCIALS │
  │ (herramienta de carga del      │
  │  operador · NO es la verdad)   │
  └──────────────────────────────┘
```

Roles de cada pieza tras la decisión:

- **Supabase (tabla `costar_financials` o similar)**: la ÚNICA fuente de verdad. Todo lee de aquí. Robusta, persistente, multiusuario, con copia de seguridad.
- **Excel maestro**: deja de ser "la verdad". Pasa a ser la **herramienta de carga masiva** del operador. El operador rellena datos de CoStar en Excel (cómodo para volúmenes grandes) y un importador los vuelca a Supabase. Después el Excel se archiva en `OLD/`.
- **Panel admin**: deja de leer de `defaults.ts` y de guardar en localStorage. Pasa a **leer y escribir en Supabase**. Sirve para ver y ajustar puntualmente los % de un submercado/clase concreto.
- **Motor del P&L**: lee los % desde Supabase por (country, market, submarket, class, segmentation_type), con fallback jerárquico (submercado → nacional → pending/derived).

### Por qué esta arquitectura

- Es la de un producto institucional real: una fuente, robusta, persistente.
- El Excel sigue sirviendo al operador para lo que es bueno (carga masiva de datos de CoStar), sin ser el punto frágil del sistema.
- El panel deja de depender de localStorage (problema de persistencia resuelto).
- Coherente con el principio mundial: un mercado nuevo se activa cargando sus datos en Supabase, sin tocar código.

### Trabajo de implementación (Paso 6 · sesión dedicada, NO improvisar)

1. Crear tabla en Supabase para los % USALI (esquema: 5 columnas ID + 21 columnas de %, + data_source + last_updated + notes).
2. Construir importador Excel → Supabase (lee `COSTAR_MASTER_FINANCIALS.xlsx`, valida, vuelca a la tabla, preserva trazabilidad).
3. Reconectar el panel admin: leer de Supabase en vez de `defaults.ts`; guardar en Supabase en vez de localStorage.
4. Conectar el motor del P&L (`lookupUsaliPercentages`) a leer de Supabase con fallback jerárquico.
5. Verificación: cambiar un % en el panel → se refleja en el P&L de un hotel de ese submercado → y queda persistido tras recargar (ya no localStorage).

Bloqueante: esto es prerrequisito para que el panel admin "P&L Forecast COSTAR" tenga valor real. Hasta entonces, el panel es solo un borrador local.

---

## Coherencia con `VALUATION_METHODOLOGY.md`

Este documento describe **cómo se montan los datos** del producto. El documento de metodología describe **cómo se usan esos datos para valorar**. Son complementarios:

- Si el motor de valoración pide un dato (ej. `restaurants_count` de un hotel concreto), este documento explica cómo ese dato llegó al sistema (lo extrajo el enriquecimiento de Booking vía RapidAPI, se almacenó en `hotel_canonical`, se consolida en el perfil unificado).
- Si la metodología define que el porcentaje USALI varía por submercado y clase, este documento explica cómo esos porcentajes entran al sistema (vía CoStar export → pipeline de ingesta → `COSTAR_MASTER_FINANCIALS`).

Ningún documento se contradice con el otro. Si aparece una contradicción, se discute con el operador y se firma la decisión.

---

## Deep-dives técnicos (referencias)

Este documento es el **mapa general** del flujo de datos del producto. Los detalles técnicos por capa viven en documentos específicos bajo `/docs/`:

- **`docs/architecture.md`** — arquitectura runtime del sistema (FastAPI · Next.js · Celery · runtime infra · ports · request flow). Capa de **servicios**, no de datos.
- **`docs/data-pipeline.md`** — el módulo Python legacy `services/data_pipeline/` (FastAPI ETL con `HotelETL` / `TransactionETL` / `MarketSnapshotETL` + staging tables `import_jobs` / `import_staging_rows`). Implementación concreta de **un subconjunto** del pipeline general descrito aquí.
- **`docs/intelligence/costar-master-dataset-architecture.md`** — deep-dive técnico de los 4 .xlsx workbooks CoStar (Dataset A market performance · Dataset B hotel inventory) con 5-sheet layout, ingestion-meta block de 14 columnas, append-only + `supersedes_id`, dedup_keys sha256, y plan Phase 5 Postgres migration.

Estos tres documentos son **subordinados técnicos**. Si chocan con lo dicho aquí, manda este documento (estratégico) y los técnicos se actualizan. Si lo dicho aquí necesita aterrizar en código, se consulta el técnico correspondiente.

---

## Historial de decisiones del documento

- **2026-05-28** · Documento creado. Recoge las tres deudas técnicas del pipeline detectadas por el operador (PDFs no procesados, HOTELESperMARKET incompleto, INPUT→OLD manual) y formaliza la visión del "perfil 360 del hotel" como objetivo arquitectónico. Trabajo concreto se programa para Paso 6.
