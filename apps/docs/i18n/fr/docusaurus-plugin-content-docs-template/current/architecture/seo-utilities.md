---
id: seo-utilities
title: Utilitaires de référencement
sidebar_label: Utilitaires de référencement
sidebar_position: 37
---

# Utilitaires de référencement

Le modèle comprend un ensemble d'utilitaires de référencement pour générer des données structurées JSON-LD, des balises hreflang pour les pages multilingues et des objets Next.js `Metadata` pour lister les pages. Ces utilitaires garantissent que les moteurs de recherche indexent et affichent correctement le contenu.

## Structure du fichier

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## Données structurées JSON-LD (`schema.ts`)

### Schéma du produit

Générez des données structurées `schema.org/Product` pour les pages de détails des articles :

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

La sortie JSON-LD générée :

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

Tous les champs, à l'exception de `name`, `description` et `url`, sont facultatifs et ne sont inclus dans la sortie que lorsqu'ils sont fournis.

### Schéma d'organisation

Générez des données structurées `schema.org/Organization` pour le site. Ceci est généralement placé sur la page d'accueil pour apparaître dans le panneau de connaissances de Google :

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

La fonction lit depuis `siteConfig` et génère :

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

Le tableau `sameAs` est rempli à partir de `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, blog), avec des valeurs vides filtrées. Le `contactPoint` n'est ajouté que lorsqu'un e-mail est configuré.

### Schéma du site Web

Générez `schema.org/WebSite` avec un `SearchAction` pour la recherche de liens annexes :

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Résultat pour les paramètres régionaux par défaut :

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

### Schéma du fil d'Ariane

Générez `schema.org/BreadcrumbList` pour le fil d'Ariane de navigation :

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Balises Hreflang (`hreflang.ts`)

Les balises Hreflang indiquent aux moteurs de recherche quelles versions linguistiques d'une page sont disponibles. Le modèle les génère pour plus de 20 paramètres régionaux pris en charge.

### Génération d'URL

La fonction `getLocalizedUrl` suit le modèle de préfixe de paramètres régionaux « selon les besoins » :

- Les paramètres régionaux par défaut (`en`) n'ont pas de préfixe : `https://example.com/about`
- Les autres paramètres régionaux reçoivent un préfixe : `https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Générer des alternatives Hreflang

La fonction `generateHreflangAlternates` renvoie un objet compatible avec Next.js `Metadata.alternates.languages` :

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

### Utilisation dans `generateMetadata`

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

### Fonctions pratiques

Pour les itinéraires dynamiques courants, des fonctions raccourcies sont disponibles :

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

## Liste des métadonnées (`listing-metadata.ts`)

La fonction `generateListingMetadata` crée un objet Next.js `Metadata` complet pour les pages de listage et d'index :

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

La fonction génère :

|Champ|Valeur|
|-------|-------|
|`title`|`"Outils de développement \|Ça marche toujours"|
|`description`|Personnalisé ou généré automatiquement avec le nombre d'articles|
|`keywords`|Mots-clés séparés par des virgules|
|`openGraph.type`|`"website"`|
|`openGraph.url`|URL canonique avec préfixe de paramètres régionaux|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|URL canonique complète|
|`alternates.languages`|Hreflang alternatifs pour tous les paramètres régionaux|

Le `description` est généré automatiquement lorsqu'il n'est pas fourni : `"Browse 150 developer tools. Directory of tools and services"`.

### Interface des options

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

## Rendu de JSON-LD dans les pages

Ajoutez les schémas générés à votre page à l'aide d'une balise `script` :

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

## Fichiers associés

- `lib/seo/schema.ts` - Générateurs de schémas JSON-LD
- `lib/seo/hreflang.ts` - Utilitaires de balises Hreflang
- `lib/seo/listing-metadata.ts` - Générateur de métadonnées de page de listing
- `lib/config/client.ts` - `siteConfig` utilisé par les générateurs de schémas
- `lib/constants.ts` - `LOCALES` et `DEFAULT_LOCALE` utilisés par hreflang
