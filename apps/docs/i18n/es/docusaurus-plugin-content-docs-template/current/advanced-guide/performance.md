---
id: performance
title: Optimización del rendimiento
sidebar_label: Actuación
sidebar_position: 5
---

# Optimización del rendimiento

Esta guía cubre las optimizaciones de rendimiento integradas en la plantilla Ever Works y las técnicas para mantener tiempos de carga rápidos a medida que crece su aplicación.

## Configuración de Next.js

El `next.config.ts` de la plantilla incluye varias configuraciones centradas en el rendimiento:

### Salida independiente

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
  // ...
};
```

El modo de salida `standalone` crea una compilación autónoma que incluye solo los archivos necesarios para ejecutar la aplicación. Esto reduce el tamaño del contenedor y el tiempo de inicio en producción.

### Optimización de importación de paquetes

```typescript
experimental: {
  optimizePackageImports: ["@heroui/react", "lucide-react"],
},
```

Esta configuración permite la agitación de árboles para paquetes con muchos archivos de barril. En lugar de importar toda la biblioteca `@heroui/react` o `lucide-react` , solo se incluyen en el paquete los componentes realmente utilizados.

### Optimización de visualización del paquete web

```typescript
if (dev) {
  config.watchOptions = {
    ...config.watchOptions,
    ignored: ['**/node_modules/**', '**/.git/**', '**/.content/**']
  };
}
```

El directorio `.content/` (CMS basado en Git con más de 220 archivos Markdown) está excluido del observador de archivos del paquete web en desarrollo. Esto evita reconstrucciones innecesarias cuando los archivos de contenido cambian y reduce significativamente el uso de la CPU durante el desarrollo.

### Advertencias suprimidas

El registro detallado de infraestructura se suprime en entornos CI y Vercel:

```typescript
if (process.env.CI || process.env.VERCEL) {
  config.infrastructureLogging = { level: 'error' };
}
```

## Optimización de imagen

### Patrones remotos

La plantilla genera dinámicamente patrones de imágenes remotas permitidas usando `generateImageRemotePatterns()` . Esto garantiza que las imágenes de CDN configuradas y fuentes externas se optimicen a través del canal de imágenes integrado de Next.js.

### Manejo de SVG

```typescript
images: {
  dangerouslyAllowSVG: true,
  contentDispositionType: 'attachment',
  contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  unoptimized: false,
},
```

Se permiten imágenes SVG, pero están protegidas por una estricta política de seguridad de contenido que deshabilita la ejecución de scripts. Esto permite logotipos e íconos SVG y al mismo tiempo evita XSS mediante la inyección de SVG.

### Mejores prácticas para imágenes

| Técnica | Implementación | Impacto |
|---|---|---|
| Utilice `next/image` | Componente incorporado con carga diferida | WebP/AVIF automático, tamaños responsivos |
| Establecer dimensiones explícitas | Accesorios `width` y `height` | Evita el cambio de diseño acumulativo (CLS) |
| Utilice `priority` para LCP | `<Image priority />` para imágenes de héroes | Precarga la imagen de pintura con contenido más grande |
| Utilice el apoyo `sizes` | `sizes="(max-width: 768px) 100vw, 50vw"` | Evita la descarga de imágenes de gran tamaño |
| Marcadores de posición desenfocados | `placeholder="blur"` con `blurDataURL` | Mejora la velocidad de carga percibida |

## Estrategias de almacenamiento en caché

### Encabezados HTTP

La plantilla establece encabezados relacionados con el caché en `next.config.ts` :

```typescript
headers: [
  { key: "X-DNS-Prefetch-Control", value: "on" },
]
```

La captación previa de DNS está habilitada globalmente para reducir la latencia de búsqueda de DNS para recursos externos.

### Generación estática

La plantilla utiliza un tiempo de espera generoso para la generación de páginas estáticas:

```typescript
staticPageGenerationTimeout: 180, // 3 minutes
```

Esto se adapta a páginas que obtienen datos de API externas o del CMS basado en Git durante el tiempo de compilación.

### Configuración de etiqueta ET

```typescript
generateEtags: false,
```

Las ETags están deshabilitadas en el nivel Next.js porque el CDN/proxy inverso (Vercel Edge Network o Cloudflare) maneja la validación de la caché de manera más eficiente.

### Almacenamiento en caché a nivel de aplicación

El procesador de análisis en segundo plano precalienta las cachés a intervalos regulares:

| Tipo de caché | Intervalo de actualización | Datos |
|---|---|---|
| Tendencias de crecimiento de usuarios | 10 minutos | Crecimiento mensual de usuarios durante 6, 12, 24 meses |
| Tendencias de actividad | 5 minutos | Datos de actividad para ventanas de 7, 14 y 30 días |
| Clasificación de artículos principales | 15 minutos | 10, 20, 50 artículos principales |
| Actividad reciente | 2 minutos | Últimas entradas de 10 y 20 actividades |
| Métricas de rendimiento | 30 segundos | Estadísticas de rendimiento de consultas |
| Limpieza de caché | 1 hora | Eliminación de entradas de caché caducadas |

## Carga diferida

### Carga diferida a nivel de componente

Utilice `next/dynamic` para componentes pesados que no son necesarios en el renderizado inicial:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // disable SSR for client-only components
});
```

### División de código a nivel de ruta

Next.js App Router divide automáticamente el código por ruta. Cada página en `app/[locale]/` tiene su propio paquete, por lo que los usuarios solo descargan el JavaScript necesario para la página actual.

### Importaciones dinámicas en trabajos en segundo plano

La plantilla utiliza importaciones dinámicas dentro de las devoluciones de llamadas de trabajos para evitar que el paquete web introduzca módulos solo de servidor en el paquete del cliente:

```typescript
manager.scheduleJob('repository-sync', 'Repository Synchronization', async () => {
  const { syncManager } = await import('@/lib/services/sync-service');
  await syncManager.performSync();
}, 5 * 60 * 1000);
```

## Optimización del tamaño del paquete

### Analizando el paquete

Ejecute lo siguiente para inspeccionar la composición del paquete:

```bash
ANALYZE=true pnpm build
```

Si se configura `@next/bundle-analyzer` , esto produce un mapa de árbol interactivo que muestra qué módulos contribuyen al tamaño del paquete.

### Técnicas de optimización comunes

| Técnica | Ejemplo | Ahorros |
|---|---|---|
| Optimización de archivos de barril | `optimizePackageImports` en configuración | Evita la importación de bibliotecas completas de íconos/UI |
| Módulos solo de servidor | `import 'server-only'` en archivos lib | Evita la agrupación accidental de clientes |
| Importaciones dinámicas | `await import('@/lib/services/...')` | Pospone la carga hasta que sea necesario |
| Paquetes externos | `serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm']` | Se excluye del paquete webpack |

La configuración `serverExternalPackages` es particularmente importante:

```typescript
serverExternalPackages: ['postgres', 'bcryptjs', 'drizzle-orm'],
```

Estos paquetes están excluidos del paquete web y se cargan de forma nativa en tiempo de ejecución, lo que reduce el tiempo de compilación y evita problemas de compatibilidad con los módulos nativos.

## Consejos para la optimización del faro

### Objetivos principales de Web Vitals

| Métrica | Objetivo | Factores clave |
|---|---|---|
| **LCP** (Pintura con contenido más grande) | < 2,5 s | Optimización de imágenes, carga prioritaria, tiempo de respuesta del servidor |
| **FID** (Retraso de la primera entrada) | < 100 ms | División de código, bloqueo mínimo del hilo principal |
| **CLS** (cambio de diseño acumulativo) | < 0,1 | Dimensiones de imagen explícitas, estrategia de carga de fuentes |
| **TTFB** (Tiempo hasta el primer byte) | < 800 ms | Almacenamiento en caché de CDN, funciones perimetrales, optimización de consultas de bases de datos |

### Lista de verificación práctica

1. **Imágenes**: Utilice `next/image` con accesorios explícitos `width` , `height` y `sizes` . Marque las imágenes de la mitad superior de la página con `priority` .
2. **Fuentes**: utilice `next/font` para autohospedar fuentes con `display: swap` y precargar archivos de fuentes importantes.
3. **JavaScript**: revise `optimizePackageImports` y agregue las bibliotecas grandes que utilicen archivos barril.
4. **CSS**: la plantilla utiliza Tailwind CSS, que ya se elimina en las compilaciones de producción. Evite importar módulos CSS no utilizados.
5. **Scripts de terceros**: posponga los scripts no críticos usando `next/script` con `strategy="lazyOnload"` .
6. **Componentes del servidor**: De forma predeterminada, React Server Components (RSC) y solo usa `"use client"` cuando se requiere interactividad.

### Faro en funcionamiento

La plantilla incluye una configuración `lighthouse-test.json` . Ejecute pruebas Lighthouse automatizadas:

```bash
npx lhci autorun --config=lighthouse-test.json
```

O utilice el panel Chrome DevTools Lighthouse para auditorías manuales.

## Rendimiento de consultas de bases de datos

### Agrupación de conexiones

Utilice la agrupación de conexiones para evitar abrir una nueva conexión de base de datos por solicitud. Consulte la [Guía de escalado](/deployment/scaling) para obtener detalles de configuración.

### Optimización de consultas

- Utilizar el patrón de repositorio ( `lib/repositories/` ) para centralizar y optimizar consultas.
- El repositorio de análisis incluye capas de caché integradas con TTL configurable.
- Supervisar consultas lentas a través del trabajo en segundo plano de métricas de rendimiento.

### Estrategia de indexación

Revise `lib/db/schema.ts` para ver los índices existentes. Agregar índices para:
- Columnas utilizadas en cláusulas `WHERE` - Columnas de clave externa
- Columnas utilizadas en cláusulas `ORDER BY` - Índices compuestos para búsquedas de varias columnas

## Supervisión del rendimiento

### Integración centinela

La plantilla integra Sentry para el monitoreo del desempeño en `instrumentation.ts` :

```typescript
Sentry.init({
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
```

Las trazas se muestrean al 10% en producción y al 100% en desarrollo. Ajuste `tracesSampleRate` según su volumen de tráfico y los límites del plan Sentry.

### Marcadores de rendimiento personalizados

Utilice la API de rendimiento web para tiempos personalizados:

```typescript
performance.mark('data-fetch-start');
const data = await fetchData();
performance.mark('data-fetch-end');
performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
```

## Resumen

| Área | Optimización incorporada | Pasos adicionales |
|---|---|---|
| Imágenes | WebP/AVIF automático, entorno de pruebas SVG | Agregue `priority` a las imágenes LCP, use `sizes` |
| JavaScript | Optimización de paquetes, división de código | Agregar bibliotecas a `optimizePackageImports` |
| Almacenamiento en caché | Calentamiento de caché en segundo plano, captación previa de DNS | Configurar reglas de caché CDN |
| Base de datos | Agrupación de conexiones, patrón de repositorio | Agregue índices, supervise consultas lentas |
| Construir | Salida independiente, paquetes externos | Habilitar analizador de paquetes |
| Monitoreo | Trabajo de seguimiento de centinelas y métricas de rendimiento | Configurar alertas para métricas degradadas |
