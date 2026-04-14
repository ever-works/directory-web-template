---
id: notification-queries-deep-dive
title: Aprofundamento em notificações e consultas de atividades
sidebar_label: Aprofundamento das consultas de notificação
sidebar_position: 67
---

# Aprofundamento em notificações e consultas de atividades

Referência abrangente para todas as funções de consulta de banco de dados relacionadas a notificações, incluindo gerenciamento de assinatura de boletim informativo, registro de atividades e preferências do usuário.

## Visão geral

A camada de consulta de notificação gerencia a comunicação do usuário e o rastreamento de atividades:

- **`newsletter.queries.ts`** -- CRUD de assinatura de boletim informativo, fluxos de assinatura/cancelamento de assinatura e estatísticas
- **`activity.queries.ts`** -- Registro de atividades para logins de usuários e rastreamento do último login

## Arquivos de origem

```
lib/db/queries/newsletter.queries.ts
lib/db/queries/activity.queries.ts
```

---

## Function Reference: newsletter.queries.ts

### `createNewsletterSubscription`

Creates a new newsletter subscription. Normalizes the email to lowercase before storage.

```typescript
async function createNewsletterSubscription(
  email: string,
  source: string = 'footer'
): Promise<NewsletterSubscription | null>
```

**Parameters:**

| Parameter | Type     | Required | Default    | Description                        |
|-----------|----------|----------|------------|------------------------------------|
| `email`   | `string` | Yes      | --         | Subscriber email                   |
| `source`  | `string` | No       | `'footer'` | Source of subscription (e.g., `'footer'`, `'popup'`, `'api'`) |

**Returns:** `Promise<NewsletterSubscription | null>` -- Created subscription or `null` on error

**SQL Pattern:**

```sql
INSERT INTO newsletter_subscriptions (email, source)
VALUES (?, ?) RETURNING *;
```

**Error Handling:** Catches and logs all errors, returning `null` instead of throwing. This prevents newsletter signup failures from crashing the page.

---

### `getNewsletterSubscriptionByEmail`

Recupera uma assinatura de boletim informativo por endereço de e-mail.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Descrição|
|-----------|----------|----------|------------------|
|`email`|`string`|Sim|E-mail do assinante|

**Retorna:** Registro de assinatura ou `null` se não for encontrado

**Padrão SQL:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Observação:** O e-mail é normalizado (em minúsculas, cortado) antes da pesquisa.

---

### `updateNewsletterSubscription`

Updates specific fields on a newsletter subscription.

```typescript
async function updateNewsletterSubscription(
  email: string,
  updates: Partial<Pick<NewsletterSubscription, 'isActive' | 'unsubscribedAt'>>
): Promise<NewsletterSubscription | null>
```

**Parameters:**

| Parameter | Type     | Required | Description                               |
|-----------|----------|----------|-------------------------------------------|
| `email`   | `string` | Yes      | Subscriber email                          |
| `updates` | `object` | Yes      | Fields to update (`isActive`, `unsubscribedAt`) |

**Returns:** Updated subscription or `null` on error

---

### `unsubscribeFromNewsletter`

Cancela a assinatura de um e-mail do boletim informativo definindo `isActive` como `false` e registrando o carimbo de data e hora de cancelamento.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**Padrão SQL:**

```sql
UPDATE newsletter_subscriptions
SET is_active = false, unsubscribed_at = NOW()
WHERE email = ?
RETURNING *;
```

---

### `resubscribeToNewsletter`

Resubscribes an email by setting `isActive` to `true` and clearing the `unsubscribedAt` timestamp.

```typescript
async function resubscribeToNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL Pattern:**

```sql
UPDATE newsletter_subscriptions
SET is_active = true, unsubscribed_at = NULL
WHERE email = ?
RETURNING *;
```

---

### `getNewsletterStats`

Obtém estatísticas de assinatura de boletins informativos.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Retornos:**
- `totalActive` -- Contagem de assinaturas atualmente ativas
- `recentSubscriptions` -- Contagem de assinaturas nos últimos 30 dias

**Padrão SQL:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Tratamento de erros:** Retorna `{ totalActive: 0, recentSubscriptions: 0 }` em caso de erro.

---

## Function Reference: activity.queries.ts

### `logActivity`

Logs an activity event to the activity logs table.

```typescript
async function logActivity(
  type: ActivityType,
  id?: string,
  entityType: 'user' | 'client' = 'user',
  ipAddress?: string
): Promise<void>
```

**Parameters:**

| Parameter    | Type                     | Required | Default  | Description                           |
|--------------|--------------------------|----------|----------|---------------------------------------|
| `type`       | `ActivityType`           | Yes      | --       | Activity type enum value              |
| `id`         | `string`                 | No       | --       | User ID or Client Profile ID          |
| `entityType` | `'user'` \| `'client'`   | No       | `'user'` | Whether this is a user or client activity |
| `ipAddress`  | `string`                 | No       | --       | IP address of the request             |

**Behavior:**
- If `entityType` is `'user'`: sets `userId` field, `clientId` is `null`
- If `entityType` is `'client'`: sets `clientId` field, `userId` is `null`
- IP address defaults to empty string if not provided

**SQL Pattern:**

```sql
INSERT INTO activity_logs (user_id, client_id, action, ip_address)
VALUES (?, ?, ?, ?);
```

---

### `getLastLoginActivity`

Obtém a atividade de login mais recente de um usuário ou cliente.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Parâmetros:**

|Parâmetro|Tipo|Obrigatório|Padrão|Descrição|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|Sim| --         |ID do usuário ou ID do perfil do cliente|
|`entityType`|`'user'` \|`'client'`|Não|`'client'`|Tipo de entidade a ser consultada|

**Retorna:** `Promise<ActivityLog | null>` -- Última atividade de login ou `null` se nenhum login for encontrado

**Padrão SQL:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Observação:** O padrão `entityType` é `'client'` (não `'user'`) para compatibilidade com versões anteriores.

---

## Internal Helpers

### `normalizeEmail` (newsletter.queries.ts)

Private helper that normalizes email addresses for consistent lookups.

```typescript
function normalizeEmail(email: string): string
// Returns: email.toLowerCase().trim()
```

All newsletter functions normalize emails before database operations.

---

## Notas de Desempenho

1. **Tratamento de erros elegante** – Todas as funções do boletim informativo envolvem operações em blocos try-catch e retornam valores `null`/default em vez de lançar. Isso evita que erros relacionados ao boletim informativo afetem o fluxo principal do aplicativo.

2. **Normalização de e-mail** – Os e-mails são consistentemente colocados em letras minúsculas e cortados antes do armazenamento e da pesquisa, evitando assinaturas duplicadas devido a diferenças de maiúsculas e minúsculas.

3. **Consultas baseadas em intervalo** -- `getNewsletterStats` usa a sintaxe PostgreSQL `INTERVAL` para filtragem baseada em tempo, que é eficiente com indexação adequada em `subscribed_at`.

4. **Suporte a entidades duplas** – O registro de atividades oferece suporte a entidades `user` (administrador) e `client` (usuário final) com uma única tabela, usando colunas nulas para distinguir entre tipos de entidade.

## Exemplos de uso

### Fluxo de assinatura do boletim informativo

```typescript
import {
  getNewsletterSubscriptionByEmail,
  createNewsletterSubscription,
  resubscribeToNewsletter,
} from '@/lib/db/queries';

const email = 'user@example.com';
const existing = await getNewsletterSubscriptionByEmail(email);

if (!existing) {
  // New subscriber
  await createNewsletterSubscription(email, 'footer');
} else if (!existing.isActive) {
  // Previously unsubscribed, resubscribe
  await resubscribeToNewsletter(email);
} else {
  // Already subscribed
  console.log('Already subscribed');
}
```

### Registrando a atividade do usuário

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Mostrando o último login no painel

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
