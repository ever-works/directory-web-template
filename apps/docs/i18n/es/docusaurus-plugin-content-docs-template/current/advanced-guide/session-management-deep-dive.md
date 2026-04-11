---
id: session-management-deep-dive
title: Análisis profundo de la gestión de sesiones
sidebar_label: Gestión de sesiones
sidebar_position: 4
---

# Análisis profundo de la gestión de sesiones

Esta guía cubre la arquitectura de la sesión, incluida la integración de NextAuth.js, el almacenamiento en caché de la sesión en memoria, la extracción de tokens, la invalidación de la caché y las utilidades de sesión del lado del servidor.

## Descripción general de la arquitectura

```
Session Management Flow
========================

  Browser (Client)                    Server
  +------------------+                +------------------+
  | useSession()     | -- cookie ---> | getCachedSession |
  | (next-auth/react)|                |      |           |
  +------------------+                |      v           |
                                      | SessionCache     |
                                      |   HIT? -------> Return cached
                                      |   MISS -------> NextAuth auth()
                                      |                  |
                                      |                  v
                                      |              Cache result
                                      |              Return session
                                      +------------------+

  Token Extraction Sources:
  1. Cookie: next-auth.session-token
  2. Cookie: __Secure-next-auth.session-token
  3. Header: Authorization: Bearer <token>
  4. Header: X-Session-Token: <token>
```

## Capa de caché de sesión

### Clase de caché de sesión

El `SessionCache` en `lib/auth/session-cache.ts` es un caché único en memoria:

```typescript
// lib/auth/session-cache.ts
class SessionCache {
  private cache = new Map<string, CachedSession>();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_SIZE = 1000;
  private stats = { hits: 0, misses: 0 };

  async get(identifier: string): Promise<Session | null> {
    const key = await this.generateKey(identifier);
    const cached = this.cache.get(key);

    if (!cached || this.isExpired(cached)) {
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return cached.session;
  }

  async set(identifier: string, session: Session): Promise<void> {
    const key = await this.generateKey(identifier);
    this.cache.set(key, {
      session,
      expiresAt: Date.now() + this.TTL_MS,
      createdAt: Date.now(),
    });

    // 10% probabilistic cleanup
    if (Math.random() < 0.1) {
      this.cleanup();
    }
  }
}

export const sessionCache = new SessionCache();
```

### Generación de claves de caché

Las claves se obtienen mediante el hash SHA-256 del token de sesión para evitar que aparezcan datos confidenciales en los volcados de memoria:

```typescript
private async generateKey(identifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}
```

### Construcción del identificador de caché

```typescript
// lib/auth/session-cache.ts
export function createSessionIdentifier(sessionToken?: string, userId?: string): string {
  if (sessionToken) return `token:${sessionToken}`;
  if (userId) return `user:${userId}`;
  throw new Error('Either sessionToken or userId must be provided');
}
```

## Recuperación de sesión en caché

### Componentes del servidor y rutas API

La función `getCachedSession` en `lib/auth/cached-session.ts` es el punto de entrada principal:

```typescript
// lib/auth/cached-session.ts
export async function getCachedSession(request?: Request): Promise<Session | null> {
  try {
    const sessionToken = extractSessionToken(request);

    // Cache lookup
    if (sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      const cachedSession = await sessionCache.get(identifier);
      if (cachedSession) return cachedSession;
    }

    // Cache miss: fetch from NextAuth
    const auth = await getAuth();
    const session = await auth();

    // Store in cache
    if (session && sessionToken) {
      const identifier = createSessionIdentifier(sessionToken);
      await sessionCache.set(identifier, session);
    }

    return session;
  } catch (error) {
    // Fallback to direct NextAuth call
    const auth = await getAuth();
    return await auth();
  }
}
```

### Uso de ruta API

```typescript
// In API route handlers
import { getCachedApiSession } from '@/lib/auth/cached-session';

export async function GET(request: NextRequest) {
  const session = await getCachedApiSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... handle authenticated request
}
```

### Uso de componentes del servidor

```typescript
// In server components
import { useServerSession } from '@/lib/auth/cached-session';

export default async function DashboardPage() {
  const session = await useServerSession();
  if (!session) redirect('/auth/signin');
  // ... render dashboard
}
```

## Extracción de tokens

La función `extractSessionToken` verifica múltiples fuentes:

```typescript
function extractSessionToken(request?: Request): string | null {
  if (!request) return null;

  // 1. NextAuth session cookies
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const sessionToken =
      cookies['next-auth.session-token'] ||
      cookies['__Secure-next-auth.session-token'] ||
      cookies['next-auth.csrf-token'];
    if (sessionToken) return sessionToken;
  }

  // 2. Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 3. Custom session header
  const sessionHeader = request.headers.get('x-session-token');
  if (sessionHeader) return sessionHeader;

  return null;
}
```

## Invalidación de caché

### Invalidación de sesión única

```typescript
import { invalidateSessionCache } from '@/lib/auth/cached-session';

// On logout
await invalidateSessionCache(sessionToken);

// On profile update
await invalidateSessionCache(undefined, userId);

// Both token and user ID
await invalidateSessionCache(sessionToken, userId);
```

### Borrar caché completo

```typescript
import { clearSessionCache } from '@/lib/auth/cached-session';

// After deployment or security event
clearSessionCache();
```

## Estadísticas y monitoreo de caché

```typescript
import { getSessionCacheStats } from '@/lib/auth/cached-session';

const stats = getSessionCacheStats();
// {
//   hits: 450,
//   misses: 50,
//   size: 123,
//   hitRate: 90.00
// }
```

### Registro de desarrollo

En el modo de desarrollo, la caché registra aciertos, errores e invalidaciones automáticamente:

```
[SessionCache] Cache HIT for token: abc12345...
[SessionCache] Cache MISS - fetching from NextAuth
[SessionCache] Cached new session for token: abc12345...
[SessionCache] Stats: { hits: 10, misses: 2, hitRate: "83.33%", size: 5 }
```

## Compatibilidad con el tiempo de ejecución de Edge

El módulo de autenticación utiliza importaciones dinámicas para evitar agrupar controladores de bases de datos en Edge Runtime:

```typescript
// Dynamic import prevents Edge bundling issues
async function getAuth() {
  const { auth } = await import('./index');
  return auth;
}
```

## Gestión de memoria

### Estrategia de limpieza

La caché de sesión utiliza dos mecanismos de limpieza:

1. **Limpieza probabilística (10%)**: en cada llamada `set()` , hay un 10 % de posibilidades de ejecutar una limpieza completa.
2. **Desalojo de LRU**: cuando el caché supera las 1000 entradas, las entradas más antiguas (por `createdAt` ) se desalojan.

```typescript
private cleanup(): void {
  const now = Date.now();

  // Remove expired entries
  for (const [key, cached] of this.cache.entries()) {
    if (now > cached.expiresAt) {
      this.cache.delete(key);
    }
  }

  // Enforce size limit (LRU eviction)
  if (this.cache.size > this.MAX_SIZE) {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].createdAt - b[1].createdAt);
    const toDelete = entries.slice(0, this.cache.size - this.MAX_SIZE);
    toDelete.forEach(([key]) => this.cache.delete(key));
  }
}
```

## Consideraciones de rendimiento

1. **Objetivo de tasa de aciertos de caché**: Apunta a una tasa de aciertos superior al 80 %. Las tasas más bajas sugieren que el TTL es demasiado corto o que los tokens no se extraen correctamente.
2. **Uso de memoria**: cada sesión en caché ocupa aproximadamente entre 1 y 2 KB. A su capacidad máxima (1000), la caché utiliza aproximadamente entre 1 y 2 MB.
3. **Generalidades de SHA-256**: la generación de claves agrega ~0,1 ms por búsqueda. Esto es insignificante en comparación con el viaje de ida y vuelta de la base de datos guardado.
4. **Penalización por inicio en frío**: después de la implementación, todas las sesiones pierden el caché en la primera solicitud.

## Solución de problemas

### La sesión no se almacena en caché después de iniciar sesión

1. Verifique que la cookie del token de sesión se envíe con las solicitudes.
2. Compruebe que `extractSessionToken` pueda analizar el formato de la cookie.
3. Asegúrese de que la función `getCachedSession` reciba el parámetro `request` .

### El caché crece sin límites

1. Verifique que se esté ejecutando la limpieza probabilística (verifique si hay mensajes de registro de limpieza).
2. Fuerce la limpieza llamando al `sessionCache.clear()` .
3. Supervise el tamaño de la caché con `getSessionCacheStats().size` .

### Sesión obsoleta después del cambio de rol

1. Llame al `invalidateSessionCache(sessionToken, userId)` después de cambios de rol.
2. El TTL de 10 minutos significa que los datos obsoletos persisten durante un máximo de 10 minutos sin invalidación explícita.

## Documentación relacionada

- [Análisis profundo de la arquitectura de almacenamiento en caché] (./caching-deep-dive.md)
- [Patrones de recuperación de errores](./error-recovery-patterns.md)
- [Arquitectura de limitación de velocidad] (./rate-limiting-architecture.md)
