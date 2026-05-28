# BOOKING_EXPANSION_SPEC.md — HotelVALORA

> Especificación de funcionalidad FUTURA (no implementar todavía). Anotada 2026-05-26.
> Prerrequisito: el enriquecimiento de los hoteles CoStar debe estar completo (facilities, location score, ADR, servicios) — esta funcionalidad usa esos hoteles enriquecidos como pool de comparables.
> Prioridad: después del enriquecimiento actual y de la regla P&L facilities-aware.

---

## Problema que resuelve

CoStar cubre una gran parte del mercado hotelero mundial, pero NO todos los hoteles. Hoy el universo seleccionable está limitado a los hoteles presentes en CoStar (224 en el bootstrap de Madrid). Dos limitaciones derivadas:

1. **Inventario limitado**: el usuario no puede analizar un hotel que no esté en CoStar, aunque exista en el mercado.
2. **Compset incompleto**: la metodología requiere un MÍNIMO de 4 competidores CON datos de CoStar para generar el informe de compset. Si el usuario selecciona competidores que son hoteles solo-Booking (sin datos CoStar), no se alcanza el mínimo y el informe no se puede generar.

---

## Solución · dos mitades

### Mitad 1 · Ampliar el universo de hoteles seleccionables

Aprovechar RapidAPI/Booking (ilimitado, sin coste por llamada) para traer hoteles adicionales de Booking en los mismos submercados que ya cubre CoStar. Estos hoteles "solo-Booking" aparecen como opciones seleccionables para el hotel objeto de análisis.

- Datos disponibles para estos hoteles (de Booking): nombre, habitaciones, categoría, facilities, fotos, location, review score, ADR de Booking.
- Datos NO disponibles (no están en CoStar): KPIs de mercado CoStar (ADR/RevPAR/ocupación de mercado), % USALI por submercado/clase a nivel de ese hotel.
- Principio mantenido: los datos que no existan se muestran VACÍOS ("—") o estimados con etiqueta clara, NUNCA inventados.

### Mitad 2 · Sustitución de competidores para alcanzar el mínimo de compset

El compset requiere ≥4 competidores con datos CoStar. Si el usuario selecciona como competidor un hotel solo-Booking (sin datos CoStar), ese competidor NO puede aportar los datos que el compset necesita.

**Solución: sustituir** el competidor solo-Booking por un hotel real de CoStar equivalente, para completar el cuadro mínimo de 4 con datos válidos.

Criterios de selección del sustituto (en orden):
1. Misma o superior puntuación de ubicación (location score).
2. Mismos servicios / facilities.
3. Cercanía geográfica.
4. Desempate, si hay varios candidatos válidos: el de **mayor ADR en Booking**.

> Nota de diseño (cautela pendiente de revisar al construir): evaluar si el desempate por "mayor ADR" introduce sesgo al alza sistemático en el compset. Alternativa a considerar: mediana o cercanía en ADR. Decisión del operador Miguel: mayor ADR, porque la sustitución elige un HOTEL real (no un número prestado), no una cifra. Mantener bajo observación.

---

## Transparencia · NO negociable

Toda estimación o sustitución debe ser visible para el usuario. Esto es coherente con el principio anti-contaminación del proyecto (un dato de otra fuente NUNCA se presenta como dato propio sin etiqueta).

- **Dato estimado por comparable**: asterisco discreto (*) junto al dato. Al pulsar/hover, desplegable con la explicación: "Estimado por comparable" + qué hotel/criterio se usó.
- **Competidor sustituido en el compset**: marca sutil sobre la foto del competidor (asterisco blanco) que indique que es un sustituto estimado por comparable, no el hotel originalmente seleccionado por el usuario.

El objetivo: el usuario siempre puede distinguir qué es dato real del hotel, qué es dato de nivel superior (submercado/clase), y qué es estimación/sustitución por comparable.

---

## Valor de negocio

Esta funcionalidad, bien hecha y transparente, es un diferenciador: "cobertura más allá de CoStar mediante estimación transparente por comparables". Convierte el producto de "visor de datos CoStar" en "motor de análisis con cobertura ampliada". El valor depende al 100% de la transparencia: mal hecha (datos prestados sin avisar) es un riesgo reputacional grave; bien hecha (estimación etiquetada) es una ventaja competitiva.

---

## Dependencias y orden

1. PRERREQUISITO: enriquecimiento CoStar completo (facilities, location score, servicios) — los hoteles CoStar son el pool de comparables.
2. PRERREQUISITO: regla P&L facilities-aware operativa.
3. ENTONCES: Mitad 1 (importar hoteles Booking por submercado) → Mitad 2 (motor de sustitución de competidores) → sistema de etiquetado de transparencia.
