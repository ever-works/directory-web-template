---
id: guards-system-deep-dive
title: "Глубокое погружение в систему охраны"
sidebar_label: "Глубокое погружение в систему охраны"
sidebar_position: 47
---

# Глубокое погружение в систему охраны

## Обзор

Система Guards реализует контроль доступа к функциям на основе плана подписки. Он определяет централизованное сопоставление функций матрицы функций с планами подписки (Бесплатный, Стандартный, Премиум), предоставляет числовые ограничения для каждого плана и предлагает как функциональные, так и классовые API-интерфейсы для проверки и обеспечения доступа. Система поддерживает принудительное исполнение на стороне сервера посредством выдачи защитных мер и использование на стороне клиента через React-совместимые объекты результатов.

## Архитектура

Модуль Guards находится в `lib/guards/` в двух файлах:

- **`lib/guards/plan-features.guard.ts`** — основная реализация, содержащая все определения функций, матрицу доступа, ограничения плана, функции проверки доступа и фабрику защиты.
- **`lib/guards/index.ts`** — Экспорт ствола, который реэкспортирует все из защитного файла.

Система защиты зависит от `PaymentPlan` от `@/lib/constants` для определений типов планов и используется маршрутами API, службами и перехватчиками React для ограничения функций.

```
lib/guards/
  |-- index.ts                  (barrel export)
  |-- plan-features.guard.ts    (core implementation)
      |-- PLAN_LEVELS           (hierarchy: FREE=1, STANDARD=2, PREMIUM=3)
      |-- FEATURES              (feature constants)
      |-- FEATURE_ACCESS        (feature -> plan mapping matrix)
      |-- PLAN_LIMITS           (numeric limits per plan)
      |-- canAccessFeature()    (check function)
      |-- createPlanGuard()     (guard factory)
      |-- createPlanGuardResult() (React hook helper)
      |-- PlanGuardError        (typed error class)
```

## Справочник по API

### Константы

#### `FEATURES`

Объект, содержащий все строковые константы функций:

|Категория|Особенности|
|----------|----------|
|Представление|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Обзор|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Видимость|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Аналитика|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|Поддержка|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|Социальные|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|Другое|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Значения иерархии плана: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

Матрица доступа сопоставляет каждую функцию с ее разрешенными планами. Типы доступа:
- `'all'` -- Все планы имеют доступ
- `PaymentPlan` -- Только этот конкретный план
- `PaymentPlan[]` -- Только перечисленные планы
- `{ minPlan: PaymentPlan }` -- Этот план и выше

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Числовые ограничения на план:

|Лимит|Бесплатно|Стандартный|Премиум|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |неограниченный|
|`max_description_words`| 200 | 500 |неограниченный|
|`max_submissions`| 1 | 10 |неограниченный|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Типы

#### `Feature`

```typescript
type Feature = (typeof FEATURES)[keyof typeof FEATURES];
// Union of all feature string values
```

#### `PlanGuardResult`

```typescript
interface PlanGuardResult {
  canAccess: (feature: Feature) => boolean;
  getLimit: <K extends keyof FeatureLimits>(limitName: K) => FeatureLimits[K];
  isWithinLimit: (limitName: keyof FeatureLimits, value: number) => boolean;
  accessibleFeatures: Feature[];
}
```

### Функции

#### `canAccessFeature(feature: Feature, userPlan: string): boolean`

Проверяет, имеет ли план доступ к функции на основе матрицы доступа.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Возвращает числовой предел для определенного ключа ограничения функции. Возвращает `null` для неограниченного количества.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Проверяет, находится ли значение в пределах лимита плана. Возвращает `true`, если предел равен `null` (неограничен).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Возвращает массив всех функций, доступных по данному плану.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Возвращает самый низкий план, который может получить доступ к функции. Полезно для подсказок по обновлению.

#### `getPlanLevel(plan: string): number`

Возвращает числовой уровень иерархии для плана (0, если неизвестно).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Проверяет, соответствует ли план пользователя требуемому уровню плана или превышает его.

#### `createPlanGuard(userPlan: string)`

Фабричная функция, которая возвращает объект защиты, привязанный к определенному плану пользователя:

```typescript
const guard = createPlanGuard('standard');
guard.canAccess(feature)          // boolean check
guard.requireFeature(feature)     // throws PlanGuardError if denied
guard.getLimit(limitName)         // get numeric limit
guard.isWithinLimit(name, value)  // check within limit
guard.requireWithinLimit(name, v) // throws if exceeded
guard.getAccessibleFeatures()     // all accessible features
guard.getPlan()                   // current plan string
guard.getPlanLevel()              // current plan level number
```

#### `createPlanGuardResult(userPlan: string): PlanGuardResult`

Создает объект результата, подходящий для перехватчиков React, предварительно вычисляя список доступных функций.

### Классы ошибок

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Выдается `requireFeature()`, когда доступ запрещен. Содержит всю информацию, необходимую для отображения запроса на обновление.

## Детали реализации

**Разрешение доступа**: `canAccessFeature()` оценивает тип доступа в следующем порядке: `'all'` -> совпадение строк одного плана -> массив включает проверку -> сравнение иерархии `{ minPlan }`. Неизвестные функции возвращают `false` с предупреждением консоли.

**Сравнение на основе иерархии**: `planMeetsRequirement()` сравнивает числовые уровни с `PLAN_LEVELS`, позволяя объединять функции по «этому плану и выше» без явного перечисления каждого плана.

**Null для неограниченного**: ограничения используют `null` для представления неограниченных значений. `isWithinLimit()` замыкается на `true`, когда предел равен `null`.

**Загрязнение прототипа безопасно**: функциональные ключи берутся из константного объекта `FEATURES` и никогда не извлекаются из пользовательского ввода.

## Конфигурация

Правила доступа к функциям настраиваются путем изменения объектов `FEATURE_ACCESS` и `PLAN_LIMITS` в `plan-features.guard.ts`. Чтобы добавить новую функцию:

1. Добавьте константу в `FEATURES`
2. Добавьте правило доступа к `FEATURE_ACCESS`
3. При желании добавьте числовые ограничения в `PLAN_LIMITS` (если функция имеет ограничения по количеству)

## Примеры использования

```typescript
// Simple feature check in an API route
import { canAccessFeature, FEATURES } from '@/lib/guards';

export async function POST(request: Request) {
  const userPlan = await getUserPlan(session);

  if (!canAccessFeature(FEATURES.UPLOAD_VIDEO, userPlan)) {
    return Response.json(
      { error: 'Video upload requires Premium plan' },
      { status: 403 }
    );
  }
  // ... handle upload
}

// Using the guard factory in a service
import { createPlanGuard, FEATURES } from '@/lib/guards';

async function submitProduct(data: ProductData, userPlan: string) {
  const guard = createPlanGuard(userPlan);

  // This throws PlanGuardError if not allowed
  guard.requireFeature(FEATURES.SUBMIT_PRODUCT);

  // Check numeric limits
  guard.requireWithinLimit('max_images', data.images.length);
  guard.requireWithinLimit('max_description_words', countWords(data.description));

  // Proceed with submission
  return await saveProduct(data);
}

// React hook usage
import { createPlanGuardResult, FEATURES } from '@/lib/guards';

function SubmissionForm({ userPlan }: { userPlan: string }) {
  const guard = createPlanGuardResult(userPlan);
  const imageLimit = guard.getLimit('max_images');

  return (
    <form>
      {guard.canAccess(FEATURES.UPLOAD_VIDEO) && <VideoUploader />}
      <ImageUploader maxImages={imageLimit ?? Infinity} />
      {!guard.canAccess(FEATURES.VERIFIED_BADGE) && (
        <UpgradePrompt feature="Verified Badge" />
      )}
    </form>
  );
}

// Get minimum plan for upgrade messaging
import { getMinimumPlanForFeature, FEATURES } from '@/lib/guards';

const requiredPlan = getMinimumPlanForFeature(FEATURES.ADVANCED_ANALYTICS);
// Returns PaymentPlan.PREMIUM
```

## Лучшие практики

- Всегда используйте константы `FEATURES` вместо необработанных строк, чтобы обеспечить безопасность типов и автодополнение.
- Используйте `createPlanGuard()` с `requireFeature()` в маршрутах и службах API для принудительного применения на стороне сервера, которое вызывает ошибки.
- Используйте `createPlanGuardResult()` в компонентах React для шлюзования пользовательского интерфейса на стороне клиента без исключений.
- При добавлении новых функций начните с добавления константы `FEATURES` и матрицы `FEATURE_ACCESS`, прежде чем писать какую-либо логику вентиля.
- Перехватите `PlanGuardError` на уровне маршрута API и преобразуйте его в ответ 403 с информацией об обновлении (`requiredPlan`).

## Связанные модули

- [Система диспетчера конфигураций](./config-manager-system) — флаги функций для функций, зависящих от базы данных.
- [Query Client System](./query-client-system) — получение данных о подписке, которые передаются в средства защиты плана.
