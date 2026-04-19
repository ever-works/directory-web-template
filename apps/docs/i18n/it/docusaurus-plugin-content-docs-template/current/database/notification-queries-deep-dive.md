---
id: notification-queries-deep-dive
title: Notifiche e query sulle attività Approfondimento
sidebar_label: Le notifiche interrogano l'approfondimento
sidebar_position: 67
---

# Notifiche e query sulle attività Approfondimento

Riferimento completo per tutte le funzioni di query del database relative alle notifiche, inclusa la gestione dell'iscrizione alla newsletter, la registrazione delle attività e le preferenze dell'utente.

## Panoramica

Il livello di query di notifica gestisce la comunicazione dell'utente e il monitoraggio delle attività:

- **`newsletter.queries.ts`** -- CRUD di iscrizione alla newsletter, flussi di iscrizione/cancellazione e statistiche
- **`activity.queries.ts`** -- Registrazione delle attività per gli accessi degli utenti e monitoraggio dell'ultimo accesso

## File di origine

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

Recupera un'iscrizione alla newsletter tramite indirizzo email.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Descrizione|
|-----------|----------|----------|------------------|
|`email`|`string`|Sì|E-mail dell'abbonato|

**Resi:** Record di abbonamento o `null` se non trovato

**Modello SQL:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Nota:** l'e-mail viene normalizzata (in minuscolo, ritagliata) prima della ricerca.

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

Annulla l'iscrizione di un'e-mail alla newsletter impostando `isActive` su `false` e registrando il timestamp di annullamento dell'iscrizione.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**Modello SQL:**

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

Ottiene le statistiche di iscrizione alla newsletter.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Resi:**
- `totalActive` -- Conteggio degli abbonamenti attualmente attivi
- `recentSubscriptions` -- Conteggio degli abbonamenti negli ultimi 30 giorni

**Modello SQL:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Gestione degli errori:** Restituisce `{ totalActive: 0, recentSubscriptions: 0 }` in caso di errore.

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

Ottiene l'attività di accesso più recente per un utente o un client.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Parametri:**

|Parametro|Digitare|Obbligatorio|Predefinito|Descrizione|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|Sì| --         |ID utente o ID profilo cliente|
|`entityType`|`'user'` \|`'client'`|No|`'client'`|Tipo di entità da interrogare|

**Resi:** `Promise<ActivityLog | null>` -- Ultima attività di accesso o `null` se non è stato trovato alcun accesso

**Modello SQL:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Nota:** `entityType` predefinito è `'client'` (non `'user'`) per compatibilità con le versioni precedenti.

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

## Note sulle prestazioni

1. **Gestione corretta degli errori** -- Tutte le funzioni della newsletter racchiudono le operazioni in blocchi try-catch e restituiscono `null`/valori predefiniti invece di lanciare. Ciò impedisce che gli errori relativi alla newsletter influiscano sul flusso principale dell'applicazione.

2. **Normalizzazione e-mail**: le e-mail vengono costantemente ridotte e tagliate prima dell'archiviazione e della ricerca, evitando abbonamenti duplicati a causa delle differenze tra maiuscole e minuscole.

3. **Query basate su intervalli** -- `getNewsletterStats` utilizza la sintassi PostgreSQL `INTERVAL` per il filtraggio basato sul tempo, che è efficiente con un'indicizzazione corretta su `subscribed_at`.

4. **Supporto per doppia entità** -- La registrazione delle attività supporta sia le entità `user` (amministratore) che `client` (utente finale) con un'unica tabella, utilizzando colonne null per distinguere tra i tipi di entità.

## Esempi di utilizzo

### Flusso di iscrizione alla newsletter

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

### Registrazione dell'attività dell'utente

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Visualizzazione dell'ultimo accesso sulla dashboard

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
