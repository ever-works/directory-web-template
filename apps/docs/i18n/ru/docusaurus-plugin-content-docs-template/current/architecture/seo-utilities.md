---
id: seo-utilities
title: SEO-утилиты
sidebar_label: SEO-утилиты
sidebar_position: 37
---

# SEO-утилиты

Шаблон включает в себя набор утилит SEO для генерации структурированных данных JSON-LD, теги hreflang для многоязычных страниц и объекты Next.js `Metadata` для листинга страниц. Эти утилиты гарантируют, что поисковые системы правильно индексируют и отображают контент.

## Структура файла

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## Структурированные данные JSON-LD (`schema.ts`)

### Схема продукта

Сгенерируйте структурированные данные `schema.org/Product` для страниц сведений об элементе:

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

Сгенерированный вывод JSON-LD:

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

Все поля, кроме `name`, `description` и `url`, являются необязательными и включаются в выходные данные только при их наличии.

### Схема организации

Сгенерируйте `schema.org/Organization` структурированные данные для сайта. Обычно это размещается на главной странице и отображается в панели знаний Google:

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

Функция читает `siteConfig` и генерирует:

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

Массив `sameAs` заполняется из `siteConfig.social` (GitHub, X/Twitter, LinkedIn, Facebook, блог), при этом пустые значения отфильтровываются. `contactPoint` добавляется только при настройке электронной почты.

### Схема веб-сайта

Создайте `schema.org/WebSite` с `SearchAction` для поиска дополнительных ссылок:

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

Вывод для локали по умолчанию:

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

### Хлебная схема

Сгенерируйте `schema.org/BreadcrumbList` для навигации:

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Теги Hreflang (`hreflang.ts`)

Теги Hreflang сообщают поисковым системам, какие языковые версии страницы доступны. Шаблон генерирует их для всех более чем 20 поддерживаемых локалей.

### Создание URL-адреса

Функция `getLocalizedUrl` соответствует шаблону префикса локали «по мере необходимости»:

- Языковой стандарт по умолчанию (`en`) не имеет префикса: `https://example.com/about`
- Другие локали получают префикс: `https://example.com/fr/about`.

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### Генерация альтернатив Hreflang

Функция `generateHreflangAlternates` возвращает объект, совместимый с Next.js `Metadata.alternates.languages`:

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

### Использование в `generateMetadata`

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

### Удобные функции

Для распространенных динамических маршрутов доступны сокращенные функции:

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

## Листинг метаданных (`listing-metadata.ts`)

Функция `generateListingMetadata` создает полный объект Next.js `Metadata` для листинга и индексирования страниц:

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

Функция генерирует:

|Поле|Значение|
|-------|-------|
|`title`|`"Инструменты разработчика \|Всегда работает"`|
|`description`|Пользовательский или автоматически созданный с указанием количества предметов|
|`keywords`|Ключевые слова, разделенные запятыми|
|`openGraph.type`|`"website"`|
|`openGraph.url`|Канонический URL-адрес с префиксом локали|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|Полный канонический URL|
|`alternates.languages`|Альтернативы Hreflang для всех локалей|

`description` генерируется автоматически, если он не указан: `"Browse 150 developer tools. Directory of tools and services"`.

### Интерфейс опций

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

## Рендеринг JSON-LD в Pages

Добавьте сгенерированные схемы на свою страницу с помощью тега `script`:

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

## Связанные файлы

- `lib/seo/schema.ts` - генераторы схем JSON-LD
- `lib/seo/hreflang.ts` — утилиты для тегов Hreflang
- `lib/seo/listing-metadata.ts` - Генератор метаданных страницы листинга
- `lib/config/client.ts` - `siteConfig` используется генераторами схем
- `lib/constants.ts` - `LOCALES` и `DEFAULT_LOCALE` используются hreflang
