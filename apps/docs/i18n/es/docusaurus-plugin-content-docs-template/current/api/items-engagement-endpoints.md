---
id: items-engagement-endpoints
title: "Referencia API Engagement de Elementos"
sidebar_label: "Engagement de Elementos"
sidebar_position: 54
---

# Referencia API Engagement de Elementos

## Descripción General

Los puntos finales de Engagement de Elementos proporcionan acceso a métricas de engagement y puntuaciones de popularidad para los elementos del directorio. Estas incluyen conteos de vistas, votos, calificaciones, favoritos y comentarios. El punto final de puntuaciones de popularidad además calcula un ranking ponderado que considera métricas de engagement, estado destacado y recencia del contenido.

## Puntos Finales

### GET /api/items/engagement

Obtiene métricas de engagement para múltiples elementos por sus slugs en una sola solicitud en lote.

**Solicitud**

| Parámetro | Tipo | En | Descripción |
|-----------|------|----|-------------|
| slugs | string | query | Lista separada por comas de slugs de elementos (requerido, máx 200) |

**Respuesta**
```typescript
{
  metrics: Record<string, {
    views: number;
    votes: number;
    avgRating: number;
    favorites: number;
    comments: number;
  }>;
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/items/engagement?slugs=item-one,item-two,item-three');
const { metrics } = await response.json();

// metrics["item-one"] = { views: 1500, votes: 42, avgRating: 4.2, favorites: 18, comments: 7 }
```

### GET /api/items/popularity-scores

Punto final de depuración que devuelve elementos ordenados por puntuación de popularidad calculada con un desglose detallado de los factores de puntuación. Útil para entender cómo el algoritmo de ordenamiento clasifica los elementos.

**Solicitud**

| Parámetro | Tipo | En | Descripción |
|-----------|------|----|-------------|
| limit | number | query | Número de elementos a devolver (por defecto: 20, máx: 100) |
| locale | string | query | Código de idioma para elementos (por defecto: "en") |

**Respuesta**
```typescript
{
  totalItems: number;
  showing: number;
  items: Array<{
    rank: number;
    name: string;
    slug: string;
    featured: boolean;
    score: number;               // Puntuación total calculada (redondeada)
    scoreBreakdown: {
      featured: number;          // 10000 si está destacado, 0 en caso contrario
      views: number;             // log10(views + 1) * 1000
      votes: number;             // log10(votes + 1) * 1200
      rating: number;            // avgRating * 500
      favorites: number;         // log10(favorites + 1) * 1100
      comments: number;          // log10(comments + 1) * 1000
      recency: number;           // Decae durante 180 días
    };
    engagement: {
      views: number;
      votes: number;
      avgRating: number;
      favorites: number;
      comments: number;
    } | null;
    ageInDays: number;
  }>;
}
```

**Ejemplo**
```typescript
const response = await fetch('/api/items/popularity-scores?limit=10&locale=en');
const { items, totalItems } = await response.json();

// items[0] = { rank: 1, name: "Top Item", score: 15234, scoreBreakdown: { ... }, ... }
```

## Autenticación

Ambos puntos finales son **públicos** -- no se requiere autenticación. Están marcados como `force-dynamic` para garantizar datos frescos en cada solicitud.

## Respuestas de Error

| Estado | Descripción |
|--------|-------------|
| 400 | Parámetro `slugs` requerido faltante o más de 200 slugs proporcionados (punto final de engagement) |
| 500 | Error interno del servidor -- fallo en la consulta a la base de datos |

## Limitación de Velocidad

Sin limitación de velocidad explícita. El punto final de engagement limita el tamaño del lote a 200 slugs por solicitud para prevenir abusos. Ambos puntos finales omiten la caché de Next.js mediante `export const dynamic = 'force-dynamic'`.

## Puntos Finales Relacionados

- [Puntos Finales de Configuración de Características](./config-feature-endpoints) -- Verificar si las características de calificaciones/favoritos/comentarios están habilitadas
