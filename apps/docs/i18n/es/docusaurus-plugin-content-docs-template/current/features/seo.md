---
id: seo
title: Configuración SEO
sidebar_label: SEO
sidebar_position: 8
---

# Configuración SEO

La plantilla Ever Works proporciona soporte SEO integral que incluye datos estructurados JSON-LD, etiquetas hreflang para contenido multilingüe, metadatos OpenGraph, mapas de sitio automatizados y configuración de robots.txt.

## Datos estructurados JSON-LD

Ubicadas en `lib/seo/schema.ts` , las utilidades de esquema generan datos estructurados de Schema.org para varios tipos de contenido.

### Esquema de producto

Utilizado en las páginas de detalles del artículo:

```typescript
import { generateProductSchema } from '@/lib/seo/schema';

const schema = generateProductSchema({
  name: 'Product Name',
  description: 'Product description',
  image: 'https://example.com/image.jpg',
  url: 'https://example.com/product',
  category: 'Software',
  sourceUrl: 'https://product-website.com',
  brandName: 'Brand Name',
});
```

Genera:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product",
  "category": "Software",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://product-website.com",
    "availability": "https://schema.org/InStock"
  }
}
```

### Esquema de organización

Se utiliza para la identidad de marca en todo el sitio en la página de inicio y en las páginas acerca de.

### Otros tipos de esquemas

El módulo proporciona generadores para:
- **WebSite**: metadatos a nivel de sitio con acción de búsqueda
- **BreadcrumbList** - Rutas de navegación de navegación
- **Página de preguntas frecuentes**: secciones de preguntas frecuentes con pares de preguntas y respuestas
- **ItemList** -- Páginas de listado de categorías y colecciones

## Etiquetas Hreflang

Ubicada en `lib/seo/hreflang.ts` , la utilidad hreflang genera enlaces de idiomas alternativos para los motores de búsqueda.

### Configuraciones regionales admitidas

La plantilla admite más de 20 configuraciones regionales:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### Generación de URL

La utilidad hreflang sigue el patrón de prefijo local "según sea necesario":
- La configuración regional predeterminada ( `en` ) utiliza la ruta raíz: `https://example.com/page` - Otras configuraciones regionales utilizan rutas prefijadas: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Mapeo de configuración regional a Hreflang

Cada configuración regional se asigna a su valor hreflang ISO 639-1. La mayoría usa el mismo código, pero algunos requieren un manejo especial para las variantes regionales.

## Listado de metadatos

Ubicado en `lib/seo/listing-metadata.ts` , este módulo genera metadatos para enumerar páginas, incluidas páginas de categorías, resultados de búsqueda y vistas filtradas con plantillas de títulos, descripciones y URL canónicas apropiadas.

## Tarjetas OpenGraph y Twitter

La plantilla genera metadatos de OpenGraph y Twitter Card a través de la API de metadatos de Next.js en los componentes de la página:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  return {
    title: 'Page Title',
    description: 'Page description',
    openGraph: {
      title: 'Page Title',
      description: 'Page description',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Page Title',
      description: 'Page description',
    },
    alternates: {
      languages: generateHreflangTags('/current-path'),
    },
  };
}
```

## Mapa del sitio

Ubicado en `app/sitemap.ts` , el mapa del sitio se genera automáticamente utilizando el soporte integrado para mapas del sitio de Next.js:

- **Páginas estáticas** -- Inicio, acerca de, precios, contacto
- **Páginas dinámicas** - Todos los artículos, categorías y colecciones publicados
- **URL localizadas**: cada página genera entradas para todas las configuraciones regionales activas
- **Prioridad y frecuencia** -- Configurado por tipo de página

## Robots.txt

Ubicado en `app/robots.ts` , la configuración de los robots:

- Permite todos los rastreadores de forma predeterminada.
- Apunta a la URL del mapa del sitio.
- Opcionalmente bloquea la indexación de rutas de administración y API.
- Configurable a través del entorno para diferencias de puesta en escena/producción.

## Mejores prácticas

1. **Cada página debe tener metadatos únicos** - Utilice `generateMetadata()` en los componentes de la página.
2. **Incluir JSON-LD en las páginas de detalles**: esquema de producto para artículos, organización para página de inicio
3. **Establecer URL canónicas**: evite contenido duplicado en versiones localizadas
4. **Utilice la utilidad hreflang**: garantiza que los motores de búsqueda ofrezcan la versión de idioma correcta
5. **Mantenga las descripciones con menos de 160 caracteres**: óptimo para fragmentos de resultados de búsqueda
