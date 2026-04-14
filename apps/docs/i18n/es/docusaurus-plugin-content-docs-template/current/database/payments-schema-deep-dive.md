---
id: payments-schema-deep-dive
title: "Análisis profundo del esquema de pagos y suscripciones"
sidebar_label: "Esquema de pagos"
sidebar_position: 53
---

# Análisis profundo del esquema de pagos y suscripciones

## Descripción general

El módulo de pagos maneja el ciclo de vida completo de la suscripción: proveedores de pago, cuentas de clientes, suscripciones con soporte de prueba, gestión de renovación automática y un registro de auditoría completo del historial de suscripciones. El sistema admite múltiples proveedores de pago (Stripe, Solidgate, LemonSqueezy, Polar).

**Archivo fuente:** `template/lib/db/schema.ts`
**Constantes:** `template/lib/constants/payment.ts`
**Archivo de relaciones:** `template/lib/db/migrations/relations.ts`

---

## Tables in This Module

| Table | Purpose |
|---|---|
| `paymentProviders` | Registry of available payment providers |
| `paymentAccounts` | Links users to their payment provider customer IDs |
| `subscriptions` | Active and historical subscription records |
| `subscriptionHistory` | Audit trail of subscription lifecycle events |

---

## Tabla: `paymentProviders`

Registro de proveedores de pago soportados.

### columnas

|columna|Nombre de base de datos|Tipo|Anulable|Predeterminado|Restricciones|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Clave primaria|
|`name`|`name`|`text`|No|`'stripe'`|Único|
|`isActive`|`is_active`|`boolean`|No|`true`| - |
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|No|`now()`| - |

### Índices

|Nombre|columnas|Tipo|
|---|---|---|
|`paymentProviders_name_unique`|`name`|Único|
|`payment_provider_active_idx`|`isActive`|árbol B|
|`payment_provider_created_at_idx`|`createdAt`|árbol B|

### Proveedores admitidos (Enum)

```typescript
export enum PaymentProvider {
    STRIPE = 'stripe',
    SOLIDGATE = 'solidgate',
    LEMONSQUEEZY = 'lemonsqueezy',
    POLAR = 'polar'
}
```

---

## Table: `paymentAccounts`

Links users to their external payment provider customer accounts.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `userId` | `userId` | `text` | No | - | FK -> `users.id` (CASCADE) |
| `providerId` | `providerId` | `text` | No | - | FK -> `paymentProviders.id` (CASCADE) |
| `customerId` | `customerId` | `text` | No | - | External customer ID |
| `accountId` | `accountId` | `text` | Yes | - | Optional account identifier |
| `lastUsed` | `lastUsed` | `timestamp` | Yes | - | - |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |
| `updatedAt` | `updated_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `user_provider_unique_idx` | `(userId, providerId)` | Unique |
| `customer_provider_unique_idx` | `(customerId, providerId)` | Unique |
| `payment_account_customer_id_idx` | `customerId` | B-tree |
| `payment_account_provider_idx` | `providerId` | B-tree |
| `payment_account_created_at_idx` | `createdAt` | B-tree |

### Key Constraints

- **One account per provider per user:** The `user_provider_unique_idx` ensures a user can only have one customer account per payment provider.
- **Unique customer IDs per provider:** The `customer_provider_unique_idx` ensures no duplicate customer IDs within a provider.

---

## Tabla: `subscriptions`

La tabla de suscripción principal con soporte integral para pruebas, renovación automática, cancelación y facturación de múltiples proveedores.

### columnas

|columna|Nombre de base de datos|Tipo|Anulable|Predeterminado|Restricciones|
|---|---|---|---|---|---|
|`id`|`id`|`text`|No|`crypto.randomUUID()`|Clave primaria|
|`userId`|`userId`|`text`|No| - |FK -> `users.id` (CASCADA)|
|`planId`|`plan_id`|`text`|No|`'free'`|Identificador del plan|
|`status`|`status`|`text`|No|`'pending'`|Estado de suscripción|
|`startDate`|`start_date`|`timestamp`|No|`now()`| - |
|`endDate`|`end_date`|`timestamp`|si| - | - |
|`paymentProvider`|`payment_provider`|`text`|No|`'stripe'`| - |
|`subscriptionId`|`subscription_id`|`text`|si| - |ID de suscripción externa|
|`invoiceId`|`invoice_id`|`text`|si| - |ID de factura externa|
|`amountDue`|`amount_due`|`integer`|si| `0` |En centavos|
|`amountPaid`|`amount_paid`|`integer`|si| `0` |En centavos|
|`priceId`|`price_id`|`text`|si| - |ID de precio externo|
|`customerId`|`customer_id`|`text`|si| - |ID de cliente externo|
|`currency`|`currency`|`text`|si|`'usd'`|código de moneda ISO|
|`amount`|`amount`|`integer`|si| `0` |En centavos|
|`interval`|`interval`|`text`|si|`'month'`|Intervalo de facturación|
|`intervalCount`|`interval_count`|`integer`|si| `1` | - |
|`trialStart`|`trial_start`|`timestamp`|si| - | - |
|`trialEnd`|`trial_end`|`timestamp`|si| - | - |
|`autoRenewal`|`auto_renewal`|`boolean`|si|`true`| - |
|`renewalReminderSent`|`renewal_reminder_sent`|`boolean`|si|`false`| - |
|`lastRenewalAttempt`|`last_renewal_attempt`|`timestamp (tz)`|si| - | - |
|`failedPaymentCount`|`failed_payment_count`|`integer`|si| `0` | - |
|`cancelledAt`|`cancelled_at`|`timestamp`|si| - | - |
|`cancelAtPeriodEnd`|`cancel_at_period_end`|`boolean`|si|`false`| - |
|`cancelReason`|`cancel_reason`|`text`|si| - | - |
|`hostedInvoiceUrl`|`hosted_invoice_url`|`text`|si| - | - |
|`invoicePdf`|`invoice_pdf`|`text`|si| - | - |
|`metadata`|`metadata`|`text`|si| - |cadena JSON|
|`createdAt`|`created_at`|`timestamp`|No|`now()`| - |
|`updatedAt`|`updated_at`|`timestamp`|No|`now()`| - |

### Índices

|Nombre|columnas|Tipo|
|---|---|---|
|`user_subscription_idx`|`userId`|árbol B|
|`subscription_status_idx`|`status`|árbol B|
|`provider_subscription_idx`|`(paymentProvider, subscriptionId)`|Único|
|`subscription_plan_idx`|`planId`|árbol B|
|`subscription_created_at_idx`|`createdAt`|árbol B|

### Verificar restricciones

```sql
-- auto_renewal and cancel_at_period_end cannot both be true
CHECK (NOT (auto_renewal AND cancel_at_period_end))
```

### Enumeración de estado

```typescript
export const SubscriptionStatus = {
    ACTIVE: 'active',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    PENDING: 'pending',
    PAUSED: 'paused'
} as const;
```

### Enumeración del plan

```typescript
export enum PaymentPlan {
    FREE = 'free',
    STANDARD = 'standard',
    PREMIUM = 'premium'
}
```

### Tipos de mecanografiado

```typescript
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionWithUser = Subscription & {
    user: typeof users.$inferSelect;
};
```

---

## Table: `subscriptionHistory`

Immutable audit trail of every subscription lifecycle event.

### Columns

| Column | DB Name | Type | Nullable | Default | Constraints |
|---|---|---|---|---|---|
| `id` | `id` | `text` | No | `crypto.randomUUID()` | Primary Key |
| `subscriptionId` | `subscription_id` | `text` | No | - | FK -> `subscriptions.id` (CASCADE) |
| `action` | `action` | `text` | No | - | Event description |
| `previousStatus` | `previous_status` | `text` | Yes | - | Status before change |
| `newStatus` | `new_status` | `text` | Yes | - | Status after change |
| `previousPlan` | `previous_plan` | `text` | Yes | - | Plan before change |
| `newPlan` | `new_plan` | `text` | Yes | - | Plan after change |
| `reason` | `reason` | `text` | Yes | - | - |
| `metadata` | `metadata` | `text` | Yes | - | JSON string |
| `createdAt` | `created_at` | `timestamp` | No | `now()` | - |

### Indexes

| Name | Columns | Type |
|---|---|---|
| `subscription_history_idx` | `subscriptionId` | B-tree |
| `subscription_action_idx` | `action` | B-tree |
| `subscription_history_created_at_idx` | `createdAt` | B-tree |

### TypeScript Types

```typescript
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type NewSubscriptionHistory = typeof subscriptionHistory.$inferInsert;
```

---

## Diagrama de relaciones

```mermaid
erDiagram
    users ||--o{ paymentAccounts : "has many"
    users ||--o{ subscriptions : "has many"
    paymentProviders ||--o{ paymentAccounts : "has many"
    subscriptions ||--o{ subscriptionHistory : "has many"

    paymentProviders {
        text id PK
        text name UK
        boolean is_active
    }

    paymentAccounts {
        text id PK
        text userId FK
        text providerId FK
        text customerId
    }

    subscriptions {
        text id PK
        text userId FK
        text plan_id
        text status
        text payment_provider
        text subscription_id
        integer amount
        text currency
        boolean auto_renewal
        timestamp start_date
        timestamp end_date
    }

    subscriptionHistory {
        text id PK
        text subscription_id FK
        text action
        text previous_status
        text new_status
        timestamp created_at
    }
```

---

## Subscription Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending : User signs up
    pending --> active : Payment confirmed
    active --> paused : User pauses
    paused --> active : User resumes
    active --> cancelled : User cancels
    active --> expired : Period ends (no renewal)
    cancelled --> [*]
    expired --> [*]
    pending --> cancelled : Payment fails
```

---

## Ejemplos de consultas

### Obtener suscripción activa para un usuario

```typescript
import { db } from '@/lib/db/drizzle';
import { subscriptions } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

const activeSub = await db
    .select()
    .from(subscriptions)
    .where(
        and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.status, 'active')
        )
    )
    .limit(1);
```

### Crear una nueva suscripción

```typescript
await db.insert(subscriptions).values({
    userId,
    planId: 'standard',
    status: 'active',
    paymentProvider: 'stripe',
    subscriptionId: stripeSubscription.id,
    customerId: stripeCustomer.id,
    priceId: stripePriceId,
    amount: 1999, // $19.99 in cents
    currency: 'usd',
    interval: 'month',
});
```

### Registrar un cambio de suscripción

```typescript
await db.insert(subscriptionHistory).values({
    subscriptionId: sub.id,
    action: 'plan_upgrade',
    previousStatus: 'active',
    newStatus: 'active',
    previousPlan: 'free',
    newPlan: 'standard',
    reason: 'User upgraded via billing page',
});
```

### Encuentre una cuenta de pago por ID de cliente de Stripe

```typescript
import { paymentAccounts } from '@/lib/db/schema';

const account = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.customerId, stripeCustomerId))
    .limit(1);
```
