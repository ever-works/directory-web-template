---
id: seo-utilities
title: Utilidades SEO
sidebar_label: Utilidades SEO
sidebar_position: 37
---

# Utilidades SEO

La plantilla incluye un conjunto de utilidades de SEO para generar datos estructurados JSON-LD, etiquetas hreflang para páginas multilingües y objetos Next.js `Metadata` para enumerar páginas. Estas utilidades garantizan que los motores de búsqueda indexen y muestren el contenido correctamente.

## Estructura de archivos

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## Datos estructurados JSON-LD (`schema.ts`)

### Esquema del producto

Genere `schema.org/Product` datos estructurados para páginas de detalles de artículos:

```ts
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Awesome Tool',
  description: 'A great tool for developers',
  image: 'https://example.com/tool.png',
  url: 'https://example.com/items/awesome-tool',
  category: 'Developer Tools',
  sourceUrl: 'https://awesome-tool.dev',
  brandName: 'ToolCorp',
});
```

La salida JSON-LD generada:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Awesome Tool",
  "description": "A great tool for developers",
  "image": "https://example.com/tool.png",
  "url": "https://example.com/items/awesome-tool",
  "category": "Developer Tools",
  "brand": {
    "@type": "Brand",
    "name": "ToolCorp"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://awesome-tool.dev",
    "availability": "https://schema.org/InStock"
  }
}
```

Todos los campos excepto `name`, `description` y `url` son opcionales y solo se incluyen en la salida cuando se proporcionan.

### Esquema de organización

Genere `schema.org/Organization` datos estructurados para el sitio. Por lo general, se coloca en la página de inicio para que aparezca en el Panel de conocimiento de Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

La función lee de `siteConfig` y genera:

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Ever Works",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "description": "Directory of tools and services",
  "sameAs": [
    "https://github.com/ever-works",
    "https://twitter.com/everworks"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "email": "info@ever.works",
    "contactType": "customer service"
  }
}
```

La matriz `sameAs` se completa desde `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, blog), con valores vacíos filtrados. El `contactPoint` solo se agrega cuando se configura un correo electrónico.

### Esquema del sitio web

Genere `schema.org/WebSite` con `SearchAction` para la búsqueda de vínculos a sitios:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Salida para la configuración regional predeterminada:

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Ever Works Directory",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://example.com?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### Esquema de ruta de navegación

Genere `schema.org/BreadcrumbList` para las rutas de navegación:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Etiquetas Hreflang (`hreflang.ts`)

Las etiquetas Hreflang indican a los motores de búsqueda qué versiones de idiomas de una página están disponibles. La plantilla los genera para las más de 20 configuraciones regionales admitidas.

### Generación de URL

La función `getLocalizedUrl` sigue el patrón de prefijo local "según sea necesario":

- La configuración regional predeterminada (`en`) no tiene prefijo: `https://example.com/about`
- Otras configuraciones regionales obtienen un prefijo: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Generando alternativas de Hreflang

La función `generateHreflangAlternates` devuelve un objeto compatible con Next.js `Metadata.alternates.languages`:

```ts
import { generateHreflangAlternates } from '@/lib/seo/hreflang';

const languages = generateHreflangAlternates('/about');
// => {
//   'en': 'https://example.com/about',
//   'fr': 'https://example.com/fr/about',
//   'es': 'https://example.com/es/about',
//   'de': 'https://example.com/de/about',
//   ...all other locales...
//   'x-default': 'https://example.com/about',
// }
```

### Uso en `generateMetadata`

```ts
// app/[locale]/about/page.tsx
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    title: 'About Us',
    alternates: {
      canonical: `/${locale}/about`,
      languages: generateHreflangAlternates('/about'),
    },
  };
}
```

### Funciones de conveniencia

Para rutas dinámicas comunes, hay funciones abreviadas disponibles:

```ts
import {
  generateItemHreflangAlternates,
  generatePageHreflangAlternates,
} from '@/lib/seo/hreflang';

// For item detail pages: /items/[slug]
const itemAlternates = generateItemHreflangAlternates('awesome-tool');

// For CMS pages: /pages/[slug]
const pageAlternates = generatePageHreflangAlternates('privacy-policy');
```

## Listado de metadatos (`listing-metadata.ts`)

La función `generateListingMetadata` crea un objeto Next.js `Metadata` completo para enumerar e indexar páginas:

```ts
import { generateListingMetadata } from '@/lib/seo/listing-metadata';

export async function generateMetadata({ params }) {
  const { locale } = await params;

  return generateListingMetadata({
    title: 'Developer Tools',
    description: 'Browse the best developer tools and services',
    path: '/categories/developer-tools',
    locale,
    itemCount: 150,
    keywords: ['developer tools', 'programming', 'software'],
    imageUrl: 'https://example.com/og/dev-tools.png',
  });
}
```

La función genera:

|campo|Valor|
|-------|-------|
|`title`|`"Herramientas de desarrollo \|Alguna vez funciona"`|
|`description`|Personalizado o generado automáticamente con recuento de artículos|
|`keywords`|Palabras clave separadas por comas|
|`openGraph.type`|`"website"`|
|`openGraph.url`|URL canónica con prefijo local|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|URL canónica completa|
|`alternates.languages`|Hreflang alternativo para todas las configuraciones regionales|

El `description` se genera automáticamente cuando no se proporciona: `"Browse 150 developer tools. Directory of tools and services"`.

### Interfaz de opciones

```ts
interface ListingMetadataOptions {
  title: string;           // Page title (will be appended with site name)
  description?: string;    // Custom meta description (auto-generated if omitted)
  path: string;            // URL path without locale prefix
  locale: string;          // Current locale
  itemCount?: number;      // Number of items (used in auto-description)
  keywords?: string[];     // SEO keywords
  imageUrl?: string;       // Open Graph image URL
}
```

## Representación de JSON-LD en páginas

Agregue los esquemas generados a su página usando una etiqueta `script`:

```tsx
// app/[locale]/items/[slug]/page.tsx
import { generateProductSchema, generateBreadcrumbSchema } from '@/lib/seo/schema';

export default async function ItemPage({ params }) {
  const item = await getItem(params.slug);

  const productSchema = generateProductSchema({
    name: item.name,
    description: item.description,
    url: `https://example.com/items/${item.slug}`,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      {/* Page content */}
    </>
  );
}
```

## Archivos relacionados

- `lib/seo/schema.ts` - Generadores de esquemas JSON-LD
- `lib/seo/hreflang.ts` - Utilidades de etiquetas Hreflang
- `lib/seo/listing-metadata.ts` - Generador de metadatos de página de listado
- `lib/config/client.ts` - `siteConfig` utilizado por generadores de esquemas
- `lib/constants.ts` - `LOCALES` y `DEFAULT_LOCALE` utilizados por hreflang
