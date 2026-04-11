---
id: plan-expiration
title: Pianificare le utilità a scadenza
sidebar_label: Scadenza del piano
sidebar_position: 8
---

# Utilità di scadenza del piano

Il modulo `plan-expiration.utils` ( `lib/utils/plan-expiration.utils.ts` ) fornisce una logica centralizzata per la gestione della scadenza del piano di abbonamento. Calcola lo stato di scadenza, i periodi di grazia, le finestre di avviso e i livelli effettivi del piano. Queste utilità vengono utilizzate sia nel backend che nel frontend per un comportamento coerente.

##Configurazione

Il modulo esporta un oggetto di configurazione con valori predefiniti:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

Entrambi i valori possono essere sovrascritti per chiamata tramite i parametri di funzione.

## Funzioni principali

### Il piano è scaduto

Controlla se un abbonamento è scaduto in base alla data di fine, con un periodo di grazia facoltativo:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Implementazione

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

Comportamenti chiave:
- Restituisce `false` per le date di fine `null` o `undefined` (il piano non scade mai)
- Restituisce `false` per stringhe di data non valide
- Accetta sia oggetti `Date` che stringhe di date ISO
- Il periodo di grazia estende la data di scadenza effettiva

### getEffectivePlan

Determina il piano effettivo a cui un utente dovrebbe avere accesso, considerando la scadenza e lo stato:

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

#### Implementazione

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

La funzione applica tre controlli in ordine:

1. **Esclusione del piano gratuito** -- I piani gratuiti vengono sempre restituiti così come sono
2. **Stato esplicito** -- Se lo stato è `"expired"` o `"cancelled"` , l'utente ottiene GRATIS
3. **Controllo della data** -- Se la data di fine è trascorsa, l'utente riceve GRATIS

### getDaysUntilExpiration

Calcola il numero di giorni interi fino alla scadenza dell'abbonamento:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Implementazione

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

La funzione utilizza `Math.floor` per contare i giorni interi rimanenti. Ciò significa che un abbonamento con scadenza tra 1 ora restituisce `0` (scade oggi), non `1` .

### èInExpirationWarningPeriod

Controlla se l'abbonamento rientra nella finestra di avviso prima della scadenza:

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

La funzione restituisce `true` solo quando il piano **non è ancora scaduto** ma si trova all'interno della finestra di avviso. I piani già scaduti restituiscono `false` .

### èInGracePeriod

Controlla se l'abbonamento è nel periodo di grazia successivo alla scadenza:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

Il periodo di tolleranza è il periodo **dopo** la scadenza in cui gli utenti hanno ancora accesso limitato. Con il valore predefinito `GRACE_PERIOD_DAYS` di `0` , questa funzione restituisce sempre `false` .

### getPlanStatusInfo

Restituisce un oggetto di stato completo che combina tutti i controlli di scadenza in un'unica chiamata:

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

#### Tipo restituito

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

Il campo `canAccessPlanFeatures` è il campo decisionale chiave: è `true` quando l'utente può ancora utilizzare le funzionalità a pagamento, sia perché il piano è attivo sia perché è nel periodo di grazia.

### formatExpirationMessage

Genera messaggi di scadenza leggibili dall'uomo per la visualizzazione dell'interfaccia utente:

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

La funzione restituisce `null` quando non deve essere visualizzato alcun messaggio (al di fuori del periodo di avviso e non scaduto).

## Modelli di utilizzo

### Protezione percorso API

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

### Componente banner di scadenza

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

### Controllo dell'accesso alle funzionalità

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

## Visualizzazione della sequenza temporale

Il ciclo di vita della scadenza scorre attraverso questi stati:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## File sorgente

| File | Scopo |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | Logica di scadenza dell'abbonamento |
| `lib/constants.ts` | `PaymentPlan` enum con identificatore del piano GRATUITO |
