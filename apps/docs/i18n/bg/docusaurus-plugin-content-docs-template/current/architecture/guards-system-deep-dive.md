---
id: guards-system-deep-dive
title: "Гвардейска система за дълбоко гмуркане"
sidebar_label: "Гвардейска система за дълбоко гмуркане"
sidebar_position: 47
---

# Гвардейска система за дълбоко гмуркане

## Преглед

Системата Guards прилага контрол на достъпа до функции, базиран на абонаментен план. Той дефинира централизирана матрица на функциите, съпоставяща функции към абонаментни планове (безплатен, стандартен, премиум), предоставя числени ограничения за план и предлага функционални и базирани на класове API за проверка и налагане на достъп. Системата поддържа принудително изпълнение от страна на сървъра чрез хвърлящи предпазители и използване от страна на клиента чрез React-съвместими резултатни обекти.

## Архитектура

Модулът за охрана живее в `lib/guards/` с два файла:

- **`lib/guards/plan-features.guard.ts`** -- Основната реализация, съдържаща всички дефиниции на функции, матрица за достъп, ограничения на плана, функции за проверка на достъпа и фабрика за защита.
- **`lib/guards/index.ts`** -- Експортиране на варел, което реекспортира всичко от файла на охраната.

Защитната система зависи от `PaymentPlan` от `@/lib/constants` за дефиниции на тип план и се използва от API маршрути, услуги и куки React за стробиране на функции.

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

## Справка за API

### Константи

#### `FEATURES`

Обект, съдържащ всички константи на низ от функции:

|Категория|Характеристики|
|----------|----------|
|Подчинение|`SUBMIT_PRODUCT`, `EXTENDED_DESCRIPTION`, `UNLIMITED_DESCRIPTION`, `UPLOAD_IMAGES`, `UPLOAD_VIDEO`, `VERIFIED_BADGE`, `SPONSORED_BADGE`|
|Преглед|`PRIORITY_REVIEW`, `INSTANT_REVIEW`|
|Видимост|`SEARCH_VISIBILITY`, `CATEGORY_PLACEMENT`, `SPONSORED_POSITION`, `HOMEPAGE_FEATURED`, `NEWSLETTER_MENTION`|
|Анализ|`VIEW_STATISTICS`, `ADVANCED_ANALYTICS`|
|поддръжка|`EMAIL_SUPPORT`, `PRIORITY_EMAIL_SUPPORT`, `PHONE_SUPPORT`|
|Социални|`SOCIAL_SHARING`, `LEARN_MORE_BUTTON`|
|други|`FREE_MODIFICATIONS`, `UNLIMITED_SUBMISSIONS`|

#### `PLAN_LEVELS: Record<string, number>`

Стойности на йерархията на плана: `FREE = 1`, `STANDARD = 2`, `PREMIUM = 3`.

#### `FEATURE_ACCESS: Record<Feature, FeatureAccess>`

Матрицата за достъп, съпоставяща всяка функция с нейните разрешени планове. Видове достъп:
- `'all'` -- Всички планове имат достъп
- `PaymentPlan` -- Само този конкретен план
- `PaymentPlan[]` -- Само изброени планове
- `{ minPlan: PaymentPlan }` -- Този план и по-горе

#### `PLAN_LIMITS: Record<PaymentPlan, FeatureLimits>`

Числени ограничения за план:

|Лимит|безплатно|Стандартен|Премиум|
|-------|------|----------|---------|
|`max_images`| 1 | 5 |неограничен|
|`max_description_words`| 200 | 500 |неограничен|
|`max_submissions`| 1 | 10 |неограничен|
|`review_days`| 7 | 3 | 1 |
|`free_modification_days`| 0 | 30 | 365 |

### Видове

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

Проверява дали даден план има достъп до функция въз основа на матрицата за достъп.

#### `getFeatureLimit<K>(limitName: K, userPlan: string): FeatureLimits[K]`

Връща числовото ограничение за ключ за ограничение на конкретна функция. Връща `null` за неограничен брой.

#### `isWithinLimit(limitName: keyof FeatureLimits, value: number, userPlan: string): boolean`

Проверява дали стойността е в лимита на плана. Връща `true`, ако ограничението е `null` (неограничено).

#### `getAccessibleFeatures(userPlan: string): Feature[]`

Връща масив от всички функции, достъпни от дадения план.

#### `getMinimumPlanForFeature(feature: Feature): PaymentPlan`

Връща най-ниския план, който има достъп до функция. Полезно за подкани за надграждане.

#### `getPlanLevel(plan: string): number`

Връща числовото йерархично ниво за план (0, ако не е известно).

#### `planMeetsRequirement(userPlan: string, requiredPlan: string): boolean`

Проверява дали планът на потребителя отговаря или надвишава необходимото ниво на план.

#### `createPlanGuard(userPlan: string)`

Фабрична функция, която връща защитен обект, обвързан с конкретен потребителски план:

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

Създава резултатен обект, подходящ за кукички на React, като предварително изчисли списъка с достъпни функции.

### Класове грешки

#### `PlanGuardError`

```typescript
class PlanGuardError extends Error {
  feature: Feature;
  userPlan: string;
  requiredPlan: PaymentPlan;
}
```

Изхвърлено от `requireFeature()`, когато достъпът е отказан. Съдържа цялата информация, необходима за показване на подкана за надстройка.

## Подробности за изпълнението

**Резолюция на достъпа**: `canAccessFeature()` оценява типа на достъпа в ред: `'all'` -> съвпадение на един низ в плана -> проверка на масива -> `{ minPlan }` сравнение на йерархията. Неизвестните функции връщат `false` с предупреждение на конзолата.

**Сравнение на базата на йерархия**: `planMeetsRequirement()` сравнява числените нива от `PLAN_LEVELS`, позволявайки функциите да бъдат ограничени от „този план и по-горе“, без да се изброява изрично всеки план.

**Нула за неограничено**: Ограниченията използват `null` за представяне на неограничени стойности. `isWithinLimit()` прави късо към `true`, когато ограничението е `null`.

**Прототип е защитен от замърсяване**: Ключовете за функции идват от постоянния обект `FEATURES` и никога не се извличат от потребителски вход.

## Конфигурация

Правилата за достъп до функции се конфигурират чрез модифициране на обектите `FEATURE_ACCESS` и `PLAN_LIMITS` в `plan-features.guard.ts`. За да добавите нова функция:

1. Добавете константа към `FEATURES`
2. Добавете правило за достъп до `FEATURE_ACCESS`
3. По желание добавете цифрови ограничения към `PLAN_LIMITS` (ако функцията има количествени ограничения)

## Примери за използване

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

## Най-добри практики

- Винаги използвайте `FEATURES` константи вместо необработени низове, за да получите безопасност на типа и автоматично довършване.
- Използвайте `createPlanGuard()` с `requireFeature()` в API маршрути и услуги за налагане от страна на сървъра, което хвърля грешки.
- Използвайте `createPlanGuardResult()` в компонентите на React за стробиране на потребителския интерфейс от страна на клиента без изключения.
- Когато добавяте нови функции, започнете с добавяне към `FEATURES` константата и `FEATURE_ACCESS` матрицата, преди да напишете каквато и да е стробираща логика.
- Хванете `PlanGuardError` на ниво маршрут на API и го преведете в отговор 403 с информация за надграждане (`requiredPlan`).

## Свързани модули

- [Config Manager System](./config-manager-system) -- Флагове за функции за зависими от база данни функции
- [Клиентска система за заявки](./query-client-system) - Извличане на данни за абонамент, които се подават в защитниците на плана
