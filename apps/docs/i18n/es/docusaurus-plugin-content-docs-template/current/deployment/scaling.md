---
id: scaling
title: Escalabilidad & Alta Disponibilidad
sidebar_label: Escalabilidad
sidebar_position: 4
---

# Escalabilidad & Alta Disponibilidad

Esta guía cubre estrategias para escalar Ever Works Template desde una implementación de instancia única hasta una configuración de producción de alta disponibilidad, incluyendo configuración serverless, connection pooling, optimización de CDN y funciones edge.

## Arquitectura de Implementación

La plantilla admite múltiples arquitecturas de implementación:

| Arquitectura | Mejor para | Modelo de Escalabilidad |
|---|---|---|
| Vercel (Serverless) | La mayoría de implementaciones | Escalabilidad horizontal automática |
| Docker (Standalone) | Self-hosted, on-premise | Manual o basado en orquestador |
| Node.js (Directo) | Desarrollo, implementaciones simples | Instancia única o clúster PM2 |

## Configuración Serverless (Vercel)

### Salida Standalone

La plantilla está configurada con salida standalone para implementación serverless optimizada:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

El modo standalone produce un build autocontenido en `.next/standalone/` que incluye solo los archivos necesarios para ejecutar la aplicación. Esto minimiza los tiempos de arranque en frío reduciendo el tamaño del paquete de implementación.

### Configuración de Funciones

Configure las configuraciones de funciones serverless en `vercel.json` o mediante configuración a nivel de ruta:

```typescript
// app/api/heavy-computation/route.ts
export const maxDuration = 60; // segundos (Plan Pro: hasta 300s)
export const dynamic = 'force-dynamic';
```

### Configuraciones Recomendadas para Funciones

| Tipo de Ruta | Duración Máx | Memoria | Notas |
|---|---|---|---|
| Rutas API (simples) | 10s | 1024 MB | Predeterminado para la mayoría de endpoints |
| Rutas API (procesamiento de datos) | 30s | 1024 MB | Para operaciones por lotes |
| Cron jobs | 60s | 1024 MB | Ejecución de tareas en segundo plano |
| Manejadores de webhook | 30s | 1024 MB | Callbacks de pago, OAuth |
| Páginas estáticas | N/A | N/A | Pre-renderizadas en el momento del build |

### Optimización de Arranque en Frío

Minimiza los arranques en frío con estas técnicas:

| Técnica | Implementación | Impacto |
|---|---|---|
| Minimizar tamaño de función | `serverExternalPackages` en config | Reduce tiempo de inicialización |
| Evitar importaciones a nivel de módulo | `import()` dinámico para módulos pesados | Aplaza la carga hasta que sea necesaria |
| Usar edge runtime donde sea posible | `export const runtime = 'edge'` | Arranque en frío casi cero |
| Mantener funciones calientes | Endpoints de health check con monitoreo | Mantiene funciones activas |

## Connection Pooling de Base de Datos

### El Problema

En entornos serverless, cada invocación de función puede abrir una nueva conexión a la base de datos. Sin pooling, esto puede agotar el límite de conexiones de la base de datos.

### Solución: Connection Pooler

Use un connection pooler entre su aplicación y la base de datos:

| Pooler | Proveedor | Configuración |
|---|---|---|
| PgBouncer | Supabase (integrado) | Use la cadena de conexión con pool (puerto 6543) |
| Neon Pooler | Neon (integrado) | Use la cadena de conexión `-pooler` |
| PgBouncer | Self-hosted | Implemente PgBouncer junto con PostgreSQL |

### Configuración

Use diferentes cadenas de conexión para conexiones con pool y directas:

```bash
# Conexión con pool para consultas de aplicación (segura para serverless)
DATABASE_URL=postgresql://user:pass@host:6543/db?pgbouncer=true

# Conexión directa solo para migraciones
DIRECT_DATABASE_URL=postgresql://user:pass@host:5432/db
```

Actualice `drizzle.config.ts` para usar la conexión directa para migraciones:

```typescript
export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL,
  },
} satisfies Config;
```

### Límites de Conexión

| Nivel | Máx de Conexiones | Tamaño de Pool Recomendado |
|---|---|---|
| Hobby (Neon/Supabase) | 50–100 | 10–20 |
| Pro (Neon/Supabase) | 200–500 | 50–100 |
| Enterprise | 1000+ | 100–200 |

### Gestión de Conexiones en el Código

El módulo de base de datos de la plantilla debe reutilizar un único pool de conexiones por instancia de función:

```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Crear pool de conexiones una vez por instancia serverless
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, {
  max: 10,          // Conexiones máximas en el pool
  idle_timeout: 20, // Cerrar conexiones inactivas después de 20s
  connect_timeout: 10,
});

export const db = drizzle(client);
```

## CDN y Caché

### Red Vercel Edge

Al implementar en Vercel, la red Edge provee automáticamente:

- Distribución CDN global en más de 30 regiones
- Caché automático de assets estáticos
- Caché en el borde para páginas ISR (Incremental Static Regeneration)
- Protección DDoS

### Cabeceras Cache-Control

Configure el caché para diferentes tipos de contenido:

```typescript
// Ruta API con cabeceras de caché
export async function GET() {
  const data = await fetchData();

  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
```

### Estrategia de Caché por Tipo de Contenido

| Tipo de Contenido | Estrategia de Caché | TTL | Notas |
|---|---|---|---|
| Assets estáticos (JS, CSS, imágenes) | Inmutable | 1 año | Nombres de archivo con hash de contenido |
| Páginas públicas | ISR | 60–300s | Revalidar bajo demanda |
| Respuestas de API (públicas) | `s-maxage` | 10–60s | Caché a nivel CDN |
| Respuestas de API (autenticadas) | `no-store` | 0 | Nunca almacenar datos específicos del usuario |
| Páginas de contenido CMS | ISR | 300s | Revalidar después de sincronización de contenido |

### ISR (Incremental Static Regeneration)

Use ISR para páginas con mucho contenido que cambian raramente:

```typescript
// app/[locale]/discover/[page]/page.tsx
export const revalidate = 300; // Regenerar cada 5 minutos

export default async function DiscoverPage({ params }) {
  const items = await fetchItems(params.page);
  return <ItemGrid items={items} />;
}
```

### Revalidación Bajo Demanda

Déclenchement de la revalidación después de actualizaciones de contenido:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { secret, path } = await request.json();

  if (secret !== process.env.REVALIDATION_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  revalidatePath(path);
  return Response.json({ revalidated: true });
}
```

## Funciones Edge

### Cuándo Usar el Edge Runtime

Las funciones edge se ejecutan en Cloudflare Workers (a través de Vercel) y proporcionan tiempos de arranque en frío casi cero. Úselas para:

| Caso de Uso | Ejemplo |
|---|---|
| Enrutamiento basado en geolocalización | Redirigir usuarios a contenido regional |
| Pruebas A/B | Dirigir a variantes de experimento |
| Verificaciones de autenticación | Validación rápida de sesión |
| Transformación de respuesta | Agregar cabeceras, modificar respuestas |
| Endpoints de API simples | Recuperación de datos ligera |

### Limitaciones del Edge Runtime

| Limitación | Detalle |
|---|---|
| Sin APIs de Node.js | No puede usar `fs`, `child_process`, etc. |
| Sin módulos nativos | No puede usar `bcryptjs`, `postgres` directamente |
| Tiempo de ejecución limitado | Máx 30 segundos (Vercel Pro) |
| Memoria limitada | 128 MB |
| Sin Drizzle ORM | Use clientes de base de datos compatibles con edge |

### Ejemplo de Función Edge

```typescript
// app/api/geo/route.ts
export const runtime = 'edge';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

  return Response.json({
    country,
    city,
    timestamp: Date.now(),
  });
}
```

## Estrategias de Escalabilidad Horizontal

### Diseño de Aplicación Sin Estado

La plantilla está diseñada para ser sin estado en la capa de aplicación:

| Componente | Ubicación del Estado | Impacto en Escalabilidad |
|---|---|---|
| Sesiones | Base de datos o JWT | Sin estado compartido entre instancias |
| Trabajos en segundo plano | Gestor de trabajos (por instancia o Trigger.dev) | Use Trigger.dev para múltiples instancias |
| Cargas de archivos | Almacenamiento externo (S3, Supabase) | Sin dependencia del sistema de archivos local |
| Contenido CMS | Repositorio Git (clonado en build/inicio) | Solo lectura, idéntico por instancia |
| Caché | In-memory (por instancia) o Redis | Considere Redis para caché compartido |

### Consideraciones de Múltiples Instancias

Al ejecutar múltiples instancias (Docker Swarm, Kubernetes o múltiples funciones Vercel):

1. **Trabajos en segundo plano**: Use Trigger.dev o Vercel Cron en vez de `LocalJobManager` para evitar ejecuciones duplicadas.
2. **Conexiones de base de datos**: Habilite connection pooling para evitar el agotamiento de conexiones.
3. **Almacenamiento de sesiones**: Use sesiones basadas en base de datos en vez de almacenes in-memory.
4. **Invalidación de caché**: Implemente caché compartido (Redis) o acepte consistencia eventual con cachés por instancia.

## Monitoreo a Escala

### Métricas Clave para Rastrear

| Métrica | Herramienta | Umbral |
|---|---|---|
| Tiempo de respuesta (p95) | Sentry, Vercel Analytics | < 500ms |
| Tasa de error | Sentry | < 1% |
| Conteo de conexiones de base de datos | Dashboard de base de datos | < 80% del máximo |
| Arranques en frío de funciones | Vercel Analytics | Monitorear frecuencia |
| Tasa de aciertos de caché | Registros de aplicación | > 80% |
| Uso de memoria | Métricas Vercel/Docker | < 80% del límite |

### Monitoreo de Rendimiento Sentry

La plantilla configura Sentry con muestreo de trazas:

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Ajuste `tracesSampleRate` según el volumen de tráfico:

| Solicitudes Diarias | Tasa de Muestreo Recomendada |
|---|---|
| < 10.000 | 1,0 (100%) |
| 10.000–100.000 | 0,1 (10%) |
| 100.000–1.000.000 | 0,01 (1%) |
| > 1.000.000 | 0,001 (0,1%) |

## Pruebas de Carga

### Herramientas Recomendadas

| Herramienta | Caso de Uso | Complejidad |
|---|---|---|
| `autocannon` | Benchmarks HTTP rápidos | Baja |
| `k6` | Pruebas de carga con scripts | Media |
| `Artillery` | Escenarios complejos | Media |
| `Locust` | Basado en Python, distribuido | Alta |

### Ejemplo de Prueba de Carga

```bash
# Benchmark rápido con autocannon
npx autocannon -c 50 -d 30 https://your-app.vercel.app/api/health

# Script k6 para pruebas más detalladas
k6 run load-test.js
```

### Lista de Verificación de Pruebas

| Prueba | Objetivo | Criterio de Aprobación |
|---|---|---|
| Carga de página de inicio | 100 usuarios concurrentes | p95 < 1s |
| Endpoint de API | 200 solicitudes/segundo | p95 < 500ms, 0% de errores |
| Consulta de búsqueda | 50 usuarios concurrentes | p95 < 2s |
| Flujo de autenticación | 20 usuarios concurrentes | Todos exitosos, sin timeouts |

## Lista de Verificación de Escalabilidad

| Categoría | Elemento | Prioridad |
|---|---|---|
| **Base de Datos** | Habilitar connection pooling | Crítico |
| **Base de Datos** | Usar réplicas de lectura para cargas de lectura intensas | Alto |
| **Base de Datos** | Agregar índices para consultas lentas | Alto |
| **Caché** | Configurar cabeceras de caché CDN | Crítico |
| **Caché** | Implementar ISR para páginas de contenido | Alto |
| **Caché** | Agregar Redis para caché compartido (si múltiples instancias) | Medio |
| **Cómputo** | Usar edge runtime para rutas ligeras | Medio |
| **Cómputo** | Optimizar arranques en frío con paquetes externos | Alto |
| **Trabajos** | Migrar a Trigger.dev para múltiples instancias | Alto |
| **Trabajos** | Configurar Vercel Cron para tareas programadas | Alto |
| **Monitoreo** | Configurar Sentry con muestreo adecuado | Crítico |
| **Monitoreo** | Configurar alertas para tasa de error y latencia | Alto |
| **Pruebas** | Ejecutar pruebas de carga antes de lanzamientos importantes | Alto |
