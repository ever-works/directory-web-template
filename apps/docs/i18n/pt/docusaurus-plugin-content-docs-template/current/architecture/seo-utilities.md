---
id: seo-utilities
title: Utilitários de SEO
sidebar_label: Utilitários de SEO
sidebar_position: 37
---

# Utilitários de SEO

O modelo inclui um conjunto de utilitários de SEO para gerar dados estruturados JSON-LD, tags hreflang para páginas multilíngues e objetos Next.js `Metadata` para listar páginas. Esses utilitários garantem que os mecanismos de pesquisa indexem e exibam o conteúdo corretamente.

## Estrutura de arquivo

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## Dados estruturados JSON-LD (`schema.ts`)

### Esquema do Produto

Gere dados estruturados `schema.org/Product` para páginas de detalhes do item:

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

A saída JSON-LD gerada:

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

Todos os campos, exceto `name`, `description` e `url`, são opcionais e só são incluídos na saída quando fornecidos.

### Esquema da Organização

Gere dados estruturados `schema.org/Organization` para o site. Normalmente, isso é colocado na página inicial para aparecer no Painel de conhecimento do Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

A função lê `siteConfig` e gera:

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

A matriz `sameAs` é preenchida a partir de `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, blog), com valores vazios filtrados. O `contactPoint` só é adicionado quando um email é configurado.

### Esquema do site

Gere `schema.org/WebSite` com um `SearchAction` para pesquisa de sitelinks:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Saída para a localidade padrão:

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

### Esquema de localização atual

Gere `schema.org/BreadcrumbList` para trilhas de navegação:

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

As tags Hreflang informam aos mecanismos de pesquisa quais versões de idioma de uma página estão disponíveis. O modelo os gera para todas as mais de 20 localidades suportadas.

### Geração de URL

A função `getLocalizedUrl` segue o padrão de prefixo de localidade "conforme necessário":

- A localidade padrão (`en`) não tem prefixo: `https://example.com/about`
- Outras localidades recebem um prefixo: `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Gerando alternativas de Hreflang

A função `generateHreflangAlternates` retorna um objeto compatível com Next.js `Metadata.alternates.languages`:

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

### Uso em `generateMetadata`

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

### Funções de conveniência

Para rotas dinâmicas comuns, funções abreviadas estão disponíveis:

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

## Listagem de metadados (`listing-metadata.ts`)

A função `generateListingMetadata` cria um objeto Next.js `Metadata` completo para listar e indexar páginas:

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

A função gera:

|Campo|Valor|
|-------|-------|
|`title`|`"Ferramentas do desenvolvedor\|Sempre funciona"`|
|`description`|Personalizado ou gerado automaticamente com contagem de itens|
|`keywords`|Palavras-chave separadas por vírgula|
|`openGraph.type`|`"website"`|
|`openGraph.url`|URL canônico com prefixo de localidade|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|URL canônico completo|
|`alternates.languages`|Alternativas Hreflang para todas as localidades|

O `description` é gerado automaticamente quando não fornecido: `"Browse 150 developer tools. Directory of tools and services"`.

### Interface de opções

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

## Renderizando JSON-LD em páginas

Adicione os esquemas gerados à sua página usando uma tag `script`:

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

## Arquivos relacionados

- `lib/seo/schema.ts` - Geradores de esquema JSON-LD
- `lib/seo/hreflang.ts` - Utilitários de tags Hreflang
- `lib/seo/listing-metadata.ts` - Gerador de metadados de página de listagem
- `lib/config/client.ts` - `siteConfig` usado por geradores de esquema
- `lib/constants.ts` - `LOCALES` e `DEFAULT_LOCALE` usados por hreflang
