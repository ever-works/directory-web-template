---
id: notification-queries-deep-dive
title: Consultas de notificación y actividad Análisis profundo
sidebar_label: Consultas de notificación Análisis profundo
sidebar_position: 67
---

# Consultas de notificación y actividad Análisis profundo

Referencia completa para todas las funciones de consulta de bases de datos relacionadas con notificaciones, incluida la gestión de suscripciones a boletines, el registro de actividades y las preferencias del usuario.

## Descripción general

La capa de consulta de notificación gestiona la comunicación del usuario y el seguimiento de la actividad:

- **`newsletter.queries.ts`** -- CRUD de suscripción al boletín, flujos de suscripción/cancelación de suscripción y estadísticas
- **`activity.queries.ts`** -- Registro de actividad para inicios de sesión de usuarios y seguimiento del último inicio de sesión

## Archivos fuente

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

Recupera una suscripción al boletín por dirección de correo electrónico.

```typescript
async function getNewsletterSubscriptionByEmail(
  email: string
): Promise<NewsletterSubscription | null>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Descripción|
|-----------|----------|----------|------------------|
|`email`|`string`|si|Correo electrónico del suscriptor|

**Devoluciones:** Registro de suscripción o `null` si no se encuentra

**Patrón SQL:**

```sql
SELECT * FROM newsletter_subscriptions
WHERE email = ? LIMIT 1;
```

**Nota:** El correo electrónico se normaliza (en minúsculas, se recorta) antes de la búsqueda.

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

Cancela la suscripción de un correo electrónico al boletín configurando `isActive` en `false` y registrando la marca de tiempo para cancelar la suscripción.

```typescript
async function unsubscribeFromNewsletter(
  email: string
): Promise<NewsletterSubscription | null>
```

**Patrón SQL:**

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

Obtiene estadísticas de suscripción al boletín.

```typescript
async function getNewsletterStats(): Promise<{
  totalActive: number;
  recentSubscriptions: number;
}>
```

**Devoluciones:**
- `totalActive` -- Recuento de suscripciones actualmente activas
- `recentSubscriptions` -- Recuento de suscripciones en los últimos 30 días

**Patrón SQL:**

```sql
-- Active count
SELECT count(*) FROM newsletter_subscriptions WHERE is_active = true;

-- Recent (last 30 days)
SELECT count(*) FROM newsletter_subscriptions
WHERE subscribed_at >= NOW() - INTERVAL '30 days';
```

**Manejo de errores:** Devuelve `{ totalActive: 0, recentSubscriptions: 0 }` en caso de error.

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

Obtiene la actividad de inicio de sesión más reciente de un usuario o cliente.

```typescript
async function getLastLoginActivity(
  id: string,
  entityType: 'user' | 'client' = 'client'
): Promise<ActivityLog | null>
```

**Parámetros:**

|Parámetro|Tipo|Requerido|Predeterminado|Descripción|
|--------------|--------------------------|----------|------------|------------------------------|
|`id`|`string`|si| --         |ID de usuario o ID de perfil de cliente|
|`entityType`|`'user'` \|`'client'`|No|`'client'`|Tipo de entidad a consultar|

**Devoluciones:** `Promise<ActivityLog | null>` -- Última actividad de inicio de sesión o `null` si no se encontraron inicios de sesión

**Patrón SQL:**

```sql
SELECT * FROM activity_logs
WHERE client_id = ? AND action = 'SIGN_IN'
ORDER BY timestamp DESC
LIMIT 1;
```

**Nota:** El valor predeterminado `entityType` es `'client'` (no `'user'`) para compatibilidad con versiones anteriores.

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

## Notas de rendimiento

1. **Manejo elegante de errores**: todas las funciones del boletín envuelven operaciones en bloques try-catch y devuelven `null`/valores predeterminados en lugar de arrojarlos. Esto evita que los errores relacionados con el boletín afecten el flujo principal de la aplicación.

2. **Normalización del correo electrónico**: los correos electrónicos se escriben en minúsculas y se recortan constantemente antes de almacenarlos y buscarlos, lo que evita suscripciones duplicadas debido a diferencias entre mayúsculas y minúsculas.

3. **Consultas basadas en intervalos**: `getNewsletterStats` usa la sintaxis PostgreSQL `INTERVAL` para el filtrado basado en tiempo, que es eficiente con una indexación adecuada en `subscribed_at`.

4. **Compatibilidad con entidades duales**: el registro de actividad admite entidades `user` (administrador) y `client` (usuario final) con una sola tabla, utilizando columnas nulas para distinguir entre tipos de entidades.

## Ejemplos de uso

### Flujo de suscripción al boletín

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

### Registrar la actividad del usuario

```typescript
import { logActivity } from '@/lib/db/queries';
import { ActivityType } from '@/lib/db/schema';

// Log admin sign-in
await logActivity(ActivityType.SIGN_IN, userId, 'user', req.ip);

// Log client sign-in
await logActivity(ActivityType.SIGN_IN, clientProfileId, 'client', req.ip);
```

### Mostrando el último inicio de sesión en el panel

```typescript
import { getLastLoginActivity } from '@/lib/db/queries';

const lastLogin = await getLastLoginActivity(clientProfileId, 'client');

if (lastLogin) {
  console.log(`Last login: ${lastLogin.timestamp}`);
  console.log(`From IP: ${lastLogin.ipAddress}`);
}
```
