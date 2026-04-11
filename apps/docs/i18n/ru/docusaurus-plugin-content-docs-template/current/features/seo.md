---
id: seo
title: SEO-конфигурация
sidebar_label: SEO
sidebar_position: 8
---

# SEO-конфигурация

Шаблон Ever Works обеспечивает комплексную поддержку SEO, включая структурированные данные JSON-LD, теги hreflang для многоязычного контента, метаданные OpenGraph, автоматические карты сайта и конфигурацию robots.txt.

## Структурированные данные JSON-LD

Утилиты схемы, расположенные по адресу `lib/seo/schema.ts` , генерируют структурированные данные Schema.org для различных типов контента.

### Схема продукта

Используется на страницах сведений об элементе:

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

Генерирует:
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

### Схема организации

Используется для идентификации бренда на главной странице и страницах «О нас».

### Другие типы схем

В модуле предусмотрены генераторы для:
- **Веб-сайт** – метаданные на уровне сайта с действием поиска.
- **BreadcrumbList** – навигационные цепочки.
- **FAQPage** – разделы часто задаваемых вопросов с парами вопросов и ответов.
- **ItemList** – страницы со списком категорий и коллекций.

## Теги Hreflang

Утилита hreflang, расположенная по адресу `lib/seo/hreflang.ts` , генерирует ссылки на альтернативные языки для поисковых систем.

### Поддерживаемые локали

Шаблон поддерживает более 20 локалей:

```
en | fr | es | de | zh | ar | he | ru | uk | pt
it | ja | ko | nl | pl | tr | vi | th | hi | id | bg
```

### Создание URL-адреса

Утилита hreflang следует шаблону префикса локали «по мере необходимости»:
- Языковой стандарт по умолчанию ( `en` ) использует корневой путь: `https://example.com/page` - В других локалях используются префиксные пути: `https://example.com/fr/page`

```typescript
import { generateHreflangTags } from '@/lib/seo/hreflang';

const alternates = generateHreflangTags('/items/product-slug');
// Returns language alternate links for all configured locales
```

### Сопоставление локали с Hreflang

Каждая локаль соответствует своему значению hreflang ISO 639-1. Большинство из них используют один и тот же код, но некоторые требуют специальной обработки для региональных вариантов.

## Листинг метаданных

Этот модуль, расположенный по адресу `lib/seo/listing-metadata.ts` , генерирует метаданные для страниц списков, включая страницы категорий, результаты поиска и отфильтрованные представления с соответствующими шаблонами заголовков, описаниями и каноническими URL-адресами.

## OpenGraph и Twitter-карты

Шаблон генерирует метаданные OpenGraph и Twitter Card через API метаданных Next.js в компонентах страницы:

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

## Карта сайта

Карта сайта, расположенная по адресу `app/sitemap.ts` , автоматически генерируется с использованием встроенной поддержки карты сайта Next.js:

- **Статические страницы** -- Главная, информация, цены, контакты
- **Динамические страницы** — Все опубликованные элементы, категории, коллекции.
– **Локализованные URL-адреса**. На каждой странице создаются записи для всех активных локалей.
- **Приоритет и частота** – Настраивается для каждого типа страницы.

## Роботы.txt

Конфигурация роботов расположена в позиции `app/robots.ts` :

- По умолчанию разрешает все сканеры
- Указывает на URL-адрес карты сайта.
- При необходимости блокирует индексирование маршрутов администратора и API.
- Настраивается через среду для различий в постановке и производстве.

## Лучшие практики

1. **Каждая страница должна иметь уникальные метаданные**. Используйте `generateMetadata()` в компонентах страницы.
2. **Включить JSON-LD на страницы сведений** – Схема продукта для товаров, Организация для главной страницы.
3. **Установите канонические URL-адреса**. Предотвратите дублирование контента в локализованных версиях.
4. **Используйте утилиту hreflang**. Обеспечивает, чтобы поисковые системы отображали правильную языковую версию.
5. **Описание должно быть не более 160 символов** – оптимально для фрагментов результатов поиска.
