---
id: feature-config
title: "Configuración de Funcionalidades"
sidebar_label: "Feature Config"
sidebar_position: 3
---

# Configuración de Funcionalidades

La plantilla utiliza un sistema de feature flags para habilitar o deshabilitar funcionalidades de forma controlada según la configuración del sistema. Esto permite que la aplicación funcione sin una base de datos (sirviendo solo contenido estático), mientras habilita funciones progresivamente a medida que la infraestructura esté disponible.

## Módulo de Feature Flags

Los feature flags están definidos en `lib/config/feature-flags.ts`.

### Interfaz FeatureFlags

```ts
interface FeatureFlags {
  /** Función de valoraciones y reseñas de usuarios */
  ratings: boolean;
  /** Comentarios de usuarios en los elementos */
  comments: boolean;
  /** Colección de favoritos del usuario */
  favorites: boolean;
  /** Visualización de elementos destacados gestionados por el administrador */
  featuredItems: boolean;
  /** Encuestas de usuarios y recopilación de opiniones */
  surveys: boolean;
}
```

### Cómo se Determinan los Indicadores

Todas las funcionalidades actuales dependen de la disponibilidad de la base de datos. Una función está habilitada cuando `DATABASE_URL` está configurado:

```ts
export function getFeatureFlags(): FeatureFlags {
  const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

  return {
    ratings: isDatabaseConfigured,
    comments: isDatabaseConfigured,
    favorites: isDatabaseConfigured,
    featuredItems: isDatabaseConfigured,
    surveys: isDatabaseConfigured,
  };
}
```

Este diseño permite que la plantilla sirva contenido desde un CMS basado en Git sin ninguna base de datos, mientras que las funciones interactivas dependientes de la base de datos (valoraciones, comentarios, favoritos) se deshabilitan automáticamente.

### Funciones Utilitarias

El módulo expone varias funciones helper:

```ts
// Verificar una sola función
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Renderizar el componente de comentarios
}

// Obtener todas las funciones habilitadas
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// ej. ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Obtener todas las funciones deshabilitadas (útil para depuración)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Verificar si todo está listo
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Full platform is operational');
}
```

### Referencia Completa de la API

| Función/Variable | Devuelve | Descripción |
|------------------|----------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | Todos los indicadores como objeto booleano |
| `isFeatureEnabled(name)` | `boolean` | Verificar una sola función por nombre |
| `getEnabledFeatures()` | `string[]` | Arreglo de nombres de funciones habilitadas |
| `getDisabledFeatures()` | `string[]` | Arreglo de nombres de funciones deshabilitadas |
| `areAllFeaturesEnabled()` | `boolean` | Verdadero si cada función está habilitada |

## Renderizado Dependiente de Funcionalidad

### En Componentes de Servidor

```tsx
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export default function ItemDetailPage({ item }) {
  const showComments = isFeatureEnabled('comments');
  const showRatings = isFeatureEnabled('ratings');

  return (
    <div>
      <ItemDetail item={item} />
      {showRatings && <RatingSection itemId={item.id} />}
      {showComments && <CommentsSection itemId={item.id} />}
    </div>
  );
}
```

### En Rutas de API

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // Manejar la creación del comentario...
}
```

## Configuración del Sitio (siteConfig)

Más allá de los feature flags, la plantilla proporciona un objeto `siteConfig` en `lib/config.ts` para la personalización de la marca y los metadatos. Cada valor puede ser sobreescrito mediante variables de entorno:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || '...',
  keywords: process.env.NEXT_PUBLIC_SITE_KEYWORDS?.split(',').map(k => k.trim()) || [...],
  ogImage: {
    gradientStart: process.env.NEXT_PUBLIC_OG_GRADIENT_START || '#667eea',
    gradientEnd: process.env.NEXT_PUBLIC_OG_GRADIENT_END || '#764ba2'
  },
  social: {
    github: process.env.NEXT_PUBLIC_SOCIAL_GITHUB || '...',
    x: process.env.NEXT_PUBLIC_SOCIAL_X || '...',
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN || '...',
    // ...
  },
  attribution: {
    url: process.env.NEXT_PUBLIC_ATTRIBUTION_URL || 'https://ever.works',
    name: process.env.NEXT_PUBLIC_ATTRIBUTION_NAME || 'Ever Works'
  }
} as const;
```

### Personalización mediante Variables de Entorno

| Variable | Predeterminado | Propósito |
|----------|---------------|-----------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Nombre del sitio en metadatos e imágenes OG |
| `NEXT_PUBLIC_SITE_TAGLINE` | Predeterminado de la plantilla | Eslogan de la página principal |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | URL completa del sitio (sin barra final) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Ruta del logo relativa a `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Nombre de la organización Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Predeterminado de la plantilla | Meta descripción SEO |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Predeterminados de la plantilla | Palabras clave SEO separadas por comas |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | Color inicial del gradiente de la imagen OG |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | Color final del gradiente de la imagen OG |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | URL de Ever Works | Enlace al perfil de GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | URL de Ever Works | Enlace al perfil de X (Twitter) |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | Enlace del pie de página "Construido con" |

### Validación

La función `validateSiteConfig()` verifica las variables críticas que faltan para producción:

```ts
import { validateSiteConfig } from '@/lib/config';

// Devuelve true si todas las variables requeridas están configuradas, false con advertencias en caso contrario
const isValid = validateSiteConfig();
```

Se registran advertencias para `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` y `NEXT_PUBLIC_SITE_NAME` faltantes.

## ConfigManager (Configuración YAML)

La clase `ConfigManager` en `lib/config-manager.ts` gestiona el archivo `config.yml` del repositorio CMS basado en Git. Maneja la lectura, escritura y confirmación de cambios de configuración.

### Leyendo la Configuración

```ts
import { configManager } from '@/lib/config-manager';

// Obtener toda la configuración
const config = configManager.getConfig();

// Obtener una clave específica
const pagination = configManager.getPaginationConfig();
// Devuelve: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Obtener un valor anidado
const value = configManager.getNestedValue('pagination.type');
```

### Escribiendo la Configuración

Todas las escrituras se confirman y envían automáticamente al repositorio Git:

```ts
// Actualizar la paginación
await configManager.updatePagination('infinite', 24);

// Actualizar cualquier clave de nivel superior
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Actualizar una clave anidada
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Integración con Git

ConfigManager automáticamente:
1. Guarda el archivo YAML en el directorio de contenido
2. Pone en cola un commit de Git con un mensaje descriptivo
3. Envía al repositorio GitHub configurado
4. Serializa las operaciones de Git para evitar conflictos de escritura concurrente

Los mensajes de commit son contextuales:

```ts
// Para cambios de paginación:
"Update pagination configuration (type: infinite, itemsPerPage: 24) - 2024-01-20T..."

// Para navegación del encabezado:
"Update custom header navigation (5 items) - 2024-01-20T..."

// Para claves generales:
"Update config.yml: myKey - 2024-01-20T..."
```

### Seguridad

ConfigManager incluye protección contra envenenamiento de prototipos:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

Los intentos de actualizar las claves `__proto__`, `constructor` o `prototype` se descartan silenciosamente.

## Archivos Relacionados

| Ruta | Descripción |
|------|-------------|
| `lib/config/feature-flags.ts` | Definiciones de feature flags y funciones helper |
| `lib/config.ts` | siteConfig seguro para el cliente y re-exportaciones de tipos |
| `lib/config-manager.ts` | Lector/escritor de configuración YAML con integración Git |
| `lib/config/index.ts` | Exportación barrel para el módulo de configuración |
| `lib/config/config-service.ts` | Singleton ConfigService del lado del servidor |
| `lib/config/types.ts` | Definiciones de tipos TypeScript para la configuración |
| `.env.example` | Lista completa de opciones de variables de entorno |
