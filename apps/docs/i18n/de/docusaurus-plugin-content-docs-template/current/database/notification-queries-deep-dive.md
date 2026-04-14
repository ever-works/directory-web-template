---
id: notification-queries-deep-dive
title: Detaillierte Informationen zu Benachrichtigungs- und Aktivitätsabfragen
sidebar_label: Benachrichtigungsabfragen im Detail
sidebar_position: 67
---

# Detaillierte Informationen zu Benachrichtigungs- und Aktivitätsabfragen

Umfassende Referenz für alle benachrichtigungsbezogenen Datenbankabfragefunktionen, einschließlich Newsletter-Abonnementverwaltung, Aktivitätsprotokollierung und Benutzereinstellungen.

## Übersicht

Die Benachrichtigungsabfrageschicht verwaltet die Benutzerkommunikation und Aktivitätsverfolgung:

- **`newsletter.queries.ts`** – Newsletter-Abonnement-CRUD, Abmelde-/Abmeldeabläufe und Statistiken
- **`activity.queries.ts`** – Aktivitätsprotokollierung für Benutzeranmeldungen und Nachverfolgung der letzten Anmeldung

## Quelldateien

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

Ruft ein Newsletter-Abonnement per E-Mail-Adresse ab.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-----------|----------|----------|------------------|
|`email`|`string`|Ja|E-Mail des Abonnenten|

**Zurückgegeben:** Abonnementdatensatz oder `null`, falls nicht gefunden

**SQL-Muster:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Hinweis:** E-Mails werden vor der Suche normalisiert (kleingeschrieben, gekürzt).

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

Meldet eine E-Mail vom Newsletter ab, indem `isActive` auf `false` gesetzt und der Abmeldezeitstempel aufgezeichnet wird.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL-Muster:**

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

Ruft Newsletter-Abonnementstatistiken ab.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Rücksendungen:**
- `totalActive` – Anzahl der derzeit aktiven Abonnements
- `recentSubscriptions` – Anzahl der Abonnements in den letzten 30 Tagen

**SQL-Muster:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Fehlerbehandlung:** Gibt bei einem Fehler `{ totalActive: 0, recentSubscriptions: 0 }` zurück.

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

Ruft die letzte Anmeldeaktivität für einen Benutzer oder Client ab.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Standard|Beschreibung|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|Ja| --         |Benutzer-ID oder Kundenprofil-ID|
|`entityType`|`'user'` \|`'client'`|Nein|`'client'`|Der abzufragende Entitätstyp|

**Zurückgegeben:** `Promise<ActivityLog | null>` – Letzte Anmeldeaktivität oder `null`, wenn keine Anmeldungen gefunden wurden

**SQL-Muster:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Hinweis:** Aus Gründen der Abwärtskompatibilität ist `entityType` standardmäßig `'client'` (nicht `'user'`).

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

## Leistungshinweise

1. **Anständige Fehlerbehandlung** – Alle Newsletter-Funktionen packen Vorgänge in Try-Catch-Blöcke ein und geben `null`/Standardwerte zurück, anstatt sie auszulösen. Dadurch wird verhindert, dass Newsletter-bezogene Fehler den Hauptanwendungsablauf beeinträchtigen.

2. **E-Mail-Normalisierung** – E-Mails werden vor dem Speichern und Suchen konsequent in Kleinbuchstaben geschrieben und gekürzt, wodurch doppelte Abonnements aufgrund von Unterschieden in der Groß- und Kleinschreibung vermieden werden.

3. **Intervallbasierte Abfragen** – `getNewsletterStats` verwendet die PostgreSQL-Syntax `INTERVAL` für zeitbasierte Filterung, was bei ordnungsgemäßer Indizierung für `subscribed_at` effizient ist.

4. **Unterstützung für zwei Entitäten** – Die Aktivitätsprotokollierung unterstützt sowohl `user` (Administrator) als auch `client` (Endbenutzer)-Entitäten mit einer einzigen Tabelle, wobei Nullspalten zur Unterscheidung zwischen Entitätstypen verwendet werden.

## Anwendungsbeispiele

### Ablauf des Newsletter-Abonnements

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

### Protokollierung der Benutzeraktivität

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Letzte Anmeldung wird im Dashboard angezeigt

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
