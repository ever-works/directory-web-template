---
id: feature-flags
title: Система флагов функций
sidebar_label: Флаги функций
sidebar_position: 9
---

# Система флагов функций

Шаблон Ever Works использует систему флагов функций для корректной обработки отсутствующих зависимостей, особенно доступности базы данных. Функции, зависящие от базы данных, автоматически отключаются, если `DATABASE_URL` не настроено, что позволяет шаблону работать в режиме статического контента.

## Конфигурация

Модуль функциональных флагов, расположенный в позиции `lib/config/feature-flags.ts` , обеспечивает разрешение флагов на стороне сервера.

### Определения флагов

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Логика разрешения

Все текущие флаги зависят от доступности базы данных:

```typescript
function getFeatureFlags(): FeatureFlags {
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

## Серверный API

### getFeatureFlags

Возвращает все флаги как объект:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### isFeatureEnabled

Проверьте один флаг:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### getDisabledFeatures

Возвращает массив имен отключенных функций, полезный для отладки:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFeatures

Возвращает массив имен включенных функций:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### areAllFeaturesEnabled

Быстрая проверка доступности всех функций:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Хуки на стороне клиента

### useFeatureFlag

Проверьте один флаг функции на клиенте:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### useFeatureFlags

Получить все флаги функций:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

Расширенный хук, поддерживающий режим симуляции администратора для тестирования функций:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

Этот хук используется системой избранного для условного включения/выключения функций, находящихся в разработке.

## Примеры интеграции

### Условный рендеринг компонентов

```typescript
function ItemDetailPage({ item }) {
  const flags = getFeatureFlags();

  return (
    <div>
      <ItemDetails item={item} />
      {flags.comments && <CommentsSection itemId={item.id} />}
      {flags.ratings && <RatingWidget itemId={item.id} />}
      {flags.favorites && <FavoriteButton item={item} />}
    </div>
  );
}
```

### Связывание функций на уровне крюка

Многие перехватчики внутренне проверяют флаги функций. Например, `useFavorites` извлекается только тогда, когда включена функция избранного:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Условные маршруты API

Флаги функций также можно проверить в маршрутах API для возврата соответствующих ответов:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

export async function GET() {
  if (!isFeatureEnabled('comments')) {
    return NextResponse.json(
      { error: 'Comments feature is not available' },
      { status: 503 }
    );
  }
  // ... handle request
}
```

## Добавление нового флага функции

1. **Добавьте флаг в интерфейс** в `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Установите логику разрешения** в `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Использовать в компонентах и ​​хуках** через `isFeatureEnabled('newFeature')` или хуки на стороне клиента.

## Философия дизайна

Система флагов функций намеренно проста:
- **Нет зависимости от внешнего сервиса** - Флаги разрешаются из переменных среды.
- **Нет накладных расходов во время выполнения** - Флаги вычисляются один раз для каждого запроса/рендеринга.
- **Мягкая деградация** – при отсутствии базы данных функции, зависящие от БД, отключаются без ошибок.
- **Удобство для разработчиков**. Четкое именование, типы TypeScript и вспомогательные функции.
