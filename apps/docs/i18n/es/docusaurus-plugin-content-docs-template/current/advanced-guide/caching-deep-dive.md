---
id: caching-deep-dive
title: Análisis profundo de la arquitectura de almacenamiento en caché
sidebar_label: Arquitectura de almacenamiento en caché
sidebar_position: 1
---

# Análisis profundo de la arquitectura de almacenamiento en caché

Esta guía cubre la arquitectura de almacenamiento en caché de múltiples capas utilizada en toda la plantilla, desde cachés de sesión en memoria hasta Next.js ISR y estrategias de almacenamiento en caché a nivel de CDN.

## Descripción general de la arquitectura

```
Request Flow with Caching Layers
=================================

  Client Request
       |
       v
  +------------------+
  |  CDN / Edge      |  <-- Static assets, ISR pages
  +------------------+
       |
       v
  +------------------+
  |  Next.js Cache   |  <-- unstable_cache, revalidateTag
  +------------------+
       |
       v
  +------------------+
  |  In-Memory Cache |  <-- SessionCache, ServerClient cache
  +------------------+
       |
       v
  +------------------+
  |  Data Source      |  <-- Database, filesystem, APIs
  +------------------+
```

## Capa 1: Caché de contenido (Next.js `unstable_cache` )

La plantilla utiliza la configuración de caché centralizada definida en `lib/cache-config.ts` para administrar TTL y etiquetas de caché para todos los datos de contenido.

### Configuración de caché TTL

```typescript
// lib/cache-config.ts
export const CACHE_TTL = {
  CONTENT: 600,  // 10 minutes
  ITEM: 600,     // 10 minutes
  CONFIG: 600,   // 10 minutes
  PAGES: 600,    // 10 minutes
} as const;
```

### Etiquetas de caché para invalidación dirigida

Las etiquetas de caché permiten una invalidación detallada sin vaciar todo el caché:

```typescript
// lib/cache-config.ts
export const CACHE_TAGS = {
  CONTENT: 'content',
  ITEMS: 'items',
  ITEM: (slug: string) => `item:${slug}`,
  CATEGORIES: 'categories',
  TAGS: 'tags',
  COLLECTIONS: 'collections',
  CONFIG: 'config',
  PAGES: 'pages',
  PAGE: (slug: string) => `page:${slug}`,
  ITEMS_LOCALE: (locale: string) => `items:${locale}`,
  CATEGORIES_LOCALE: (locale: string) => `categories:${locale}`,
} as const;
```

### Uso de `unstable_cache` en funciones de contenido

Las funciones de carga de contenido en `lib/content.ts` ajustan el sistema de archivos y leen con `unstable_cache` :

```typescript
import { unstable_cache } from 'next/cache';
import { CACHE_TAGS, CACHE_TTL } from './cache-config';

const getCachedItems = unstable_cache(
  async (locale: string) => {
    // Expensive filesystem read
    return await loadItemsFromDisk(locale);
  },
  ['items'],
  {
    tags: [CACHE_TAGS.ITEMS, CACHE_TAGS.CONTENT],
    revalidate: CACHE_TTL.CONTENT,
  }
);
```

## Capa 2: Caché de sesión (en memoria)

La clase `SessionCache` en `lib/auth/session-cache.ts` elimina la sobrecarga de autenticación redundante al almacenar en caché las sesiones decodificadas en la memoria.

### Cómo funciona

```
Session Lookup Flow
====================

  API Request
       |
       v
  Extract session token (cookie / header)
       |
       v
  SHA-256 hash token -> cache key
       |
       v
  +-- Cache HIT? --+
  |  YES           |  NO
  |  Return cached |  Call NextAuth auth()
  |  session       |  Cache result
  +----------------+  Return session
```

### Decisiones clave de diseño

| Decisión | Valor | Justificación |
|----------|-------|-----------|
| TTL | 10 minutos | Equilibrio entre frescura y reducción de gastos generales |
| Tamaño máximo | 1.000 entradas | Evite pérdidas de memoria en servidores de larga ejecución |
| Hashing de claves | SHA-256 | Evite la fuga de tokens en volcados de memoria |
| Limpieza | 10% probabilístico | Amortizar el costo de limpieza entre solicitudes |
| Desalojo | LRU (el más antiguo primero) | Eliminar las entradas creadas menos recientemente |

### Invalidación de caché

```typescript
import { invalidateSessionCache, clearSessionCache } from '@/lib/auth/cached-session';

// Invalidate single user (logout, profile update)
await invalidateSessionCache(sessionToken, userId);

// Clear all sessions (deployment, security event)
clearSessionCache();
```

## Capa 3: Caché del cliente API del servidor

El `ServerClient` en `lib/api/server-api-client.ts` incluye un caché LRU incorporado para solicitudes GET:

```typescript
// In-memory LRU cache with 100-entry limit and 5-minute TTL
const CACHE_SIZE = 100;
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
```

Comportamiento de caché:
- **Solo se almacenan en caché las solicitudes GET** (las mutaciones omiten el caché)
- **Las solicitudes con AbortSignal** nunca se almacenan en caché
- **Desalojo de LRU** elimina la entrada más antigua cuando el caché alcanza los 100 elementos
- **Caducidad basada en TTL** invalida las entradas después de 5 minutos

```typescript
// Disable caching when fresh data is critical
serverClient.setCacheEnabled(false);

// Clear cache after mutations
serverClient.clearCache();
```

## Estrategia de invalidación de caché

El módulo `lib/cache-invalidation.ts` proporciona una invalidación segura que maneja las restricciones de la fase de renderizado de Next.js:

```typescript
import { invalidateContentCaches, invalidateItemCache } from '@/lib/cache-invalidation';

// After repository sync
await invalidateContentCaches();

// After single item update
await invalidateItemCache('my-item-slug');
```

El contenedor `safeRevalidateTag` detecta errores en la fase de renderizado y registra advertencias en lugar de fallar:

```typescript
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag, 'max');
  } catch (error) {
    if (error instanceof Error && isRenderPhaseError(error)) {
      console.warn(`Skipping cache invalidation during render phase (tag: ${tag})`);
    } else {
      throw error;
    }
  }
}
```

## ISR (regeneración estática incremental)

Las páginas usan ISR a través de la exportación `revalidate` o TTL por función:

```typescript
// app/[locale]/page.tsx
export const revalidate = 600; // 10 minutes

// Or per-fetch revalidation
const data = await fetch(url, { next: { revalidate: 600 } });
```

## Consideraciones de rendimiento

1. **Tasa de aciertos de la caché de sesión**: Monitoree usando `getSessionCacheStats()` . Una tasa saludable está por encima del 80%.
2. **Caché de contenido**: el TTL de 10 minutos significa que las actualizaciones de contenido tardan hasta 10 minutos en aparecer. Forzar la invalidación después de la sincronización para obtener actualizaciones inmediatas.
3. **Uso de memoria**: el caché de la sesión tiene un límite de 1000 entradas (aproximadamente 1-2 MB). El caché del cliente del servidor tiene un límite de 100 entradas.
4. **Arranques en frío**: la primera solicitud después de la implementación siempre omite todos los cachés en memoria.

### Supervisión del rendimiento de la caché

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

// In a health check endpoint
const stats = getSessionCacheStats();
console.log(`Hit rate: ${stats.hitRate}%, Size: ${stats.size}`);
```

## Referencia de configuración

| Capa de caché | TTL | Tamaño máximo | Desalojo | Invalidación |
|-------------|-----|----------|----------|--------------|
| Contenido (inestable_cache) | 600 | Ilimitado | Basado en etiquetas | `revalidateTag()` |
| Sesión (en memoria) | 10 minutos | 1.000 | LRU + TTL | `invalidateSessionCache()` |
| Cliente API del servidor | 5 minutos | 100 | LRU + TTL | `clearCache()` |
| páginas ISR | 600 | Basado en disco | Basado en el tiempo | `revalidatePath()` |

## Solución de problemas

### Datos obsoletos después de la actualización de contenido

1. Verifique que se llame a `invalidateContentCaches()` después de que se complete la sincronización del repositorio.
2. Verifique que las etiquetas de caché coincidan entre la función almacenada en caché y la llamada de invalidación.
3. Para una invalidación inmediata, llame al `clearFetchItemsCache()` para borrar el caché de contenido en memoria.

### La caché de sesión falla en cada solicitud

1. Verifique que el token de sesión esté presente en las cookies o los encabezados.
2. Verifique que `extractSessionToken` pueda analizar su formato de cookies.
3. Asegúrese de que los nombres de las cookies simbólicas coincidan: `next-auth.session-token` o `__Secure-next-auth.session-token` .

### Crece el uso de memoria

1. La caché de la sesión se autolimita a 1000 entradas con limpieza probabilística.
2. Forzar la limpieza: `sessionCache.clear()` .
3. Monitoree con `getSessionCacheStats().size` .

## Documentación relacionada

- [Profundización en la gestión de sesiones] (./session-management-deep-dive.md)
- [Arquitectura de cliente API] (./api-client-architecture.md)
- [Optimización de base de datos](./database-optimization.md)
