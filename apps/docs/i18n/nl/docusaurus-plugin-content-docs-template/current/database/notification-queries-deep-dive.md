---
id: notification-queries-deep-dive
title: Meldingen en activiteitsquery's Deep Dive
sidebar_label: Meldingsquery's Deep Dive
sidebar_position: 67
---

# Meldingen en activiteitsquery's Deep Dive

Uitgebreid naslagwerk voor alle kennisgevingsgerelateerde databasequeryfuncties, inclusief abonnementsbeheer voor nieuwsbrieven, logboekregistratie van activiteiten en gebruikersvoorkeuren.

## Overzicht

De meldingsquerylaag beheert de gebruikerscommunicatie en het volgen van activiteiten:

- **`newsletter.queries.ts`** -- Nieuwsbriefabonnement CRUD, aan-/afmeldingsstromen en statistieken
- **`activity.queries.ts`** -- Activiteitenregistratie voor gebruikersaanmeldingen en bijhouden van laatste aanmeldingen

## Bronbestanden

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

Haalt een nieuwsbriefabonnement op per e-mailadres.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-----------|----------|----------|------------------|
|`email`|`string`|Ja|E-mailadres van abonnee|

**Retourzendingen:** Abonnementsrecord of `null` indien niet gevonden

**SQL-patroon:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Opmerking:** E-mail wordt vóór het opzoeken genormaliseerd (kleine letters, ingekort).

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

Meldt u af voor een e-mail van de nieuwsbrief door `isActive` in te stellen op `false` en de tijdstempel voor het afmelden vast te leggen.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**SQL-patroon:**

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

Ontvangt statistieken over nieuwsbriefabonnementen.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Retourzendingen:**
- `totalActive` -- Telling van momenteel actieve abonnementen
- `recentSubscriptions` -- Aantal abonnementen in de afgelopen 30 dagen

**SQL-patroon:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Foutafhandeling:** Retourneert `{ totalActive: 0, recentSubscriptions: 0 }` bij een fout.

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

Haalt de meest recente aanmeldingsactiviteit voor een gebruiker of client op.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Parameters:**

|Parameter|Typ|Vereist|Standaard|Beschrijving|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|Ja| --         |Gebruikers-ID of klantprofiel-ID|
|`entityType`|`'user'` \|`'client'`|Nee|`'client'`|Entiteitstype dat moet worden opgevraagd|

**Retourzendingen:** `Promise<ActivityLog | null>` -- Laatste inlogactiviteit of `null` als er geen aanmeldingen zijn gevonden

**SQL-patroon:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Opmerking:** Standaard `entityType` is `'client'` (niet `'user'`) voor achterwaartse compatibiliteit.

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

## Prestatienotities

1. **Gracieuze foutafhandeling** -- Alle nieuwsbrieffuncties verpakken bewerkingen in try-catch-blokken en retourneren `null`/default-waarden in plaats van te gooien. Dit voorkomt dat nieuwsbriefgerelateerde fouten invloed hebben op de hoofdapplicatiestroom.

2. **E-mailnormalisatie** -- E-mails worden consequent in kleine letters weergegeven en ingekort voordat ze worden opgeslagen en opgezocht, waardoor dubbele abonnementen als gevolg van hoofdletterverschillen worden voorkomen.

3. **Op intervallen gebaseerde zoekopdrachten** -- `getNewsletterStats` gebruikt de syntaxis van PostgreSQL `INTERVAL` voor op tijd gebaseerde filtering, wat efficiënt is met de juiste indexering op `subscribed_at`.

4. **Ondersteuning voor dubbele entiteiten** -- Activiteitenregistratie ondersteunt zowel `user` (admin) als `client` (eindgebruiker) entiteiten met een enkele tabel, waarbij nulkolommen worden gebruikt om onderscheid te maken tussen entiteitstypen.

## Gebruiksvoorbeelden

### Abonnementsstroom voor nieuwsbrieven

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

### Gebruikersactiviteit registreren

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Laatste login op dashboard tonen

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
