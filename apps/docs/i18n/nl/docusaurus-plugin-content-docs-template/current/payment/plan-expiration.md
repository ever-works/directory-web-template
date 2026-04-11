---
id: plan-expiration
title: Planvervaldag Nutsvoorzieningen
sidebar_label: Planvervaldatum
sidebar_position: 8
---

# Planvervaldag Nutsvoorzieningen

De `plan-expiration.utils` -module ( `lib/utils/plan-expiration.utils.ts` ) biedt gecentraliseerde logica voor het afhandelen van het verlopen van abonnementen. Het berekent de vervalstatus, respijtperioden, waarschuwingsvensters en effectieve planniveaus. Deze hulpprogramma's worden zowel in de backend als in de frontend gebruikt voor consistent gedrag.

## Configuratie

De module exporteert een configuratieobject met standaardwaarden:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

Beide waarden kunnen per oproep worden overschreven via functieparameters.

## Kernfuncties

### isPlanVerlopen

Controleert of een abonnement is verlopen op basis van de einddatum, met een optionele respijtperiode:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Implementatie

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

Belangrijkste gedragingen:
- Retourneert `false` voor `null` of `undefined` einddatums (abonnement verloopt nooit)
- Retourneert `false` voor ongeldige datumreeksen
- Accepteert zowel `Date` -objecten als ISO-datumreeksen
- De respijtperiode verlengt de effectieve vervaldatum

### getEffectivePlan

Bepaalt het daadwerkelijke abonnement waartoe een gebruiker toegang moet hebben, rekening houdend met de vervaldatum en status:

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

#### Implementatie

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

De functie past drie controles in de juiste volgorde toe:

1. **Gratis abonnement omzeilen** - Gratis abonnementen worden altijd geretourneerd zoals ze zijn
2. **Expliciete status** -- Als de status `"expired"` of `"cancelled"` is, krijgt de gebruiker GRATIS
3. **Datumcontrole** -- Als de einddatum is verstreken, krijgt de gebruiker GRATIS

### getDaysUntilExpiration

Berekent het aantal volledige dagen totdat een abonnement afloopt:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Implementatie

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

De functie gebruikt `Math.floor` om de resterende dagen te tellen. Dit betekent dat een abonnement dat over 1 uur afloopt `0` retourneert (verloopt vandaag), niet `1` .

### isInExpirationWarningPeriod

Controleert of het abonnement binnen het waarschuwingsvenster valt voordat het verloopt:

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

De functie retourneert alleen `true` als het abonnement **nog niet is verlopen** maar zich binnen het waarschuwingsvenster bevindt. Reeds verlopen abonnementen retourneren `false` .

### isInGracePeriode

Controleert of het abonnement zich in de respijtperiode na de vervaldatum bevindt:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

De respijtperiode is de periode **na** het verlopen waarin gebruikers nog steeds beperkte toegang hebben. Met de standaardwaarde `GRACE_PERIOD_DAYS` van `0` retourneert deze functie altijd `false` .

### getPlanStatusInfo

Retourneert een uitgebreid statusobject dat alle vervalcontroles combineert in één enkele oproep:

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

#### Retourtype

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

Het veld `canAccessPlanFeatures` is het belangrijkste beslissingsveld: het is `true` wanneer de gebruiker nog steeds betaalde functies kan gebruiken, omdat het abonnement actief is of omdat deze zich binnen de respijtperiode bevinden.

### formaatVervalbericht

Genereert voor mensen leesbare vervalberichten voor UI-weergave:

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

De functie retourneert `null` als er geen bericht mag worden weergegeven (buiten de waarschuwingsperiode en niet verlopen).

## Gebruikspatronen

### API-routewacht

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

### Vervalbannercomponent

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

### Functietoegangscontrole

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

## Tijdlijnvisualisatie

De vervallevenscyclus verloopt door deze toestanden:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## Bronbestanden

| Bestand | Doel |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | Logica voor het verlopen van abonnementen |
| `lib/constants.ts` | `PaymentPlan` opsomming met GRATIS abonnementsidentificatie |
