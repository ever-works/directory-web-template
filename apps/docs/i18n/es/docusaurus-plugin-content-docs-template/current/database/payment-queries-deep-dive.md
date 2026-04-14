---
id: payment-queries-deep-dive
title: Consultas sobre pagos y suscripciones Análisis profundo
sidebar_label: Consultas de pago en profundidad
sidebar_position: 63
---

# Consultas sobre pagos y suscripciones Análisis profundo

Referencia completa para todas las funciones de gestión de proveedores de pagos, operaciones de cuentas de pago, ciclo de vida de suscripción, renovación automática y consulta de facturación.

## Descripción general

La capa de consulta de pagos se organiza en dos módulos complementarios:

- **`payment.queries.ts`** -- Proveedor de pagos CRUD, gestión de cuentas de pago y orquestación de configuración de cuenta
- **`subscription.queries.ts`**: ciclo de vida de la suscripción (creación, actualización, cancelación, caducidad), gestión de planes, seguimiento del historial, renovación automática y estadísticas de facturación.

## Archivos fuente

```
lib/db/queries/payment.queries.ts
lib/db/queries/subscription.queries.ts
```

---

## Function Reference: payment.queries.ts

### Payment Provider Queries

#### `getPaymentProvider`

Gets a payment provider by ID.

```typescript
async function getPaymentProvider(id: string): Promise<OldPaymentProvider | null>
```

**SQL Pattern:**

```sql
SELECT * FROM payment_providers WHERE id = ? LIMIT 1;
```

---

#### `getPaymentProviderByName`

Obtiene un proveedor de pagos por nombre (por ejemplo, `'stripe'`, `'lemonsqueezy'`).

```typescript
async function getPaymentProviderByName(name: string): Promise<OldPaymentProvider | null>
```

---

#### `getActivePaymentProviders`

Gets all active payment providers ordered by name.

```typescript
async function getActivePaymentProviders(): Promise<OldPaymentProvider[]>
```

**SQL Pattern:**

```sql
SELECT * FROM payment_providers WHERE is_active = true ORDER BY name;
```

---

#### `createPaymentProvider`

Crea un nuevo proveedor de pagos.

```typescript
async function createPaymentProvider(data: NewPaymentProvider): Promise<OldPaymentProvider>
```

---

#### `updatePaymentProvider`

Updates a payment provider's fields.

```typescript
async function updatePaymentProvider(
  id: string,
  data: Partial<NewPaymentProvider>
): Promise<OldPaymentProvider | null>
```

---

#### `deactivatePaymentProvider`

Desactiva un proveedor de pagos configurando `isActive` en `false`.

```typescript
async function deactivatePaymentProvider(id: string): Promise<OldPaymentProvider | null>
```

---

### Payment Account Queries

#### `getPaymentAccountByUserId`

Gets a payment account by user ID and provider ID. Validates both the provider and user are active.

```typescript
async function getPaymentAccountByUserId(
  userId: string,
  providerId: string
): Promise<PaymentAccount | null>
```

**SQL Pattern:**

```sql
SELECT payment_accounts.* FROM payment_accounts
INNER JOIN payment_providers ON payment_accounts.provider_id = payment_providers.id
INNER JOIN users ON payment_accounts.user_id = users.id
WHERE payment_accounts.user_id = ?
  AND payment_accounts.provider_id = ?
  AND payment_providers.is_active = true
LIMIT 1;
```

**Performance Notes:** Uses `INNER JOIN` to ensure both the provider is active and the user exists.

---

#### `getPaymentAccountByCustomerId`

Obtiene una cuenta de pago mediante el ID de cliente externo del proveedor de pagos.

```typescript
async function getPaymentAccountByCustomerId(
  customerId: string,
  providerId: string
): Promise<PaymentAccount | null>
```

---

#### `createPaymentAccount`

Creates a new payment account. Automatically sets `lastUsed` to current timestamp.

```typescript
async function createPaymentAccount(data: NewPaymentAccount): Promise<PaymentAccount>
```

---

#### `updatePaymentAccountLastUsed`

Actualiza la marca de tiempo `lastUsed` en una cuenta de pago.

```typescript
async function updatePaymentAccountLastUsed(accountId: string): Promise<void>
```

---

#### `getUserPaymentAccountByProvider`

Gets a user's payment account by provider name (convenience function).

```typescript
async function getUserPaymentAccountByProvider(
  userId: string,
  providerName: string
): Promise<PaymentAccount | null>
```

Internally calls `getPaymentProviderByName` then `getPaymentAccountByUserId`.

---

### Orquestación de cuentas de pago

#### `ensurePaymentAccount`

Garantiza que exista una cuenta de pago para un usuario y proveedor. Crea el proveedor y la cuenta si no existen, o actualiza `lastUsed` si existen.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|si|Nombre del proveedor (por ejemplo, `'stripe'`)|
|`userId`|`string`|si|ID de usuario|
|`customerId`|`string`|si|ID de cliente en el proveedor|
|`accountId`|`string`|No|ID de cuenta en el proveedor|

**Comportamiento:**
1. Comprueba si el proveedor existe; crea si no
2. Comprueba si existe una cuenta de pago para usuario+proveedor; actualiza `lastUsed` si se encuentra
3. Crea una nueva cuenta de pago si no se encuentra

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Versión mejorada de `ensurePaymentAccount` con lógica de actualización de ID de cliente. Si `customerId` ha cambiado en una cuenta existente, actualiza el registro.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Comportamiento adicional frente a `ensurePaymentAccount`:**
- Detecta `customerId` modificado y actualiza el registro existente.
- Proporciona un registro de errores detallado con seguimientos de pila

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Referencia de función: suscripción.queries.ts

### Suscripción CRUD

#### `getUserActiveSubscription`

Obtiene la suscripción activa de un usuario.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**Patrón SQL:**

```sql
SELECT * FROM subscriptions
WHERE user_id = ? AND status = 'active'
LIMIT 1;
```

---

#### `getUserSubscriptions`

Gets all subscriptions for a user, ordered by creation date descending.

```typescript
async function getUserSubscriptions(userId: string): Promise<Subscription[]>
```

---

#### `getSubscriptionByProviderSubscriptionId`

Busca una suscripción por el ID de suscripción del proveedor externo.

```typescript
async function getSubscriptionByProviderSubscriptionId(
  paymentProvider: string,
  subscriptionId: string
): Promise<Subscription | null>
```

---

#### `getSubscriptionByUserIdAndSubscriptionId`

```typescript
async function getSubscriptionByUserIdAndSubscriptionId(
  userId: string,
  subscriptionId: string
): Promise<Subscription | null>
```

---

#### `createSubscription`

```typescript
async function createSubscription(data: NewSubscription): Promise<Subscription>
```

Establece automáticamente `createdAt` y `updatedAt` a la marca de tiempo actual.

---

#### `updateSubscription`

```typescript
async function updateSubscription(
  subscriptionId: string,
  data: Partial<NewSubscription>
): Promise<Subscription | null>
```

---

#### `updateSubscriptionBySubscriptionId`

Actualiza la suscripción que coincide con el campo `subscriptionId` del proveedor (no el ID interno).

```typescript
async function updateSubscriptionBySubscriptionId(
  updateData: Partial<NewSubscription>
): Promise<Subscription | null>
```

---

#### `updateSubscriptionStatus`

Updates subscription status with automatic `cancelledAt` timestamp when status is `CANCELLED`.

```typescript
async function updateSubscriptionStatus(
  subscriptionId: string,
  status: string,
  reason?: string
): Promise<Subscription | null>
```

---

#### `cancelSubscription`

Cancela una suscripción inmediatamente o al final del período.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Comportamiento:**
- Si `cancelAtPeriodEnd` es `true`: mantiene el estado como `ACTIVE` pero establece el indicador `cancelAtPeriodEnd`
- Si `cancelAtPeriodEnd` es `false`: establece el estado en `CANCELLED` inmediatamente

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Gestión de planes

#### `getUserPlan`

Obtiene el plan vigente del usuario, comprobando su vencimiento.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Devoluciones:** Cadena de ID del plan (el valor predeterminado es `PaymentPlan.FREE` si no hay suscripción activa o ha caducado)

Utiliza la utilidad `getEffectivePlan()` para manejar la lógica de vencimiento.

---

#### `getUserPlanWithExpiration`

Gets full plan details including expiration information.

```typescript
async function getUserPlanWithExpiration(userId: string): Promise<{
  planId: string;
  effectivePlan: string;
  isExpired: boolean;
  expiresAt: Date | null;
  status: string | null;
  subscriptionId: string | null;
}>
```

---

#### `hasActiveSubscription`

Comprobación booleana de existencia de suscripción activa.

```typescript
async function hasActiveSubscription(userId: string): Promise<boolean>
```

---

### Expiration Management

#### `getSubscriptionsExpiringSoon`

Gets active subscriptions expiring within N days.

```typescript
async function getSubscriptionsExpiringSoon(days: number = 7): Promise<Subscription[]>
```

**SQL Pattern:**

```sql
SELECT * FROM subscriptions
WHERE status = 'active' AND end_date <= ?
ORDER BY end_date ASC;
```

---

#### `getExpiredActiveSubscriptions`

Obtiene las suscripciones que han superado su `endDate` pero que todavía están marcadas como activas.

```typescript
async function getExpiredActiveSubscriptions(): Promise<Subscription[]>
```

---

#### `updateExpiredSubscriptionsStatus`

Batch updates all expired-but-active subscriptions to `EXPIRED` status.

```typescript
async function updateExpiredSubscriptionsStatus(): Promise<Subscription[]>
```

---

### Consultas de renovación automática

#### `getSubscriptionsDueForRenewalReminder`

Obtiene suscripciones que necesitan recordatorios de renovación (activas, renovación automática habilitada, que vencen en N días, recordatorio aún no enviado).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**Patrón SQL:**

```sql
SELECT * FROM subscriptions
WHERE status = 'active'
  AND auto_renewal = true
  AND renewal_reminder_sent = false
  AND end_date >= NOW()
  AND end_date <= ?
ORDER BY end_date ASC;
```

---

#### `getSubscriptionsToCancel`

Gets subscriptions with auto-renewal disabled whose period has ended.

```typescript
async function getSubscriptionsToCancel(): Promise<Subscription[]>
```

---

#### `setAutoRenewal`

Alterna la renovación automática. También establece `cancelAtPeriodEnd` inversamente.

```typescript
async function setAutoRenewal(
  subscriptionId: string,
  enabled: boolean
): Promise<Subscription | null>
```

---

#### `markRenewalReminderSent` / `resetRenewalReminderSent`

```typescript
async function markRenewalReminderSent(subscriptionId: string): Promise<Subscription | null>
async function resetRenewalReminderSent(subscriptionId: string): Promise<Subscription | null>
```

---

### Gestión de pagos fallida

#### `incrementFailedPaymentCount`

Incrementa atómicamente el contador de pagos fallidos.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**Patrón SQL:**

```sql
UPDATE subscriptions
SET failed_payment_count = COALESCE(failed_payment_count, 0) + 1,
    last_renewal_attempt = NOW()
WHERE id = ?;
```

---

#### `resetFailedPaymentCount`

Resets counter after successful payment.

```typescript
async function resetFailedPaymentCount(subscriptionId: string): Promise<Subscription | null>
```

---

#### `getSubscriptionsWithFailedPayments`

Obtiene suscripciones que superan un umbral de pago fallido.

```typescript
async function getSubscriptionsWithFailedPayments(
  threshold: number = 3
): Promise<Subscription[]>
```

---

#### `resetRenewalStateAtomic`

Atomically resets both `renewalReminderSent` and `failedPaymentCount` in a single UPDATE to ensure data consistency.

```typescript
async function resetRenewalStateAtomic(
  subscriptionId: string
): Promise<Subscription | null>
```

---

### Historial de suscripción

#### `createSubscriptionHistory`

Crea una entrada en el historial para cambios de suscripción.

```typescript
async function createSubscriptionHistory(
  data: NewSubscriptionHistory
): Promise<SubscriptionHistoryType>
```

---

#### `getSubscriptionHistory`

Gets history entries for a subscription, ordered by date descending.

```typescript
async function getSubscriptionHistory(
  subscriptionId: string
): Promise<SubscriptionHistoryType[]>
```

---

#### `logSubscriptionChange`

Función conveniente para registrar cambios en el estado de la suscripción con datos estructurados.

```typescript
async function logSubscriptionChange(
  subscriptionId: string,
  action: string,
  previousStatus?: string,
  newStatus?: string,
  previousPlan?: string,
  newPlan?: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<SubscriptionHistoryType>
```

---

### Statistics

#### `getSubscriptionStats`

Gets subscription statistics including totals and plan distribution.

```typescript
async function getSubscriptionStats(): Promise<{
  total: number;
  active: number;
  cancelled: number;
  planDistribution: Array<{ planId: string; count: number }>;
}>
```

---

## Notas de rendimiento

1. **Validación de INNER JOIN**: `getPaymentAccountByUserId` utiliza INNER JOIN para validar tanto la actividad del proveedor como la existencia del usuario en una sola consulta.

2. **Actualizaciones atómicas** -- `incrementFailedPaymentCount` usa `COALESCE` para incrementos seguros para nulos. `resetRenewalStateAtomic` restablece varios campos en una sola ACTUALIZACIÓN.

3. **Configuración de cuenta idempotente**: `ensurePaymentAccount` y `setupUserPaymentAccount` manejan las condiciones de carrera con elegancia, creando o actualizando según sea necesario.

4. **Comprobación de caducidad**: `getUserPlan` delega en la utilidad `getEffectivePlan()` que maneja la lógica de caducidad basada en la zona horaria sin consultas adicionales a la base de datos.

## Ejemplos de uso

### Controlador de webhook para pagos con Stripe

```typescript
import {
  ensurePaymentAccount,
  createSubscription,
  logSubscriptionChange,
} from '@/lib/db/queries';

// Ensure payment account exists
const account = await ensurePaymentAccount(
  'stripe', userId, stripeCustomerId
);

// Create subscription
const sub = await createSubscription({
  userId,
  planId: 'premium',
  status: 'active',
  paymentProvider: 'stripe',
  subscriptionId: stripeSubId,
  startDate: new Date(),
  endDate: endDate,
});

// Log the change
await logSubscriptionChange(sub.id, 'created', null, 'active', null, 'premium');
```

### Comprobando plan de usuario con vencimiento

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
