---
id: plan-expiration
title: Utilidades de vencimiento del plan
sidebar_label: Vencimiento del plan
sidebar_position: 8
---

# Plan de Vencimiento de Utilidades

El módulo `plan-expiration.utils` ( `lib/utils/plan-expiration.utils.ts` ) proporciona una lógica centralizada para manejar el vencimiento del plan de suscripción. Calcula el estado de vencimiento, los períodos de gracia, las ventanas de advertencia y los niveles efectivos del plan. Estas utilidades se utilizan tanto en el backend como en el frontend para lograr un comportamiento coherente.

## Configuración

El módulo exporta un objeto de configuración con valores predeterminados:

```ts
export const EXPIRATION_CONFIG = {
  /** Days before expiration to show warning */
  WARNING_DAYS: 7,
  /** Days of grace period after expiration */
  GRACE_PERIOD_DAYS: 0,
} as const;
```

Ambos valores se pueden anular por llamada a través de parámetros de función.

## Funciones principales

### el plan está vencido

Comprueba si una suscripción ha caducado según su fecha de finalización, con un período de gracia opcional:

```ts
import { isPlanExpired } from '@/lib/utils/plan-expiration.utils';

// Basic expiration check
isPlanExpired(new Date('2024-01-01')); // true (past date)
isPlanExpired(new Date('2099-12-31')); // false (future date)
isPlanExpired(null);                   // false (no end date)

// With grace period
isPlanExpired(new Date('2024-12-31'), 30); // May still be false if within 30-day grace
```

#### Implementación

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

Comportamientos clave:
- Devuelve `false` para `null` o `undefined` fechas de finalización (el plan nunca caduca)
- Devuelve `false` para cadenas de fecha no válidas
- Acepta tanto objetos `Date` como cadenas de fecha ISO
- El período de gracia extiende la fecha de vencimiento efectiva

### obtener un plan efectivo

Determina el plan real al que un usuario debe tener acceso, considerando el vencimiento y el estado:

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

#### Implementación

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

La función aplica tres comprobaciones en orden:

1. **Omisión del plan gratuito**: los planes gratuitos siempre se devuelven tal cual
2. **Estado explícito**: si el estado es `"expired"` o `"cancelled"` , el usuario obtiene GRATIS
3. **Verificación de fecha**: si la fecha de finalización pasó, el usuario obtiene GRATIS

### obtener días hasta el vencimiento

Calcula el número de días completos hasta que caduque una suscripción:

```ts
import { getDaysUntilExpiration } from '@/lib/utils/plan-expiration.utils';

getDaysUntilExpiration(new Date('2099-12-31'));  // Large positive number
getDaysUntilExpiration(new Date('2024-01-01'));  // Negative number (already expired)
getDaysUntilExpiration(null);                    // null (no end date)
```

#### Implementación

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

La función utiliza `Math.floor` para contar los días completos restantes. Esto significa que una suscripción que vence en 1 hora devuelve `0` (expira hoy), no `1` .

### está en período de advertencia de expiración

Comprueba si la suscripción está dentro de la ventana de advertencia antes de su vencimiento:

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

La función devuelve `true` solo cuando el plan **aún no ha caducado** pero está dentro de la ventana de advertencia. Los planes ya vencidos devuelven `false` .

### está en período de gracia

Comprueba si la suscripción se encuentra en el período de gracia posterior al vencimiento:

```ts
import { isInGracePeriod } from '@/lib/utils/plan-expiration.utils';

// Plan expired 2 days ago, 7-day grace period
isInGracePeriod(twoDaysAgo, 7);  // true

// Plan expired 10 days ago, 7-day grace period
isInGracePeriod(tenDaysAgo, 7);  // false

// No grace period configured (default)
isInGracePeriod(yesterday);       // false (grace period is 0)
```

El período de gracia es la ventana **después** del vencimiento en la que los usuarios aún tienen acceso limitado. Con el valor predeterminado `GRACE_PERIOD_DAYS` de `0` , esta función siempre devuelve `false` .

### obtener información del estado del plan

Devuelve un objeto de estado completo que combina todas las comprobaciones de vencimiento en una sola llamada:

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

#### Tipo de devolución

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

El campo `canAccessPlanFeatures` es el campo de decisión clave: es `true` cuando el usuario aún puede utilizar funciones pagas, ya sea porque el plan está activo o porque está dentro del período de gracia.

### formatoMensaje de caducidad

Genera mensajes de vencimiento legibles por humanos para la visualización de la interfaz de usuario:

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

La función devuelve `null` cuando no se debe mostrar ningún mensaje (fuera del período de advertencia y no vencido).

## Patrones de uso

### Guardia de ruta API

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

### Componente de banner de vencimiento

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

### Verificación de acceso a funciones

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

## Visualización de la línea de tiempo

El ciclo de vida de vencimiento fluye a través de estos estados:

```
Active -> Warning Period -> Expired -> Grace Period -> Fully Expired
  |          |                |            |               |
  |     (7 days before)  (end date)  (grace days)   (grace ended)
  |          |                |            |               |
  | canAccess=true    canAccess=true  canAccess=true  canAccess=false
  | warning=false     warning=true    expired=true    expired=true
  | expired=false     expired=false   grace=true      grace=false
```

## Archivos fuente

| Archivo | Propósito |
|------|---------|
| `lib/utils/plan-expiration.utils.ts` | Lógica de vencimiento de la suscripción |
| `lib/constants.ts` | enumeración `PaymentPlan` con identificador de plan GRATUITO |
