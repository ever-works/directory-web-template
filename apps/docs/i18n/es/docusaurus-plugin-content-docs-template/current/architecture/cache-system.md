---
id: cache-system
title: "Sistema de caché"
sidebar_label: "Sistema de caché"
sidebar_position: 40
---

# Sistema de caché

## Descripción general

El sistema de caché proporciona configuración e invalidación de caché centralizada para la aplicación Next.js. Define duraciones TTL (tiempo de vida) consistentes y claves de caché basadas en etiquetas utilizadas con Next.js `unstable_cache`, y ofrece utilidades seguras de invalidación de caché que manejan casos extremos como restricciones de fase de renderizado en Next.js 16.

## Arquitectura

El sistema de caché se divide en dos módulos que funcionan juntos:

- **`lib/cache-config.ts`**: define todas las constantes TTL de caché y los generadores de etiquetas de caché. Esta es la única fuente de verdad sobre cuánto tiempo los datos permanecen almacenados en caché y qué etiquetas se utilizan para la invalidación específica.
- **`lib/cache-invalidation.ts`**: proporciona funciones asíncronas que llaman a `revalidateTag()` para invalidar cachés específicos o todos los relacionados con el contenido. Envuelve cada llamada en una lógica de seguridad para manejar correctamente los errores de la fase de renderizado de Next.js.

Ambos módulos son consumidos por la capa de contenido (`lib/content.ts`) y los procesos de sincronización en segundo plano para mantener actualizados los datos almacenados en caché después de las actualizaciones del repositorio.

## Referencia de API

### Exportaciones desde `lib/cache-config.ts`

#### `CACHE_TTL`

```typescript
export const CACHE_TTL: {
  CONTENT: 600;  // 10 minutes
  ITEM: 600;     // 10 minutes
  CONFIG: 600;   // 10 minutes
  PAGES: 600;    // 10 minutes
};
```

Objeto constante que define la duración de la caché en segundos para cada categoría de datos.

#### `CACHE_TAGS`

```typescript
export const CACHE_TAGS: {
  CONTENT: 'content';
  ITEMS: 'items';
  ITEM: (slug: string) => string;       // `item:${slug}`
  CATEGORIES: 'categories';
  TAGS: 'tags';
  COLLECTIONS: 'collections';
  CONFIG: 'config';
  PAGES: 'pages';
  PAGE: (slug: string) => string;       // `page:${slug}`
  ITEMS_LOCALE: (locale: string) => string;       // `items:${locale}`
  CATEGORIES_LOCALE: (locale: string) => string;  // `categories:${locale}`
  TAGS_LOCALE: (locale: string) => string;        // `tags:${locale}`
  COLLECTIONS_LOCALE: (locale: string) => string; // `collections:${locale}`
};
```

Definiciones de etiquetas de caché para usar con `revalidateTag()`. Las etiquetas estáticas son cadenas simples; Las etiquetas dinámicas son funciones de fábrica que aceptan un parámetro local o slug.

### Exportaciones desde `lib/cache-invalidation.ts`

#### `invalidateContentCaches(): Promise<void>`

Invalida todos los cachés relacionados con el contenido (contenido, elementos, categorías, etiquetas, colecciones, páginas) y borra el caché en memoria `fetchItems`. Se debe llamar después de una sincronización exitosa del repositorio.

#### `invalidateItemCache(slug: string): Promise<void>`

Invalida el caché de un único elemento identificado por su slug.

#### `invalidatePageCache(slug: string): Promise<void>`

Invalida el caché de una única página estática identificada por su slug.

## Detalles de implementación

**Seguridad en la fase de renderizado**: Next.js genera un error cuando se llama a `revalidateTag()` durante la fase de renderizado de React. El contenedor interno `safeRevalidateTag()` detecta este error específico usando `isRenderPhaseError()`, que verifica múltiples patrones de cadena (`during render`, `render phase`, `revalidate` + `render`, `unsupported` + `render`) para que sean resistentes. contra los cambios de mensajes de error de Next.js entre versiones.

**Compatibilidad con Next.js 16**: la llamada `revalidateTag()` incluye un segundo argumento `'max'` para la semántica obsoleta mientras se revalida, como lo requiere Next.js 16.

**Borrado de caché en memoria**: después de la invalidación basada en etiquetas, `invalidateContentCaches()` también llama a `clearFetchItemsCache()` para vaciar cualquier dato en memoria que omita el caché basado en archivos Next.js.

## Configuración

No se requiere configuración adicional. Los valores TTL son constantes codificadas. Para cambiar las duraciones de la caché, modifique los valores en `CACHE_TTL`.

|constante|Duración|Caso de uso|
|----------|----------|----------|
|`CONTENT`|600s (10 minutos)|Caché de contenido general|
|`ITEM`|600s (10 minutos)|Páginas de artículos individuales|
|`CONFIG`|600s (10 minutos)|Configuración del sitio|
|`PAGES`|600s (10 minutos)|Páginas estáticas|

## Ejemplos de uso

```typescript
import { CACHE_TTL, CACHE_TAGS } from '@/lib/cache-config';
import { unstable_cache } from 'next/cache';

// Cache a data-fetching function with tags and TTL
const getCachedItems = unstable_cache(
  async () => {
    return await fetchItemsFromSource();
  },
  ['items-list'],
  {
    tags: [CACHE_TAGS.CONTENT, CACHE_TAGS.ITEMS],
    revalidate: CACHE_TTL.CONTENT,
  }
);

// Cache a single item with a dynamic tag
const getCachedItem = unstable_cache(
  async (slug: string) => {
    return await fetchItemBySlug(slug);
  },
  ['item-detail'],
  {
    tags: [CACHE_TAGS.ITEM('my-item-slug')],
    revalidate: CACHE_TTL.ITEM,
  }
);

// Invalidate all caches after a sync
import { invalidateContentCaches } from '@/lib/cache-invalidation';

async function onSyncComplete() {
  await invalidateContentCaches();
}

// Invalidate a single item after editing
import { invalidateItemCache } from '@/lib/cache-invalidation';

async function onItemUpdated(slug: string) {
  await invalidateItemCache(slug);
}
```

## Mejores prácticas

- Utilice siempre constantes `CACHE_TAGS` en lugar de cadenas de etiquetas codificadas para evitar errores tipográficos y garantizar la coherencia.
- Llame a `invalidateContentCaches()` después de cada sincronización exitosa del repositorio para mantener los datos actualizados.
- Utilice etiquetas específicas de la configuración regional (`ITEMS_LOCALE`, `CATEGORIES_LOCALE`) al almacenar en caché datos filtrados por la configuración regional para habilitar la invalidación específica.
- No llame a `revalidateTag()` directamente; utilice los contenedores seguros de `cache-invalidation.ts` para evitar fallos en la fase de renderizado.
- Mantenga los valores TTL alineados entre los tipos de datos relacionados para evitar referencias cruzadas obsoletas.

## Módulos relacionados

- [Biblioteca de contenido](/template/architecture/content-library) -- Consumidor principal de etiquetas de caché y valores TTL
- [Sistema de administrador de configuración] (./config-manager-system): utiliza `CACHE_TAGS.CONFIG` para el almacenamiento en caché de la configuración del sitio.
