---
id: seo
title: SEO конфигурация
sidebar_label: SEO
sidebar_position: 8
---

# SEO конфигурация

Шаблонът Ever Works предоставя цялостна SEO поддръжка, включително JSON-LD структурирани данни, hreflang тагове за многоезично съдържание, OpenGraph метаданни, автоматизирани карти на сайта и конфигурация на robots.txt.

## JSON-LD структурирани данни

Разположени на `lib/seo/schema.ts` , помощните програми за схеми генерират структурирани данни на Schema.org за различни типове съдържание.

### Продуктова схема

Използва се на страниците с подробности за артикулите:

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

Генерира:
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

### Организационна схема

Използва се за идентичност на марката в целия сайт на началната страница и страниците за информация.

### Други типове схеми

Модулът предоставя генератори за:
- **WebSite** -- Метаданни на ниво сайт с действие за търсене
- **BreadcrumbList** -- Навигационни пътеки
- **Страница с често задавани въпроси** -- Раздели с често задавани въпроси с двойки въпроси/отговори
- **Списък с артикули** -- Страници със списък на категории и колекции

## Hreflang тагове

Разположена на `lib/seo/hreflang.ts` , помощната програма hreflang генерира алтернативни езикови връзки за търсачките.

### Поддържани локали

Шаблонът поддържа 20+ локализации:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### Генериране на URL

Помощната програма hreflang следва модела на локален префикс "при необходимост":
- Локал по подразбиране ( `en` ) използва основния път: `https://example.com/page` - Други локали използват префиксирани пътища: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Съпоставяне на локал към Hreflang

Всеки локал се съпоставя със своята ISO 639-1 hreflang стойност. Повечето използват един и същ код, но някои изискват специална обработка за регионални варианти.

## Метаданни за списък

Разположен на `lib/seo/listing-metadata.ts` , този модул генерира метаданни за изброяване на страници, включително страници с категории, резултати от търсене и филтрирани изгледи с подходящи шаблони за заглавия, описания и канонични URL адреси.

## OpenGraph и Twitter карти

Шаблонът генерира OpenGraph и Twitter Card метаданни чрез Next.js Metadata API в компонентите на страницата:

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

## Карта на сайта

Разположена на `app/sitemap.ts` , картата на сайта се генерира автоматично с помощта на вградената поддръжка на карта на сайта в Next.js:

- **Статични страници** -- Начало, информация, цени, контакт
- **Динамични страници** -- Всички публикувани елементи, категории, колекции
- **Локализирани URL адреси** -- Всяка страница генерира записи за всички активни локали
- **Приоритет и честота** -- Конфигурирани за тип страница

## Robots.txt

Разположена на `app/robots.ts` , конфигурацията на роботите:

- Разрешава всички роботи по подразбиране
- Сочи към URL адреса на картата на сайта
- По избор блокира администраторски и API маршрути от индексиране
- Може да се конфигурира чрез среда за разлики в постановката/продуцирането

## Най-добри практики

1. **Всяка страница трябва да има уникални метаданни** -- Използвайте `generateMetadata()` в компонентите на страницата
2. **Включете JSON-LD на страниците с подробности** -- продуктова схема за артикули, организация за начална страница
3. **Задайте канонични URL адреси** -- Предотвратете дублиране на съдържание в локализирани версии
4. **Използвайте помощната програма hreflang** -- Гарантира, че търсачките обслужват правилната езикова версия
5. **Поддържайте описанията под 160 знака** -- Оптимално за фрагменти с резултати от търсене
