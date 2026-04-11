---
id: plan-expiration
title: Planuj narzędzia wygaśnięcia
sidebar_label: Wygaśnięcie planu
sidebar_position: 8
---

# Narzędzia wygaśnięcia planu

Moduł `plan-expiration.utils` ( `lib/utils/plan-expiration.utils.ts` ) zapewnia scentralizowaną logikę obsługi wygaśnięcia planu abonamentowego. Oblicza status wygaśnięcia, okresy karencji, okna ostrzegawcze i efektywne poziomy planu. Te narzędzia są używane zarówno w backendie, jak i frontendzie, aby zapewnić spójne zachowanie.

## Konfiguracja

Moduł eksportuje obiekt konfiguracyjny z wartościami domyślnymi:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

Obie wartości można zastąpić przy każdym wywołaniu za pomocą parametrów funkcji.

## Podstawowe funkcje

### isPlanWygasł

Sprawdza, czy subskrypcja wygasła na podstawie daty jej zakończenia, z opcjonalnym okresem karencji:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Wdrożenie

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

Kluczowe zachowania:
- Zwraca `false` dla `null` lub `undefined` dat końcowych (plan nigdy nie wygasa)
- Zwraca `false` w przypadku nieprawidłowych ciągów dat
- Akceptuje zarówno obiekty `Date` , jak i ciągi dat ISO
- Okres karencji wydłuża obowiązującą datę ważności

### getEffectivePlan

Określa rzeczywisty plan, do którego użytkownik powinien mieć dostęp, biorąc pod uwagę datę wygaśnięcia i status:

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

#### Wdrożenie

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

Funkcja stosuje trzy kontrole w kolejności:

1. **Pominięcie bezpłatnego planu** — Bezpłatne plany są zawsze zwracane w stanie niezmienionym
2. **Status jawny** -- Jeśli status wynosi `"expired"` lub `"cancelled"` , użytkownik otrzymuje ZA DARMO
3. **Sprawdzanie daty** -- Jeśli data końcowa minęła, użytkownik otrzymuje ZA DARMO

### getDaysUntilExpiration

Oblicza liczbę pełnych dni do wygaśnięcia subskrypcji:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Wdrożenie

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

Funkcja wykorzystuje `Math.floor` do zliczania pozostałych pełnych dni. Oznacza to, że subskrypcja wygasająca za 1 godzinę zwraca `0` (wygasa dzisiaj), a nie `1` .

### isInExpirationWarningPeriod

Sprawdza, czy subskrypcja mieści się w oknie ostrzegawczym przed wygaśnięciem:

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

Funkcja zwraca `true` tylko wtedy, gdy plan **jeszcze nie wygasł**, ale znajduje się w oknie ostrzeżenia. Już wygasłe plany zwracają `false` .

### isInGracePeriod

Sprawdza, czy subskrypcja jest w okresie karencji po wygaśnięciu:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

Okres karencji to okres **po** wygaśnięciu, w którym użytkownicy nadal mają ograniczony dostęp. Przy domyślnym `GRACE_PERIOD_DAYS` z `0` , ta funkcja zawsze zwraca `false` .

### pobierzPlanStatusInfo

Zwraca kompleksowy obiekt statusu łączący wszystkie kontrole ważności w jednym wywołaniu:

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

#### Typ zwrotu

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

Pole `canAccessPlanFeatures` jest kluczowym polem decyzyjnym: jest `true` , kiedy użytkownik może nadal korzystać z płatnych funkcji, ponieważ plan jest aktywny lub trwa okres karencji.

### formatWiadomośćWygaśnięcia

Generuje czytelne dla człowieka komunikaty o wygaśnięciu do wyświetlenia w interfejsie użytkownika:

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

Funkcja zwraca wartość `null` , gdy nie powinien być wyświetlany żaden komunikat (poza okresem ostrzeżenia i nie upłynął).

## Wzorce użycia

### Strażnik trasy API

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

### Komponent banera wygaśnięcia

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

### Kontrola dostępu do funkcji

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

## Wizualizacja osi czasu

Cykl życia wygaśnięcia przechodzi przez następujące stany:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## Pliki źródłowe

| Plik | Cel |
|------|-------------|
| `lib/utils/plan-expiration.utils.ts` | Logika wygaśnięcia subskrypcji |
| `lib/constants.ts` | `PaymentPlan` wyliczenie z DARMOWYM identyfikatorem planu |
