---
id: engagement-endpoints
title: "Endpoints API de Engagement"
sidebar_label: "Engagement"
sidebar_position: 12
---

# Endpoints API de Engagement

La API de Engagement proporciona puntos finales para recuperar métricas de engagement (vistas, votos, calificaciones, favoritos, comentarios) y calcular puntuaciones de popularidad para elementos. Estos puntos finales impulsan las funciones de ordenamiento, clasificación y análisis de la plantilla.

**Archivos fuente:**
- `template/app/api/items/engagement/route.ts`
- `template/app/api/items/popularity-scores/route.ts`

## Resumen de Puntos Finales

| Método | Ruta | Autenticación | Descripción |
|--------|------|---------------|-------------|
| GET | `/api/items/engagement` | Ninguna | Obtener métricas de engagement para múltiples elementos |
| GET | `/api/items/popularity-scores` | Ninguna | Obtener elementos ordenados por puntuación de popularidad calculada |

Ambos puntos finales usan `dynamic = 'force-dynamic'` para garantizar datos frescos en cada solicitud.

---

## GET `/api/items/engagement`

Obtiene métricas de engagement para múltiples elementos identificados por sus slugs. Devuelve un mapa de slug a métricas.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Predeterminado | Descripción |
|-----------|------|-----------|----------------|-------------|
| `slugs` | string | **Sí** | -- | Lista separada por comas de slugs de elementos |

### Restricciones

- El parámetro `slugs` es **requerido**. Omitirlo devuelve un error 400.
- Máximo de **200 slugs** por solicitud. Superar este límite devuelve un error 400.

### Cómo Funciona

```ts
const slugsParam = searchParams.get('slugs');
const slugs = slugsParam
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (slugs.length > 200) {
  return NextResponse.json(
    { error: 'Too many slugs. Maximum 200 allowed per request.' },
    { status: 400 }
  );
}

const metricsMap = await getEngagementMetricsPerItem(slugs);
```

### Forma de la Respuesta

#### 200 -- Métricas Recuperadas

```json
{
  "metrics": {
    "awesome-tool": {
      "views": 1250,
      "votes": 45,
      "avgRating": 4.2,
      "favorites": 89,
      "comments": 12
    },
    "another-item": {
      "views": 320,
      "votes": 8,
      "avgRating": 3.7,
      "favorites": 15,
      "comments": 3
    }
  }
}
```

#### 200 -- Vacío (sin slugs tras el análisis)

```json
{
  "metrics": {}
}
```

#### 400 -- Slugs Faltantes

```json
{
  "error": "Missing required parameter: slugs"
}
```

#### 400 -- Demasiados Slugs

```json
{
  "error": "Too many slugs. Maximum 200 allowed per request."
}
```

#### 500 -- Error del Servidor

```json
{
  "error": "Failed to fetch engagement metrics"
}
```

### Ejemplo de Uso

```ts
const slugs = ['tool-a', 'tool-b', 'tool-c'].join(',');
const res = await fetch(`/api/items/engagement?slugs=${slugs}`);
const { metrics } = await res.json();

// Acceder a las métricas de un elemento individual
const toolAViews = metrics['tool-a']?.views ?? 0;
```

---

## GET `/api/items/popularity-scores`

Un punto final de depuración/análisis que devuelve elementos ordenados por su puntuación de popularidad calculada. El algoritmo de puntuación usa escala logarítmica y considera múltiples señales de engagement más la recencia.

### Parámetros de Consulta

| Parámetro | Tipo | Requerido | Predeterminado | Descripción |
|-----------|------|-----------|----------------|-------------|
| `limit` | entero | No | `20` | Número de elementos a devolver (máx. 100) |
| `locale` | string | No | `"en"` | Idioma para obtener datos de elementos |

### Algoritmo de Puntuación

La puntuación de popularidad se calcula como la suma de componentes ponderados:

| Componente | Peso | Fórmula |
|-----------|------|---------|
| Impulso destacado | +10,000 | Bonificación plana para elementos destacados |
| Vistas | 1,000x | `log10(views + 1) * 1000` |
| Votos | 1,200x | `log10(max(votes, 0) + 1) * 1200` |
| Calificación Promedio | 500x | `avgRating * 500` |
| Favoritos | 1,100x | `log10(favorites + 1) * 1100` |
| Comentarios | 1,000x | `log10(comments + 1) * 1000` |
| Recencia (menos de 30 días) | hasta +1,000 | Decaimiento lineal durante 30 días |
| Recencia (30-90 días) | hasta +500 | Decaimiento lineal durante los siguientes 60 días |
| Recencia (90-180 días) | hasta +250 | Decaimiento lineal durante los siguientes 90 días |

Los elementos sin datos de engagement reciben una puntuación de respaldo heurística basada en el conteo de etiquetas, longitud del nombre, presencia de ícono y existencia de código promocional.

### Forma de la Respuesta

#### 200 -- Puntuaciones Recuperadas

```json
{
  "totalItems": 150,
  "showing": 20,
  "items": [
    {
      "rank": 1,
      "name": "Top Rated Tool",
      "slug": "top-rated-tool",
      "featured": true,
      "score": 15230,
      "scoreBreakdown": {
        "featured": 10000,
        "views": 3100,
        "votes": 1200,
        "rating": 430,
        "favorites": 200,
        "comments": 150,
        "recency": 150
      },
      "engagement": {
        "views": 1250,
        "votes": 45,
        "avgRating": 4.2,
        "favorites": 89,
        "comments": 12
      },
      "ageInDays": 15
    }
  ]
}
```

### Ejemplo de Uso

```ts
// Obtener los 10 elementos más populares
const res = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await res.json();

items.forEach(item => {
  console.log(`#${item.rank} ${item.name} - Puntuación: ${item.score}`);
});
```

### Notas

- El algoritmo de puntuación coincide con la lógica de ordenamiento de producción en `sort-utils.ts`.
- La escala logarítmica evita que los elementos con recuentos de vistas extremadamente altos dominen el ranking.
- La bonificación de recencia garantiza que los elementos recién agregados reciban un impulso de visibilidad temporal.
- Los elementos se ordenan por puntuación en forma descendente; los empates se desempatan alfabéticamente por nombre.

### Archivos Fuente Relacionados

| Archivo | Propósito |
|---------|-----------|
| `template/app/api/items/engagement/route.ts` | Punto final de métricas de engagement |
| `template/app/api/items/popularity-scores/route.ts` | Punto final de puntuación de popularidad |
| `template/lib/db/queries/engagement.queries.ts` | Consultas de base de datos para datos de engagement |
| `template/lib/content.ts` | `getCachedItems` para datos de elementos |
