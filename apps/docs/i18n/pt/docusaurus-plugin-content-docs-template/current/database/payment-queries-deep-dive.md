---
id: payment-queries-deep-dive
title: Aprofundamento em consultas de pagamento e assinatura
sidebar_label: Aprofundamento nas consultas de pagamento
sidebar_position: 63
---

# Aprofundamento em consultas de pagamento e assinatura

Referência abrangente para todas as funções de gerenciamento de provedores de pagamento, operações de contas de pagamento, ciclo de vida de assinatura, renovação automática e consulta de faturamento.

## Visão geral

A camada de consulta de pagamento está organizada em dois módulos complementares:

- **`payment.queries.ts`** -- CRUD do provedor de pagamento, gerenciamento de contas de pagamento e orquestração de configuração de contas
- **`subscription.queries.ts`** -- Ciclo de vida da assinatura (criar, atualizar, cancelar, expirar), gerenciamento de plano, rastreamento de histórico, renovação automática e estatísticas de faturamento

## Arquivos de origem

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

Obtém um provedor de pagamento por nome (por exemplo, `'stripe'`, `'lemonsqueezy'`).

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

Cria um novo provedor de pagamento.

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

Desativa um provedor de pagamento definindo `isActive` como `false`.

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

Obtém uma conta de pagamento pelo ID de cliente externo do provedor de pagamento.

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

Atualiza o carimbo de data/hora `lastUsed` em uma conta de pagamento.

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

### Orquestração de contas de pagamento

#### `ensurePaymentAccount`

Garante que exista uma conta de pagamento para um usuário e provedor. Cria o provedor e a conta se eles não existirem ou atualiza `lastUsed` se existirem.

```typescript
async function ensurePaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|----------------|----------|----------|----------------------------------|
|`providerName`|`string`|Sim|Nome do provedor (por exemplo, `'stripe'`)|
|`userId`|`string`|Sim|ID do usuário|
|`customerId`|`string`|Sim|ID do cliente no provedor|
|`accountId`|`string`|Não|ID da conta no provedor|

**Comportamento:**
1. Verifica se existe provedor; cria se não
2. Verifica se existe conta de pagamento para usuário+provedor; atualiza `lastUsed` se encontrado
3. Cria uma nova conta de pagamento se não for encontrada

---

#### `getOrCreatePaymentAccount`

Alias for `ensurePaymentAccount`.

---

#### `setupUserPaymentAccount`

Versão aprimorada do `ensurePaymentAccount` com lógica de atualização de ID do cliente. Se `customerId` tiver sido alterado em uma conta existente, ele atualizará o registro.

```typescript
async function setupUserPaymentAccount(
  providerName: string,
  userId: string,
  customerId: string,
  accountId?: string
): Promise<PaymentAccount>
```

**Comportamento adicional vs `ensurePaymentAccount`:**
- Detecta `customerId` alterado e atualiza o registro existente
- Fornece registro de erros detalhado com rastreamentos de pilha

---

#### `createOrGetPaymentAccount`

Alias for `setupUserPaymentAccount`.

---

## Referência de função: subscription.queries.ts

### Assinatura CRUD

#### `getUserActiveSubscription`

Obtém a assinatura ativa de um usuário.

```typescript
async function getUserActiveSubscription(userId: string): Promise<Subscription | null>
```

**Padrão SQL:**

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

Procura uma assinatura pelo ID de assinatura do provedor externo.

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

Define automaticamente `createdAt` e `updatedAt` para o carimbo de data/hora atual.

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

Atualiza a correspondência de assinatura pelo campo `subscriptionId` do provedor (não pelo ID interno).

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

Cancela uma assinatura imediatamente ou no final do período.

```typescript
async function cancelSubscription(
  subscriptionId: string,
  reason?: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Subscription | null>
```

**Comportamento:**
- Se `cancelAtPeriodEnd` for `true`: mantém o status como `ACTIVE` mas define o sinalizador `cancelAtPeriodEnd`
- Se `cancelAtPeriodEnd` for `false`: define o status para `CANCELLED` imediatamente

---

#### `getSubscriptionWithUser`

Gets a subscription with joined user details.

```typescript
async function getSubscriptionWithUser(
  subscriptionId: string
): Promise<SubscriptionWithUser | null>
```

---

### Gestão do Plano

#### `getUserPlan`

Obtém o plano efetivo do usuário, verificando a expiração.

```typescript
async function getUserPlan(userId: string): Promise<string>
```

**Retorna:** String de ID do plano (o padrão é `PaymentPlan.FREE` se nenhuma assinatura ativa ou expirada)

Usa o utilitário `getEffectivePlan()` para lidar com a lógica de expiração.

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

Verificação booleana da existência de assinatura ativa.

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

Obtém assinaturas que passaram no `endDate`, mas ainda estão marcadas como ativas.

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

### Consultas de renovação automática

#### `getSubscriptionsDueForRenewalReminder`

Obtém assinaturas que precisam de lembretes de renovação (ativas, renovação automática habilitada, expirando em N dias, lembrete ainda não enviado).

```typescript
async function getSubscriptionsDueForRenewalReminder(
  days: number = 7
): Promise<Subscription[]>
```

**Padrão SQL:**

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

Alterna a renovação automática. Também define `cancelAtPeriodEnd` inversamente.

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

### Falha no gerenciamento de pagamentos

#### `incrementFailedPaymentCount`

Incrementa atomicamente o contador de pagamento com falha.

```typescript
async function incrementFailedPaymentCount(
  subscriptionId: string
): Promise<Subscription | null>
```

**Padrão SQL:**

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

Obtém assinaturas que excedem um limite de falha no pagamento.

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

### Histórico de assinaturas

#### `createSubscriptionHistory`

Cria uma entrada no histórico para alterações de assinatura.

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

Função de conveniência para registrar alterações de estado de assinatura com dados estruturados.

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

## Notas de Desempenho

1. **Validação INNER JOIN** -- `getPaymentAccountByUserId` usa INNER JOINs para validar a atividade do provedor e a existência do usuário em uma única consulta.

2. **Atualizações atômicas** -- `incrementFailedPaymentCount` usa `COALESCE` para incremento seguro para nulos. `resetRenewalStateAtomic` redefine vários campos em um único UPDATE.

3. **Configuração de conta idempotente** -- `ensurePaymentAccount` e `setupUserPaymentAccount` lidam com condições de corrida normalmente, criando ou atualizando conforme necessário.

4. **Verificação de expiração** -- `getUserPlan` delega ao utilitário `getEffectivePlan()` que lida com a lógica de expiração com reconhecimento de fuso horário sem consultas adicionais ao banco de dados.

## Exemplos de uso

### Manipulador de webhook para pagamento Stripe

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

### Verificando plano de usuário com vencimento

```typescript
import { getUserPlanWithExpiration } from '@/lib/db/queries';

const plan = await getUserPlanWithExpiration(userId);

if (plan.isExpired) {
  console.log(`Plan ${plan.planId} expired, effective plan: ${plan.effectivePlan}`);
}
```
