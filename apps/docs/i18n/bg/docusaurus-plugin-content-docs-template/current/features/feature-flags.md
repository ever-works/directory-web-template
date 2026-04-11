---
id: feature-flags
title: Система за флагове на функции
sidebar_label: Флагове за функции
sidebar_position: 9
---

# Система за флагове на функции

Шаблонът Ever Works използва система от флагове за характеристики, за да се справя елегантно с липсващи зависимости, особено с наличността на базата данни. Функциите, които зависят от базата данни, се дезактивират автоматично, когато `DATABASE_URL` не е конфигуриран, което позволява на шаблона да работи в режим на статично съдържание.

## Конфигурация

Разположен на `lib/config/feature-flags.ts` , модулът за флагове на функции осигурява разрешаване на флагове от страна на сървъра.

### Дефиниции на флагове

```typescript
interface FeatureFlags {
  ratings: boolean;         // User ratings and reviews
  comments: boolean;        // User comments on items
  favorites: boolean;       // User favorite items collection
  featuredItems: boolean;   // Admin-managed featured items
  surveys: boolean;         // User surveys and feedback
}
```

### Резолюция Логика

Всички текущи флагове зависят от наличността на базата данни:

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

## API от страната на сървъра

### getFeatureFlags

Връща всички флагове като обект:

```typescript
import { getFeatureFlags } from '@/lib/config/feature-flags';

const flags = getFeatureFlags();
if (flags.comments) {
  // Render comments section
}
```

### isFeatureEnabled

Проверете единичен флаг:

```typescript
import { isFeatureEnabled } from '@/lib/config/feature-flags';

if (isFeatureEnabled('comments')) {
  // Show comments
}
```

### getDisabledFeatures

Връща масив от имена на деактивирани функции, полезни за отстраняване на грешки:

```typescript
import { getDisabledFeatures } from '@/lib/config/feature-flags';

const disabled = getDisabledFeatures();
// e.g., ['ratings', 'comments', 'favorites', 'featuredItems', 'surveys']
```

### getEnabledFeatures

Връща масив от активирани имена на функции:

```typescript
import { getEnabledFeatures } from '@/lib/config/feature-flags';
const enabled = getEnabledFeatures();
```

### areAllFeaturesEnabled

Бърза проверка дали всички функции са налични:

```typescript
import { areAllFeaturesEnabled } from '@/lib/config/feature-flags';

if (areAllFeaturesEnabled()) {
  // Full feature set available
}
```

## Кукички от страна на клиента

### useFeatureFlag

Проверете един флаг за функция на клиента:

```typescript
import { useFeatureFlag } from '@/hooks/use-feature-flag';

const isEnabled = useFeatureFlag('comments');
```

### useFeatureFlags

Вземете всички флагове за функции:

```typescript
import { useFeatureFlags } from '@/hooks/use-feature-flags';

const { flags, isLoading } = useFeatureFlags();
```

### useFeatureFlagsWithSimulation

Разширена кука, която поддържа режим на администраторска симулация за тестване на функции:

```typescript
import { useFeatureFlagsWithSimulation } from '@/hooks/use-feature-flags-with-simulation';

const {
  features,          // FeatureFlags (actual or simulated)
  isSimulating,      // boolean
  toggleSimulation,  // (feature: keyof FeatureFlags) => void
} = useFeatureFlagsWithSimulation();
```

Тази кука се използва от системата за любими за условно активиране/деактивиране на функции в разработка.

## Примери за интегриране

### Рендиране на условни компоненти

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

### Стробиране на функции на ниво кука

Много кукички проверяват флаговете на функциите вътрешно. Например `useFavorites` извлича само когато функцията за любими е активирана:

```typescript
// Inside useFavorites:
const { data: favorites = [] } = useQuery({
  queryKey: ['favorites'],
  queryFn: fetchFavorites,
  enabled: !!user?.id && features.favorites, // Feature flag check
});
```

### Условни API маршрути

Флаговете на функциите могат също да бъдат проверени в маршрутите на API, за да върнат подходящи отговори:

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

## Добавяне на нов флаг за функция

1. **Добавете флага към интерфейса** в `lib/config/feature-flags.ts` :

```typescript
interface FeatureFlags {
  // ... existing flags
  newFeature: boolean;
}
```

2. **Задайте логиката на резолюцията** в `getFeatureFlags()` :

```typescript
return {
  // ... existing flags
  newFeature: isDatabaseConfigured && Boolean(process.env.NEW_FEATURE_ENABLED),
};
```

3. **Използвайте в компоненти и кукички** чрез `isFeatureEnabled('newFeature')` или куките от страна на клиента.

## Философия на дизайна

Системата за флагове на функции е умишлено проста:
- **Няма зависимост от външна услуга** -- Флаговете се разрешават от променливите на средата
- **Няма допълнителни разходи по време на изпълнение** -- Флаговете се изчисляват веднъж на заявка/изобразяване
- **Грациозно влошаване** -- Липсващата база данни деактивира зависимите от DB функции без грешки
- **Удобен за разработчици** -- Ясно именуване, типове TypeScript и помощни функции
