---
id: plan-expiration
title: Утилиты по истечении срока действия плана
sidebar_label: Срок действия плана
sidebar_position: 8
---

# Утилиты по истечении срока действия плана

Модуль `plan-expiration.utils` ( `lib/utils/plan-expiration.utils.ts` ) обеспечивает централизованную логику для обработки истечения срока действия плана подписки. Он рассчитывает статус истечения срока действия, льготные периоды, окна предупреждений и эффективные уровни плана. Эти утилиты используются как во внутренней, так и во внешней части для обеспечения единообразного поведения.

## Конфигурация

Модуль экспортирует объект конфигурации со значениями по умолчанию:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

Оба значения могут быть переопределены для каждого вызова с помощью параметров функции.

## Основные функции

### isPlanExpired

Проверяет, истек ли срок действия подписки, на основе даты ее окончания с дополнительным льготным периодом:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Выполнение

```ts
export function isPlanExpired(
  endDate: Date | string | null | undefined,
  gracePeriodDays: number = EXPIRATION_CONFIG.GRACE_PERIOD_DAYS
): boolean {
  if (!endDate) return false;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return false;

  const now = new Date();
  const graceEndDate = new Date(expirationDate);
  graceEndDate.setDate(graceEndDate.getDate() + gracePeriodDays);

  return now > graceEndDate;
}
```

Ключевые модели поведения:
- Возвращает `false` для дат окончания `null` или `undefined` (план никогда не истекает).
- Возвращает `false` для недопустимых строк даты.
- Принимает как объекты `Date` , так и строки даты ISO.
- Льготный период продлевает срок действия.

### getEffectivePlan

Определяет фактический план, к которому пользователь должен иметь доступ, с учетом срока действия и статуса:

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

// Active paid plan
getEffectivePlan('pro', new Date('2099-12-31'));
// "pro"

// Expired paid plan falls back to FREE
getEffectivePlan('pro', new Date('2024-01-01'));
// "free"

// Free plan never expires
getEffectivePlan('free', null);
// "free"

// Explicitly cancelled
getEffectivePlan('pro', new Date('2099-12-31'), 'cancelled');
// "free"
```

#### Выполнение

```ts
export function getEffectivePlan(
  planId: string,
  endDate: Date | string | null | undefined,
  status?: string
): string {
  // Free plan never expires
  if (planId === PaymentPlan.FREE) {
    return PaymentPlan.FREE;
  }

  // Explicit status check
  if (
    status &&
    ['expired', 'cancelled'].includes(status.toLowerCase())
  ) {
    return PaymentPlan.FREE;
  }

  // Date-based expiration check
  if (isPlanExpired(endDate)) {
    return PaymentPlan.FREE;
  }

  return planId;
}
```

Функция применяет три проверки по порядку:

1. **Обход бесплатных планов**. Бесплатные планы всегда возвращаются в том виде, в котором они есть.
2. **Явный статус**. Если статус `"expired"` или `"cancelled"` , пользователь получает БЕСПЛАТНО.
3. **Проверка даты**. Если дата окончания прошла, пользователь получает БЕСПЛАТНО.

### getDaysUntilExpiration

Подсчитывает количество полных дней до истечения срока действия подписки:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Выполнение

```ts
export function getDaysUntilExpiration(
  endDate: Date | string | null | undefined
): number | null {
  if (!endDate) return null;

  const expirationDate =
    typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(expirationDate.getTime())) return null;

  const now = new Date();
  const diffTime = expirationDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}
```

Функция использует `Math.floor` для подсчета оставшихся полных дней. Это означает, что подписка, срок действия которой истекает через 1 час, возвращает `0` (срок действия истекает сегодня), а не `1` .

### isInExpirationWarningPeriod

Проверяет, находится ли подписка в окне предупреждения до истечения срока действия:

```ts
import { isInExpirationWarningPeriod } from '@/lib/utils/plan-expiration.utils';

// Expires in 5 days with default 7-day warning
isInExpirationWarningPeriod(fiveDaysFromNow);   // true

// Expires in 10 days
isInExpirationWarningPeriod(tenDaysFromNow);    // false

// Already expired
isInExpirationWarningPeriod(yesterday);          // false

// Custom warning window
isInExpirationWarningPeriod(threeDaysFromNow, 3); // true
```

Функция возвращает `true` только в том случае, если план **еще не истек**, но находится в пределах окна предупреждения. Уже истекшие планы возвращают `false` .

### isInGracePeriod

Проверяет, находится ли подписка в льготном периоде после истечения срока действия:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

Льготный период – это период **после** истечения срока действия, в течение которого пользователи по-прежнему имеют ограниченный доступ. При значении по умолчанию `GRACE_PERIOD_DAYS` , равном `0` , эта функция всегда возвращает `false` .

### getPlanStatusInfo

Возвращает комплексный объект состояния, объединяющий все проверки срока действия в один вызов:

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

const status = getPlanStatusInfo('pro', new Date('2025-04-01'));
// {
//   planId: 'pro',
//   effectivePlan: 'pro',       // or 'free' if expired
//   isExpired: false,
//   isInWarningPeriod: true,    // if within 7 days
//   isInGracePeriod: false,
//   daysUntilExpiration: 5,
//   expiresAt: Date,
//   canAccessPlanFeatures: true,
// }
```

#### Тип возвращаемого значения

```ts
{
  planId: string;               // Original plan ID
  effectivePlan: string;        // Actual plan after expiration logic
  isExpired: boolean;           // Whether the plan has expired
  isInWarningPeriod: boolean;   // Within warning days before expiration
  isInGracePeriod: boolean;     // In post-expiration grace period
  daysUntilExpiration: number | null;
  expiresAt: Date | null;       // Parsed expiration date
  canAccessPlanFeatures: boolean; // true if not expired OR in grace period
}
```

Поле `canAccessPlanFeatures` является ключевым полем решения: это `true` , когда пользователь все еще может использовать платные функции, либо потому, что план активен, либо потому, что они находятся в пределах льготного периода.

### formatExpirationMessage

Генерирует удобочитаемые сообщения об истечении срока действия для отображения пользовательского интерфейса:

```ts
import { formatExpirationMessage } from '@/lib/utils/plan-expiration.utils';

formatExpirationMessage('Pro', 0, false);
// "Your Pro subscription expires today."

formatExpirationMessage('Pro', 1, false);
// "Your Pro subscription expires tomorrow."

formatExpirationMessage('Pro', 5, false);
// "Your Pro subscription expires in 5 days."

formatExpirationMessage('Pro', -3, true);
// "Your Pro subscription has expired. Please renew to restore full access."

formatExpirationMessage('Pro', 30, false);
// null (outside warning period, no message needed)

formatExpirationMessage('Pro', null, false);
// null (no end date)
```

Функция возвращает `null` , когда сообщение не должно отображаться (вне периода предупреждения и не истекло).

## Шаблоны использования

### API Route Guard

```ts
import { getEffectivePlan } from '@/lib/utils/plan-expiration.utils';

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  const effectivePlan = getEffectivePlan(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  if (effectivePlan === 'free') {
    return Response.json(
      { error: 'This feature requires a paid plan' },
      { status: 403 }
    );
  }

  // Proceed with paid-tier logic
}
```

### Компонент баннера истечения срока действия

```ts
import {
  getPlanStatusInfo,
  formatExpirationMessage,
} from '@/lib/utils/plan-expiration.utils';

function ExpirationBanner({ user }) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate,
    user.subscriptionStatus
  );

  const message = formatExpirationMessage(
    user.planName,
    status.daysUntilExpiration,
    status.isExpired
  );

  if (!message) return null;

  return (
    <div className={status.isExpired ? 'bg-red-100' : 'bg-yellow-100'}>
      <p>{message}</p>
      <a href="/pricing">Renew Now</a>
    </div>
  );
}
```

### Проверка доступа к функциям

```ts
import { getPlanStatusInfo } from '@/lib/utils/plan-expiration.utils';

function useCanAccessFeature(user) {
  const status = getPlanStatusInfo(
    user.planId,
    user.subscriptionEndDate
  );

  return status.canAccessPlanFeatures;
}
```

## Визуализация временной шкалы

Жизненный цикл истечения срока действия проходит через следующие состояния:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## Исходные файлы

| Файл | Цель |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | Логика истечения срока подписки |
| `lib/constants.ts` | `PaymentPlan` перечисление с идентификатором БЕСПЛАТНОГО плана |
