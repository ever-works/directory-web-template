---
id: feature-config
title: "Конфигурация на функции"
sidebar_label: "Конфиг на функции"
sidebar_position: 3
---

# Конфигурация на функции

Шаблонът използва система от флагове за функции за изящно активиране или деактивиране на функционалността въз основа на системната конфигурация. Това позволява на приложението да работи без база данни (обслужвайки само статично съдържание), докато постепенно активира функции с наличността на инфраструктурата.

## Модул за флагове на функции

Флаговете за функции са дефинирани в `lib/config/feature-flags.ts`.

### Интерфейс FeatureFlags

```ts
interface FeatureFlags {
  /** Функционалност за потребителски оценки и отзиви */
  ratings: boolean;
  /** Коментари на потребители към елементи */
  comments: boolean;
  /** Колекция от любими елементи на потребителя */
  favorites: boolean;
  /** Показване на препоръчани елементи, управлявани от администратор */
  featuredItems: boolean;
  /** Анкети на потребителите и събиране на обратна връзка */
  surveys: boolean;
}
```

### Как се определят флаговете

Всички текущи функции зависят от наличността на база данни. Дадена функция е активирана, когато `DATABASE_URL` е конфигуриран:

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

Тази конструкция позволява на шаблона да обслужва съдържание от Git-базирания CMS без каквато и да е база данни, докато зависещите от база данни интерактивни функции (оценки, коментари, любими) се деактивират автоматично.

### Помощни функции

Модулът предоставя няколко помощни функции:

```ts
// Проверка на единична функция
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Рендиране на компонент за коментари
}

// Получаване на всички активирани функции
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();

// Получаване на всички деактивирани функции (полезно за отстраняване на грешки)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Проверка дали всичко е готово
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Пълната платформа е оперативна');
}
```

### Пълен справочник на API

| Функция | Връща | Описание |
|----------|---------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | Всички флагове като булев обект |
| `isFeatureEnabled(name)` | `boolean` | Проверка на единична функция по име |
| `getEnabledFeatures()` | `string[]` | Масив от имена на активирани функции |
| `getDisabledFeatures()` | `string[]` | Масив от имена на деактивирани функции |
| `areAllFeaturesEnabled()` | `boolean` | True, ако всяка функция е активирана |

## Рендиране, зависещо от функции

### В сървърни компоненти

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

### В API маршрути

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Функцията за коментари не е налична' },
      { status: 503 }
    );
  }
  // Обработка на създаване на коментар...
}
```

## Конфигурация на сайта (siteConfig)

Освен флаговете за функции, шаблонът предоставя обект `siteConfig` в `lib/config.ts` за персонализация на брандиране и метаданни. Всяка стойност може да бъде заменена чрез променливи на средата:

```ts
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Ever Works',
  tagline: process.env.NEXT_PUBLIC_SITE_TAGLINE || 'The Open-Source, AI-Powered Directory Builder',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://demo.ever.works',
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || '/logo-ever-works.svg',
  brandName: process.env.NEXT_PUBLIC_BRAND_NAME || 'Ever Works',
  // ...
} as const;
```

### Персонализация чрез променливи на средата

| Променлива | По подразбиране | Предназначение |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Името на сайта в метаданни и OG изображения |
| `NEXT_PUBLIC_SITE_TAGLINE` | Шаблонен по подразбиране | Слоган на началната страница |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | Пълен URL на сайта (без завършващо наклонена черта) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Път до логото спрямо `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Име на организацията Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Шаблонен по подразбиране | SEO мета описание |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Шаблонни по подразбиране | SEO ключови думи, разделени със запетаи |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | Начален цвят на градиента на OG изображение |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | Краен цвят на градиента на OG изображение |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | Връзка "Създадено с" в подвала |

### Валидация

Функцията `validateSiteConfig()` проверява за липсващи критични за продукция променливи:

```ts
import { validateSiteConfig } from '@/lib/config';

// Връща true, ако всички необходими променливи са зададени, иначе false с предупреждения
const isValid = validateSiteConfig();
```

### Защита

ConfigManager включва защита срещу замърсяване на прототип:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

## Свързани файлове

| Път | Описание |
|------|-------------|
| `lib/config/feature-flags.ts` | Дефиниции на флагове за функции и помощни функции |
| `lib/config.ts` | Безопасен за клиент siteConfig и реекспорт на типове |
| `lib/config-manager.ts` | Четене/запис на YAML конфигурация с Git интеграция |
| `lib/config/index.ts` | Barrel експорт за модула за конфигурация |
| `lib/config/config-service.ts` | Сървърен синглтон ConfigService |
| `lib/config/types.ts` | TypeScript дефиниции на типове за конфигурация |
| `.env.example` | Пълен списък с опции за променливи на средата |
