---
id: feature-config
title: "Конфигурация функций"
sidebar_label: "Конфигурация функций"
sidebar_position: 3
---

# Конфигурация функций

Шаблон использует систему флагов функций для корректного включения или отключения функциональности в зависимости от системной конфигурации. Это позволяет приложению работать без базы данных (обслуживая только статический контент), постепенно включая функции по мере доступности инфраструктуры.

## Модуль флагов функций

Флаги функций определены в `lib/config/feature-flags.ts`.

### Интерфейс FeatureFlags

```ts
interface FeatureFlags {
  /** Функциональность пользовательских рейтингов и отзывов */
  ratings: boolean;
  /** Комментарии пользователей к элементам */
  comments: boolean;
  /** Коллекция избранных элементов пользователя */
  favorites: boolean;
  /** Отображение рекомендуемых элементов, управляемых администратором */
  featuredItems: boolean;
  /** Опросы пользователей и сбор обратной связи */
  surveys: boolean;
}
```

### Как определяются флаги

Все текущие функции зависят от доступности базы данных. Функция включена, когда задан `DATABASE_URL`:

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

Эта конструкция позволяет шаблону обслуживать контент из Git-based CMS без какой-либо базы данных, при этом зависящие от базы данных интерактивные функции (рейтинги, комментарии, избранное) отключаются автоматически.

### Вспомогательные функции

Модуль предоставляет несколько вспомогательных функций:

```ts
// Проверка одной функции
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Рендер компонента комментариев
}

// Получение всех включённых функций
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
// например, ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']

// Получение всех отключённых функций (полезно для отладки)
import { getDisabledFeatures } from '@/lib/config/feature-flags';
const disabled = getDisabledFeatures();

// Проверка готовности всего
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';
if (areAllFeaturesEnabled()) {
  console.log('Платформа полностью работоспособна');
}
```

### Полный справочник API

| Функция | Возвращает | Описание |
|----------|---------|-------------|
| `getFeatureFlags()` | `FeatureFlags` | Все флаги как булев объект |
| `isFeatureEnabled(name)` | `boolean` | Проверка одной функции по имени |
| `getEnabledFeatures()` | `string[]` | Массив имён включённых функций |
| `getDisabledFeatures()` | `string[]` | Массив имён отключённых функций |
| `areAllFeaturesEnabled()` | `boolean` | True, если каждая функция включена |

## Рендеринг, зависящий от функций

### В серверных компонентах

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

### В маршрутах API

```ts
import { isFeatureEnabled } from '@/lib/config/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Функция комментариев недоступна' },
      { status: 503 }
    );
  }
  // Обработка создания комментария...
}
```

## Конфигурация сайта (siteConfig)

Помимо флагов функций, шаблон предоставляет объект `siteConfig` в `lib/config.ts` для настройки брендинга и метаданных. Каждое значение может быть переопределено через переменные окружения:

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

### Настройка через переменные окружения

| Переменная | По умолчанию | Назначение |
|----------|---------|---------|
| `NEXT_PUBLIC_SITE_NAME` | `'Ever Works'` | Название сайта в метаданных и OG-изображениях |
| `NEXT_PUBLIC_SITE_TAGLINE` | Шаблонный по умолчанию | Слоган главной страницы |
| `NEXT_PUBLIC_APP_URL` | `'https://demo.ever.works'` | Полный URL сайта (без завершающего слеша) |
| `NEXT_PUBLIC_SITE_LOGO` | `'/logo-ever-works.svg'` | Путь к логотипу относительно `/public` |
| `NEXT_PUBLIC_BRAND_NAME` | `'Ever Works'` | Имя организации Schema.org |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Шаблонный по умолчанию | SEO мета-описание |
| `NEXT_PUBLIC_SITE_KEYWORDS` | Шаблонные по умолчанию | SEO ключевые слова через запятую |
| `NEXT_PUBLIC_OG_GRADIENT_START` | `'#667eea'` | Начальный цвет градиента OG-изображения |
| `NEXT_PUBLIC_OG_GRADIENT_END` | `'#764ba2'` | Конечный цвет градиента OG-изображения |
| `NEXT_PUBLIC_SOCIAL_GITHUB` | URL Ever Works | Ссылка на профиль GitHub |
| `NEXT_PUBLIC_SOCIAL_X` | URL Ever Works | Ссылка на профиль X (Twitter) |
| `NEXT_PUBLIC_ATTRIBUTION_URL` | `'https://ever.works'` | Ссылка «Создано с помощью» в подвале |

### Валидация

Функция `validateSiteConfig()` проверяет отсутствующие критически важные для продакшена переменные:

```ts
import { validateSiteConfig } from '@/lib/config';

// Возвращает true, если все обязательные переменные заданы, иначе false с предупреждениями
const isValid = validateSiteConfig();
```

Предупреждения выводятся при отсутствии `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` и `NEXT_PUBLIC_SITE_NAME`.

## ConfigManager (Конфигурация YAML)

Класс `ConfigManager` в `lib/config-manager.ts` управляет файлом `config.yml` из Git-based CMS репозитория. Он обрабатывает чтение, запись и фиксацию изменений конфигурации.

### Чтение конфигурации

```ts
import { configManager } from '@/lib/config-manager';

// Получение всей конфигурации
const config = configManager.getConfig();

// Получение конкретного ключа
const pagination = configManager.getPaginationConfig();
// Возвращает: { type: 'standard' | 'infinite', itemsPerPage: 12 }

// Получение вложенного значения
const value = configManager.getNestedValue('pagination.type');
```

### Запись конфигурации

Все записи автоматически фиксируются и отправляются в Git-репозиторий:

```ts
// Обновление пагинации
await configManager.updatePagination('infinite', 24);

// Обновление любого ключа верхнего уровня
await configManager.updateKey('pagination', { type: 'standard', itemsPerPage: 20 });

// Обновление вложенного ключа
await configManager.updateNestedKey('headerSettings.sticky', true);
```

### Интеграция с Git

ConfigManager автоматически:
1. Записывает файл YAML в каталог контента
2. Ставит в очередь Git-коммит с описательным сообщением
3. Отправляет в настроенный репозиторий GitHub
4. Сериализует Git-операции для предотвращения конфликтов конкурентной записи

### Безопасность

ConfigManager включает защиту от загрязнения прототипа:

```ts
private isPrototypePollutingKey(key: string): boolean {
  return key === '__proto__' || key === 'constructor' || key === 'prototype';
}
```

Попытки обновить ключи `__proto__`, `constructor` или `prototype` молча отклоняются.

## Связанные файлы

| Путь | Описание |
|------|-------------|
| `lib/config/feature-flags.ts` | Определения флагов функций и вспомогательные функции |
| `lib/config.ts` | Безопасный для клиента siteConfig и реэкспорт типов |
| `lib/config-manager.ts` | Чтение/запись YAML конфигурации с интеграцией Git |
| `lib/config/index.ts` | Barrel-экспорт для модуля конфигурации |
| `lib/config/config-service.ts` | Серверный синглтон ConfigService |
| `lib/config/types.ts` | TypeScript определения типов для конфигурации |
| `.env.example` | Полный список параметров переменных окружения |
