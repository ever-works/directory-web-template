---
id: seo-utilities
title: 搜索引擎优化实用程序
sidebar_label: 搜索引擎优化实用程序
sidebar_position: 37
---

# 搜索引擎优化实用程序

该模板包括一组用于生成 JSON-LD 结构化数据的 SEO 实用程序、用于多语言页面的 hreflang 标签以及用于列表页面的 Next.js `Metadata` 对象。这些实用程序可确保搜索引擎正确索引和显示内容。

## 文件结构

```
lib/seo/
  schema.ts             # JSON-LD structured data generators
  hreflang.ts           # Hreflang tag generation for i18n
  listing-metadata.ts   # Next.js Metadata generation for listing pages
```

## JSON-LD 结构化数据 (`schema.ts`)

### 产品架构

为项目详细信息页面生成 `schema.org/Product` 结构化数据：

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

生成的 JSON-LD 输出：

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

除 `name`、`description` 和 `url` 之外的所有字段都是可选的，并且仅在提供时才包含在输出中。

### 组织架构

为站点生成 `schema.org/Organization` 结构化数据。它通常放置在主页上以显示在 Google 的知识面板中：

```ts
import { generateOrganizationSchema } from '@/lib/seo/schema';

const schema = generateOrganizationSchema();
```

该函数从 `siteConfig` 读取并生成：

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

`sameAs` 数组由 `siteConfig.social`（GitHub、X/Twitter、LinkedIn、Facebook、博客）填充，并过滤掉空值。 `contactPoint` 仅在配置电子邮件时添加。

### 网站架构

使用 `SearchAction` 生成 `schema.org/WebSite` 以进行附加链接搜索：

```ts
import { generateWebSiteSchema } from '@/lib/seo/schema';

const schema = generateWebSiteSchema('en');
// For non-default locales:
const frSchema = generateWebSiteSchema('fr');
```

默认语言环境的输出：

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

### 面包屑模式

为导航面包屑生成`schema.org/BreadcrumbList`：

```ts
import { generateBreadcrumbSchema, BreadcrumbItem } from '@/lib/seo/schema';

const items: BreadcrumbItem[] = [
  { name: 'Home', url: 'https://example.com' },
  { name: 'Categories', url: 'https://example.com/categories' },
  { name: 'Developer Tools', url: 'https://example.com/categories/dev-tools' },
];

const schema = generateBreadcrumbSchema(items);
```

## Hreflang 标签 (`hreflang.ts`)

Hreflang 标签告诉搜索引擎页面的哪些语言版本可用。该模板为所有 20 多个受支持的区域设置生成这些内容。

### 网址生成

`getLocalizedUrl` 函数遵循“按需”区域设置前缀模式：

- 默认区域设置 (`en`) 没有前缀：`https://example.com/about`
- 其他语言环境有一个前缀：`https://example.com/fr/about`

```ts
import { getLocalizedUrl } from '@/lib/seo/hreflang';

getLocalizedUrl('/about', 'en');  // => "https://example.com/about"
getLocalizedUrl('/about', 'fr');  // => "https://example.com/fr/about"
getLocalizedUrl('/about', 'de');  // => "https://example.com/de/about"
```

### 生成 Hreflang 替代项

`generateHreflangAlternates` 函数返回与 Next.js `Metadata.alternates.languages` 兼容的对象：

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

### `generateMetadata` 中的用法

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

### 便利功能

对于常见的动态路由，可以使用简写函数：

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

## 列表元数据 (`listing-metadata.ts`)

`generateListingMetadata` 函数为列表和索引页创建一个完整的 Next.js `Metadata` 对象：

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

该函数生成：

|领域|价值|
|-------|-------|
|`title`|`“开发者工具\|曾经有效”`|
|`description`|自定义或自动生成项目计数|
|`keywords`|以逗号分隔的关键字|
|`openGraph.type`|`"website"`|
|`openGraph.url`|带有区域设置前缀的规范 URL|
|`twitter.card`|`"summary_large_image"`|
|`alternates.canonical`|完整规范 URL|
|`alternates.languages`|Hreflang 替代所有语言环境|

如果未提供，`description` 会自动生成：`"Browse 150 developer tools. Directory of tools and services"`。

### 选项界面

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

## 在页面中渲染 JSON-LD

使用 `script` 标签将生成的架构添加到您的页面：

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

## 相关文件

- `lib/seo/schema.ts` - JSON-LD 模式生成器
- `lib/seo/hreflang.ts` - Hreflang 标记实用程序
- `lib/seo/listing-metadata.ts` - 列表页面元数据生成器
- `lib/config/client.ts` - `siteConfig` 由模式生成器使用
- `lib/constants.ts` - `LOCALES` 和 `DEFAULT_LOCALE` 由 hreflang 使用
