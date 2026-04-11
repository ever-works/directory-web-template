---
id: plan-expiration
title: Помощни програми за изтичане на плана
sidebar_label: Изтичане на плана
sidebar_position: 8
---

# Помощни програми за изтичане на плана

Модулът `plan-expiration.utils` ( `lib/utils/plan-expiration.utils.ts` ) осигурява централизирана логика за обработка на изтичането на абонаментния план. Той изчислява състоянието на изтичане, гратисни периоди, прозорци за предупреждение и нива на ефективни планове. Тези помощни програми се използват както в бекенда, така и в предния край за последователно поведение.

## Конфигурация

Модулът експортира конфигурационен обект със стойности по подразбиране:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

И двете стойности могат да бъдат заменени за всяко повикване чрез функционални параметри.

## Основни функции

### isPlanExpired

Проверява дали даден абонамент е изтекъл въз основа на крайната му дата, с незадължителен гратисен период:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Внедряване

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

Ключови поведения:
- Връща `false` за `null` или `undefined` крайни дати (планът никога не изтича)
- Връща `false` за невалидни низове с дати
- Приема както `Date` обекти, така и ISO низове за дата
- Гратисният период удължава ефективната дата на изтичане

### getEffectivePlan

Определя действителния план, до който потребителят трябва да има достъп, като се има предвид изтичането и състоянието:

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

#### Внедряване

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

Функцията прилага три проверки в ред:

1. **Безплатен байпас на плана** -- Безплатните планове винаги се връщат такива, каквито са
2. **Явен статус** -- Ако статусът е `"expired"` или `"cancelled"` , потребителят получава БЕЗПЛАТНО
3. **Проверка на дата** -- Ако крайната дата е изтекла, потребителят получава БЕЗПЛАТНО

### getDaysUntilExpiration

Изчислява броя на пълните дни до изтичане на абонамента:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Внедряване

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

Функцията използва `Math.floor` , за да преброи оставащите цели дни. Това означава, че абонамент, изтичащ след 1 час, се връща `0` (изтича днес), а не `1` .

### isInExpirationWarningPeriod

Проверява дали абонаментът е в рамките на прозореца за предупреждение преди изтичане:

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

Функцията връща `true` само когато планът **още не е изтекъл**, но е в рамките на прозореца за предупреждение. Вече изтеклите планове се връщат `false` .

### isInGracePeriod

Проверява дали абонаментът е в гратисен период след изтичане:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

Гратисен период е прозорецът **след** изтичане, където потребителите все още имат ограничен достъп. С `GRACE_PERIOD_DAYS` по подразбиране на `0` , тази функция винаги връща `false` .

### getPlanStatusInfo

Връща изчерпателен обект за състояние, комбиниращ всички проверки на изтичане в едно извикване:

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

#### Върнат тип

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

Полето `canAccessPlanFeatures` е полето за ключово решение: `true` е, когато потребителят все още може да използва платени функции, или защото планът е активен, или защото са в рамките на гратисния период.

### formatExpirationMessage

Генерира четими от човека съобщения за изтичане на срока за показване на потребителския интерфейс:

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

Функцията връща `null` , когато не трябва да се показва съобщение (извън периода на предупреждение и не е изтекъл).

## Модели на използване

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

### Компонент за банер за изтичане

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

### Проверка за достъп до функция

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

## Визуализация на времевата линия

Жизненият цикъл на изтичане преминава през следните състояния:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## Изходни файлове

| Файл | Цел |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | Логика за изтичане на абонамента |
| `lib/constants.ts` | `PaymentPlan` списък с БЕЗПЛАТЕН идентификатор на план |
