---
id: plan-expiration
title: Planablauf-Dienstprogramme
sidebar_label: Planablauf
sidebar_position: 8
---

# Planablauf-Dienstprogramme

Das `plan-expiration.utils` -Modul ( `lib/utils/plan-expiration.utils.ts` ) bietet eine zentrale Logik für die Handhabung des Ablaufs des Abonnementplans. Es berechnet den Ablaufstatus, Kulanzfristen, Warnfenster und effektive Planstufen. Diese Dienstprogramme werden sowohl im Backend als auch im Frontend verwendet, um ein konsistentes Verhalten zu gewährleisten.

## Konfiguration

Das Modul exportiert ein Konfigurationsobjekt mit Standardwerten:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

Beide Werte können für jeden Aufruf über Funktionsparameter überschrieben werden.

## Kernfunktionen

### istPlanExpired

Prüft anhand des Enddatums, ob ein Abonnement abgelaufen ist, mit optionaler Kulanzfrist:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Implementierung

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

Wichtige Verhaltensweisen:
- Gibt `false` für `null` oder `undefined` Enddaten zurück (Plan läuft nie ab)
– Gibt `false` für ungültige Datumszeichenfolgen zurück
- Akzeptiert sowohl `Date` -Objekte als auch ISO-Datumszeichenfolgen
- Die Nachfrist verlängert das effektive Ablaufdatum

### getEffectivePlan

Bestimmt den tatsächlichen Plan, auf den ein Benutzer Zugriff haben sollte, unter Berücksichtigung von Ablauf und Status:

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

#### Implementierung

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

Die Funktion führt drei Prüfungen der Reihe nach durch:

1. **Umgehung kostenloser Pläne** – Kostenlose Pläne werden immer unverändert zurückgegeben
2. **Expliziter Status** – Wenn der Status `"expired"` oder `"cancelled"` ist, erhält der Benutzer KOSTENLOS
3. **Datumsprüfung** – Wenn das Enddatum überschritten ist, erhält der Benutzer KOSTENLOS

### getDaysUntilExpiration

Berechnet die Anzahl der vollen Tage bis zum Ablauf eines Abonnements:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Implementierung

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

Die Funktion verwendet `Math.floor` , um die gesamten verbleibenden Tage zu zählen. Das bedeutet, dass ein Abonnement, das in einer Stunde abläuft, `0` (läuft heute ab) einbringt, nicht `1` .

### isInExpirationWarningPeriod

Überprüft, ob sich das Abonnement innerhalb des Warnfensters vor Ablauf befindet:

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

Die Funktion gibt `true` nur zurück, wenn der Plan **noch nicht abgelaufen** ist, sich aber innerhalb des Warnfensters befindet. Bereits abgelaufene Pläne geben `false` zurück.

### isInGracePeriod

Überprüft, ob sich das Abonnement in der Kulanzfrist nach Ablauf befindet:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

Der Kulanzzeitraum ist das Zeitfenster **nach** Ablauf, in dem Benutzer weiterhin eingeschränkten Zugriff haben. Mit dem Standardwert `GRACE_PERIOD_DAYS` von `0` gibt diese Funktion immer `false` zurück.

### getPlanStatusInfo

Gibt ein umfassendes Statusobjekt zurück, das alle Ablaufprüfungen in einem einzigen Aufruf vereint:

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

#### Rückgabetyp

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

Das Feld `canAccessPlanFeatures` ist das wichtigste Entscheidungsfeld: Es ist `true` , wenn der Benutzer weiterhin kostenpflichtige Funktionen nutzen kann, entweder weil der Plan aktiv ist oder weil sie sich innerhalb der Kulanzfrist befinden.

### formatExpirationMessage

Erzeugt für Menschen lesbare Ablaufmeldungen für die UI-Anzeige:

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

Die Funktion gibt `null` zurück, wenn keine Meldung angezeigt werden soll (außerhalb des Warnzeitraums und nicht abgelaufen).

## Nutzungsmuster

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

### Ablaufbanner-Komponente

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

### Funktionszugriffsprüfung

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

## Timeline-Visualisierung

Der Ablauflebenszyklus durchläuft diese Zustände:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## Quelldateien

| Datei | Zweck |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | Abonnementablauflogik |
| `lib/constants.ts` | `PaymentPlan` Enumeration mit FREE-Plan-ID |
