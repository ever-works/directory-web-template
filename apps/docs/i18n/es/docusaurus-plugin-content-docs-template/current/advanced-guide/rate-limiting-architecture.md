---
id: rate-limiting-architecture
title: Arquitectura de limitación de velocidad
sidebar_label: Limitación de tasa
sidebar_position: 5
---

# Arquitectura de limitación de velocidad

Esta guía cubre el sistema de limitación de velocidad, incluido el almacenamiento en memoria, la configuración por ruta, el comportamiento de la ventana deslizante, los encabezados de límite de velocidad y las reglas de omisión.

## Descripción general de la arquitectura

```
Rate Limiting Flow
===================

  Incoming Request
       |
       v
  +------------------------+
  | Extract Identifier     |  <-- IP address, user ID, API key
  +------------------------+
       |
       v
  +------------------------+
  | Build Rate Limit Key   |  <-- "ip:192.168.1.1:/api/items"
  +------------------------+
       |
       v
  +------------------------+
  | Check In-Memory Store  |
  |   Entry exists?        |
  |   Window expired?      |
  |   Count < limit?       |
  +------------------------+
       |
  +----+----+
  ALLOW     DENY
  |         |
  v         v
  Increment   Return 429
  counter     + Retry-After
  Continue    + Rate limit headers
```

## Función de limitación de velocidad central

La función `ratelimit` en `lib/utils/rate-limit.ts` implementa un limitador de velocidad de ventana fija:

```typescript
// lib/utils/rate-limit.ts
export async function ratelimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + windowMs;

  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // New window
    rateLimitStore.set(key, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment counter
  entry.count++;
  return { success: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}
```

### Interfaz de resultados de límite de velocidad

```typescript
export interface RateLimitResult {
  success: boolean;     // Whether the request is allowed
  remaining: number;    // Remaining requests in current window
  resetTime: number;    // Timestamp when the window resets
  retryAfter?: number;  // Seconds until the client can retry (only on failure)
}
```

## Almacén en memoria

El limitador de velocidad utiliza un `Map<string, RateLimitEntry>` para búsquedas O(1):

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
```

### Limpieza automática

Las entradas caducadas se limpian cada 5 minutos para evitar pérdidas de memoria:

```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
```

## Configuración por ruta

### Límites recomendados

| Patrón de ruta | Límite | Ventana | Justificación |
|--------------|-------|--------|-----------|
| `POST /api/auth/signin` | 5 | 15 minutos | Prevenir la fuerza bruta |
| `POST /api/auth/register` | 3 | 1 hora | Prevenir el spam de cuentas |
| `POST /api/comments` | 10 | 1 minuto | Evitar el spam de comentarios |
| `GET /api/items` | 100 | 1 minuto | Permitir navegación |
| `POST /api/submit` | 5 | 10 minutos | Prevenir el envío de spam |
| `POST /api/contact` | 3 | 1 hora | Prevenir el correo no deseado |
| `POST /api/webhook/*` | 1000 | 1 minuto | Alto rendimiento para proveedores |

### Implementación de límites por ruta

```typescript
// In an API route handler
import { ratelimit } from '@/lib/utils/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const key = `signin:${ip}`;

  const result = await ratelimit(key, 5, 15 * 60 * 1000);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfter),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(result.resetTime),
        },
      }
    );
  }

  // Process the request...
}
```

## Encabezados de límite de tasa

Incluya encabezados de límite de tasa estándar en todas las respuestas de API:

```typescript
function addRateLimitHeaders(
  response: NextResponse,
  limit: number,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(result.resetTime));

  if (!result.success && result.retryAfter) {
    response.headers.set('Retry-After', String(result.retryAfter));
  }

  return response;
}
```

### Referencia del encabezado

| Encabezado | Descripción | Ejemplo |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Solicitudes máximas por ventana | `100` |
| `X-RateLimit-Remaining` | Solicitudes restantes en ventana | `87` |
| `X-RateLimit-Reset` | Marca de tiempo de Unix cuando se restablece la ventana | `1709654400000` |
| `Retry-After` | Segundos hasta la próxima solicitud permitida | `45` |

## Comprobación del estado del límite de tasa

Consultar el estado actual sin incrementar el contador:

```typescript
import { getRateLimitStatus } from '@/lib/utils/rate-limit';

const status = getRateLimitStatus(`signin:${ip}`, 5);
// { remaining: 3, resetTime: 1709654400000 }
// or { remaining: 5, resetTime: null } if no window is active
```

## Restablecer límites de tarifas

```typescript
import { resetRateLimit } from '@/lib/utils/rate-limit';

// After successful CAPTCHA verification
resetRateLimit(`signin:${ip}`);

// After admin override
resetRateLimit(`submit:${userId}`);
```

## Reglas de omisión

### Fuentes confiables

```typescript
const BYPASS_IPS = new Set([
  '127.0.0.1',           // Localhost
  '::1',                 // IPv6 localhost
]);

const BYPASS_AGENTS = new Set([
  'stripe-webhook',
  'lemonsqueezy-webhook',
]);

function shouldBypass(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = request.headers.get('user-agent') || '';

  // Bypass for trusted IPs
  if (ip && BYPASS_IPS.has(ip)) return true;

  // Bypass for webhook providers
  if (BYPASS_AGENTS.has(userAgent)) return true;

  // Bypass for authenticated admin users
  // (check session in middleware)

  return false;
}
```

## Estrategias clave compuestas

### Basado en IP (anónimo)

```typescript
const key = `${route}:ip:${request.headers.get('x-forwarded-for')}`;
```

### Basado en usuario (autenticado)

```typescript
const key = `${route}:user:${session.user.id}`;
```

### Combinado (IP + Ruta)

```typescript
const key = `${request.ip}:${request.nextUrl.pathname}`;
```

## Consideraciones de rendimiento

1. **Uso de memoria**: cada entrada utiliza ~100 bytes. Con 100.000 claves activas, eso es ~10 MB.
2. **Frecuencia de limpieza**: el intervalo de limpieza de 5 minutos es un buen equilibrio. Reducir para aplicaciones de alto tráfico.
3. **Rendimiento del mapa**: JavaScript `Map` proporciona O(1) get/set. Ningún rendimiento afecta a millones de entradas.
4. **Implementación distribuida**: el almacén en memoria no comparte el estado entre instancias. Para implementaciones de múltiples instancias, use la limitación de velocidad respaldada por Redis.

## Consideraciones de producción

### Implementaciones de instancias múltiples

El limitador de velocidad en memoria no comparte el estado entre instancias del servidor. Para producción:

```typescript
// Option 1: Redis-backed rate limiter (recommended for production)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// Option 2: Accept per-instance limiting
// Each instance has its own counter. Effective limit = limit * instance_count.
```

### Ventana corrediza versus ventana fija

La implementación actual utiliza **ventanas fijas**. Esto significa que una ráfaga de solicitudes en el límite de la ventana podría permitir hasta `2 * limit` solicitudes en un período corto. Para una limitación más estricta, implemente una ventana deslizante:

```
Fixed Window (current):      Sliding Window (stricter):
|---Window 1---|---Window 2---|    |----Sliding 60s----|
 [10 req]       [10 req]           Counts all in last 60s
 ^ boundary burst possible         ^ no boundary burst
```

## Solución de problemas

### Límite de tarifa no aplicado

1. Verifique que la clave sea única por cliente (verifique la extracción de IP).
2. Asegúrese de que se llame a `ratelimit()` antes de la lógica del controlador de solicitudes.
3. Verifique que la respuesta se devuelva inmediatamente el `!result.success` .

### Todas las solicitudes tienen una tarifa limitada de inmediato

1. Compruebe que el parámetro `limit` no sea 0 o negativo.
2. Verifique que el parámetro `windowMs` esté en milisegundos, no en segundos.
3. Verifique la clave: si todas las solicitudes comparten la misma clave, comparten el mismo límite.

### Memoria creciendo sin límites

1. El intervalo de limpieza de 5 minutos debería solucionar este problema. Verifique que el temporizador de intervalo esté funcionando.
2. Llame al `resetRateLimit(key)` para borrar manualmente claves específicas.
3. Monitorear el tamaño de la tienda en desarrollo.

## Documentación relacionada

- [Patrones de recuperación de errores](./error-recovery-patterns.md)
- [Arquitectura de Webhook] (./webhook-architecture.md)
- [Profundización en la gestión de sesiones] (./session-management-deep-dive.md)
