---
id: notification-queries-deep-dive
title: Analyse approfondie des requêtes de notification et d'activité
sidebar_label: Requêtes de notification approfondies
sidebar_position: 67
---

# Analyse approfondie des requêtes de notification et d'activité

Référence complète pour toutes les fonctions de requête de base de données liées aux notifications, y compris la gestion des abonnements à la newsletter, la journalisation des activités et les préférences utilisateur.

## Aperçu

La couche de requête de notification gère la communication des utilisateurs et le suivi des activités :

- **`newsletter.queries.ts`** -- CRUD d'abonnement à la newsletter, flux d'abonnement/désabonnement et statistiques
- **`activity.queries.ts`** -- Journalisation des activités pour les connexions des utilisateurs et le suivi de la dernière connexion

## Fichiers sources

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

Récupère un abonnement à la newsletter par adresse email.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-----------|----------|----------|------------------|
|`email`|`string`|Oui|E-mail de l'abonné|

**Retours :** Enregistrement d'abonnement ou `null` s'il est introuvable

**Modèle SQL :**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Remarque :** L'e-mail est normalisé (minuscules, tronqué) avant la recherche.

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

Désabonne un e-mail de la newsletter en définissant `isActive` sur `false` et en enregistrant l'horodatage de désabonnement.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**Modèle SQL :**

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

Obtient les statistiques d’abonnement à la newsletter.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Retours :**
- `totalActive` -- Nombre d'abonnements actuellement actifs
- `recentSubscriptions` -- Nombre d'abonnements au cours des 30 derniers jours

**Modèle SQL :**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Gestion des erreurs :** Renvoie `{ totalActive: 0, recentSubscriptions: 0 }` en cas d'erreur.

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

Obtient l’activité de connexion la plus récente pour un utilisateur ou un client.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Par défaut|Descriptif|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|Oui| --         |ID utilisateur ou ID de profil client|
|`entityType`|`'user'` \|`'client'`|Non|`'client'`|Type d'entité à interroger|

**Retours :** `Promise<ActivityLog | null>` -- Dernière activité de connexion ou `null` si aucune connexion n'est trouvée

**Modèle SQL :**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Remarque :** `entityType` par défaut est `'client'` (et non `'user'`) pour une compatibilité descendante.

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

## Notes de performances

1. **Gestion gracieuse des erreurs** -- Toutes les fonctions de newsletter encapsulent les opérations dans des blocs try-catch et renvoient les valeurs `null`/default au lieu de les lancer. Cela évite que les erreurs liées à la newsletter n’aient un impact sur le flux principal des candidatures.

2. **Normalisation des e-mails** : les e-mails sont systématiquement mis en minuscules et tronqués avant le stockage et la recherche, évitant ainsi les abonnements en double en raison de différences de casse.

3. **Requêtes basées sur des intervalles** -- `getNewsletterStats` utilise la syntaxe PostgreSQL `INTERVAL` pour le filtrage basé sur le temps, ce qui est efficace avec une indexation appropriée sur `subscribed_at`.

4. **Prise en charge de deux entités** -- La journalisation des activités prend en charge les entités `user` (administrateur) et `client` (utilisateur final) avec une seule table, en utilisant des colonnes nulles pour distinguer les types d'entités.

## Exemples d'utilisation

### Flux d'abonnement à la newsletter

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

### Journalisation de l'activité des utilisateurs

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Affichage de la dernière connexion sur le tableau de bord

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
