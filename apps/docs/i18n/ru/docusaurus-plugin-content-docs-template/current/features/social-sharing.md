---
id: social-sharing
title: Социальный обмен
sidebar_label: Социальный обмен
sidebar_position: 22
---

# Социальный обмен

Шаблон предоставляет возможности социального обмена с помощью специального компонента кнопки «Поделиться», создания изображений Open Graph, разметки структурированных данных и утилит SEO-метаданных. Вместе эти функции гарантируют, что общие ссылки обеспечивают расширенный предварительный просмотр на социальных платформах.

## Обзор архитектуры

```
components/item-detail/
  share-button.tsx              -- Share dropdown component

app/
  opengraph-image.tsx           -- Dynamic OG image generation

lib/seo/
  schema.ts                     -- JSON-LD structured data
  listing-metadata.ts           -- Next.js Metadata generation
  hreflang.ts                   -- Hreflang alternate links
```

## Компонент кнопки «Поделиться» `ShareButton` на `components/item-detail/share-button.tsx` предоставляет раскрывающееся меню с опциями обмена для X (Twitter), Facebook, LinkedIn и копирования в буфер обмена:

```tsx
// components/item-detail/share-button.tsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";

export const ShareButton = ({ url, title }: { url: string; title: string }) => {
  const [isCopying, setIsCopying] = useState(false);
  const t = useTranslations("common");

  const handleShare = async (type: string) => {
    try {
      switch (type) {
        case "copy":
          setIsCopying(true);
          await navigator.clipboard.writeText(url);
          await new Promise(resolve => setTimeout(resolve, 500));
          toast.success(t("LINK_COPIED"));
          setIsCopying(false);
          break;
        case "twitter":
          window.open(
            `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
            "_blank"
          );
          break;
        case "facebook":
          window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
        case "linkedin":
          window.open(
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            "_blank"
          );
          break;
      }
    } catch (error) {
      toast.error(t("SHARE_ERROR"));
      setIsCopying(false);
    }
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="...">
          {/* Share icon */}
          <span>{t("SHARE")}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => handleShare("copy")}>
            Copy Link
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("twitter")}>
            X
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("facebook")}>
            Facebook
          </DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => handleShare("linkedin")}>
            LinkedIn
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
```

### Поделиться форматами URL-адресов

| Платформа | Шаблон URL |
|----------|-------------|
| Х (Твиттер) | `https://twitter.com/intent/tweet?url=...&text=...` |
| Фейсбук | `https://www.facebook.com/sharer/sharer.php?u=...` |
| LinkedIn | `https://www.linkedin.com/sharing/share-offsite/?url=...` |
| Копировать ссылку | Использует `navigator.clipboard.writeText()` |

### Особенности пользовательского интерфейса
- Создано на основе **Radix UI DropdownMenu** для доступной навигации с помощью клавиатуры.
- **Состояние загрузки копии**: показывает счетчик во время задержки записи в буфер обмена.
- **Всплывающие уведомления**: обратная связь об успехе/ошибке через `sonner` - **Поддержка темного режима**: все стили включают темные варианты.
- **i18n**: все метки используют `next-intl` переводы.

## Генерация изображений открытого графика

Файл `app/opengraph-image.tsx` генерирует динамические изображения OG с помощью Next.js `ImageResponse` :

```tsx
// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/config';

export const runtime = 'nodejs';
export const alt = `${siteConfig.name} - ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const gradient = `linear-gradient(135deg, ${siteConfig.ogImage.gradientStart} 0%, ${siteConfig.ogImage.gradientEnd} 100%)`;

  return new ImageResponse(
    (
      <div style={{ background: gradient, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '80px' }}>
        <div style={{ fontSize: 96, fontWeight: 'bold', color: 'white' }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 36, color: '#e0e0e0', textAlign: 'center' }}>
          {siteConfig.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
```

Изображение OG автоматически обслуживается по адресу `/opengraph-image.png` и на него ссылаются метаданные Next.js.

## Генерация метаданных SEO

Утилита `lib/seo/listing-metadata.ts` генерирует полные объекты Next.js `Metadata` , включая теги Open Graph и Twitter card:

```tsx
// lib/seo/listing-metadata.ts
export function generateListingMetadata({
  title,
  description,
  path,
  locale,
  itemCount,
  keywords,
  imageUrl,
}: ListingMetadataOptions): Metadata {
  const fullTitle = `${title} | ${siteConfig.name}`;
  const canonicalUrl = `${appUrl}${localePath}${path}`;

  return {
    title: fullTitle,
    description: metaDescription,
    keywords: keywords?.join(', '),
    openGraph: {
      title: fullTitle,
      description: metaDescription,
      type: 'website',
      siteName: siteConfig.name,
      url: canonicalUrl,
      ...(imageUrl && { images: [{ url: imageUrl }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: metaDescription,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: generateHreflangAlternates(path),
    },
  };
}
```

## Структурированные данные (JSON-LD)

Модуль `lib/seo/schema.ts` генерирует структурированные данные Schema.org для расширенных результатов поиска:

### Схема организации

```tsx
export function generateOrganizationSchema() {
  const sameAs = [
    siteConfig.social.github,
    siteConfig.social.x,
    siteConfig.social.linkedin,
    siteConfig.social.facebook,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.brandName,
    url: siteConfig.url,
    logo: `${siteConfig.url}${siteConfig.logo}`,
    sameAs,
  };
}
```

### Схема продукта

```tsx
export function generateProductSchema(input: ProductSchemaInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    url: input.url,
    image: input.image,
    category: input.category,
    brand: input.brandName
      ? { '@type': 'Brand', name: input.brandName }
      : undefined,
  };
}
```

### Схема веб-сайта с действием поиска

```tsx
export function generateWebSiteSchema(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: `${siteConfig.url}${localePrefix}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}${localePrefix}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
```

### Схема хлебных крошек

```tsx
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
```

## Альтернативы Hreflang

Модуль `lib/seo/hreflang.ts` генерирует ссылки на альтернативных языках для международного SEO:

```tsx
import { generateHreflangAlternates } from './hreflang';

// Returns: { 'en': '/path', 'fr': '/fr/path', 'es': '/es/path', ... }
const languages = generateHreflangAlternates('/categories/design');
```

## Использование на страницах сведений об элементе

Кнопка «Поделиться» используется на страницах сведений об элементе рядом с сгенерированными метаданными:

```tsx
// In an item detail page component
<ShareButton
  url={`${siteConfig.url}/items/${item.slug}`}
  title={item.name}
/>
```

## Ссылка на файл

| Файл | Цель |
|------|---------|
| `components/item-detail/share-button.tsx` | Компонент раскрывающегося списка социальных сетей |
| `app/opengraph-image.tsx` | Динамическое создание изображений OG |
| `lib/seo/schema.ts` | Генераторы структурированных данных JSON-LD |
| `lib/seo/listing-metadata.ts` | Next.js Генерация метаданных |
| `lib/seo/hreflang.ts` | Альтернативные ссылки Hreflang |
| `lib/config/client.ts` | Конфигурация сайта (социальные URL-адреса, брендинг) |
