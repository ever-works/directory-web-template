---
id: admin-queries-deep-dive
title: Requêtes d'administration et de tableau de bord - Analyse approfondie
sidebar_label: Requêtes d'administration approfondies
sidebar_position: 62
---

# Requêtes d'administration et de tableau de bord - Analyse approfondie

Référence complète pour les données du tableau de bord d'administration, la gestion des clients, la recherche avancée, les statistiques et les fonctions de requête de reporting.

## Aperçu

La couche de requêtes d'administration alimente le tableau de bord d'administration avec des requêtes optimisées sur deux modules principaux :

- **`dashboard.queries.ts`** -- Statistiques du tableau de bord, mesures d'engagement, graphiques hebdomadaires/quotidiens et éléments les plus performants
- **`client.queries.ts`** (section admin) -- Liste des clients avec pagination, données du tableau de bord d'administration, recherche avancée avec plus de 20 dimensions de filtre et statistiques complètes

## Fichiers sources

```
lib/db/queries/dashboard.queries.ts
lib/db/queries/client.queries.ts
```

---

## Function Reference: dashboard.queries.ts

### `getVotesReceivedCount`

Gets total votes received on a set of items.

```typescript
async function getVotesReceivedCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

| Parameter   | Type       | Required | Description                      |
|-------------|------------|----------|----------------------------------|
| `itemSlugs` | `string[]` | Yes      | Array of item slugs to count for |

**Returns:** `Promise<number>` -- Total vote count

**SQL Pattern:**

```sql
SELECT count(*) FROM votes WHERE item_id IN (...);
```

---

### `getCommentsReceivedCount`

Obtient le nombre total de commentaires non supprimés reçus sur un ensemble d’éléments.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|Oui|Tableau de limaces d'éléments à compter|

**Modèle SQL :**

```sql
SELECT count(*) FROM comments
WHERE item_id IN (...) AND deleted_at IS NULL;
```

---

### `getUniqueItemsInteractedCount`

Gets count of unique items a user has interacted with (voted or commented on).

```typescript
async function getUniqueItemsInteractedCount(
  clientProfileId: string
): Promise<number>
```

**Parameters:**

| Parameter         | Type     | Required | Description       |
|-------------------|----------|----------|-------------------|
| `clientProfileId` | `string` | Yes      | Client profile ID |

**Returns:** `Promise<number>` -- Count of unique items (approximate, may double-count items with both vote and comment)

**SQL Pattern:** Runs two `COUNT(DISTINCT item_id)` queries on `votes` and `comments` tables, then sums results.

**Note:** This is an approximation metric. For exact unique counts, a `UNION` query would be needed.

---

### `getUserTotalActivityCount`

Obtient le nombre total d'activités d'un utilisateur (votes + commentaires faits par l'utilisateur).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Descriptif|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|Oui|Identifiant du profil client|

---

### `getWeeklyEngagementData`

Gets weekly engagement data (votes and comments received on user's items) for charting.

```typescript
async function getWeeklyEngagementData(
  itemSlugs: string[],
  weeks: number = 12
): Promise<Array<{ week: string; votes: number; comments: number }>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description                 |
|-------------|------------|----------|---------|-----------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs         |
| `weeks`     | `number`   | No       | `12`    | Number of weeks to fetch    |

**Returns:** Array of `{ week: 'W1', votes: 5, comments: 3 }` objects

**SQL Pattern:**

```sql
SELECT to_char(created_at, 'IYYY-IW') as week, count(*)
FROM votes
WHERE item_id IN (...) AND created_at >= ?
GROUP BY to_char(created_at, 'IYYY-IW')
ORDER BY to_char(created_at, 'IYYY-IW');
```

**Performance Notes:**
- Runs two separate GROUP BY queries for votes and comments, then merges in-memory
- Uses ISO week format (`IYYY-IW`) for consistent week numbering across year boundaries
- Returns empty data (zeros) for weeks with no activity

---

### `getDailyActivityData`

Obtient les données d’activité quotidiennes pour le graphique d’activité (N derniers jours).

```typescript
async function getDailyActivityData(
  clientProfileId: string,
  itemSlugs: string[],
  days: number = 7
): Promise<Array<{
  date: string;
  submissions: number;
  views: number;
  engagement: number;
}>>
```

**Paramètres :**

|Paramètre|Tapez|Obligatoire|Par défaut|Descriptif|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|Oui| --      |Identifiant du profil client|
|`itemSlugs`|`string[]`|Oui| --      |Limaces d'objets|
|`days`|`number`|Non| `7`     |Nombre de jours|

**Retours :** Tableau quotidien avec `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**Modèle SQL :** Utilise `EXTRACT(DOW FROM created_at)` pour le regroupement des jours de la semaine indépendant des paramètres régionaux.

**Remarque :** Les champs `submissions` et `views` sont des espaces réservés (toujours `0`) ; la mise en œuvre réelle se trouve dans la couche référentiel.

---

### `getTopItemsEngagement`

Gets top performing items ranked by total engagement (votes + comments).

```typescript
async function getTopItemsEngagement(
  itemSlugs: string[],
  limit: number = 5
): Promise<Array<{ itemId: string; votes: number; comments: number }>>
```

**Parameters:**

| Parameter   | Type       | Required | Default | Description               |
|-------------|------------|----------|---------|---------------------------|
| `itemSlugs` | `string[]` | Yes      | --      | Array of item slugs       |
| `limit`     | `number`   | No       | `5`     | Maximum items to return   |

**Returns:** Array sorted by total engagement descending

---

### `getRecentSubmissionsCount`

Fonction d'espace réservé. Les éléments sont stockés dans Git, pas dans la base de données.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**Retours :** Toujours `0`. La mise en œuvre réelle se situe dans la couche référentiel.

---

## Function Reference: client.queries.ts (Admin Section)

### `getClientProfiles`

Gets paginated client profiles with authentication data. Excludes admin users from results.

```typescript
async function getClientProfiles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
}): Promise<{
  profiles: ClientProfileWithAuth[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}>
```

**SQL Pattern:**
- Uses `LEFT JOIN` on `userRoles` and `roles` to exclude admin users (`WHERE roles.id IS NULL`)
- Uses subquery for `accountProvider` to avoid duplicate rows from multiple OAuth accounts
- Supports `ILIKE` search across username, displayName, company, name, and email
- Provider filter uses an `EXISTS` subquery on the accounts table

---

### `getClientProfileStats`

Obtient les statistiques de base du profil client.

```typescript
async function getClientProfileStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
}>
```

---

### `getEnhancedClientStats`

Gets comprehensive statistics with multiple dimensions including provider distribution, activity metrics, and growth rates.

```typescript
async function getEnhancedClientStats(): Promise<{
  overview: { total, active, inactive, suspended, trial };
  byProvider: { credentials, google, github, facebook, twitter, linkedin, other };
  byPlan: Record<string, number>;
  byAccountType: Record<string, number>;
  byStatus: Record<string, number>;
  activity: { newThisWeek, newThisMonth, activeThisWeek, activeThisMonth };
  growth: { weeklyGrowth, monthlyGrowth };
}>
```

**SQL Pattern:** Uses a multi-dimensional `GROUP BY` across status, plan, accountType, and provider in a single query, then calculates activity metrics with date-range filters.

**Performance Notes:**
- Executes multiple queries for different metrics
- All queries exclude admin users via `LEFT JOIN` on roles
- Growth rates are calculated as percentages of total

---

### `getAdminDashboardData`

Point de terminaison du tableau de bord d'administration optimisé qui renvoie les clients, les statistiques et la pagination en un seul appel. Réduit les allers-retours dans la base de données.

```typescript
async function getAdminDashboardData(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
}): Promise<{
  clients: ClientProfileWithAuth[];
  stats: { /* full EnhancedClientStats */ };
  pagination: { page, totalPages, total, limit };
}>
```

**Filtres pris en charge :**
- Recherche de texte (ILIKE sur 5 champs)
- Statut, forfait, type de compte
- Fournisseur d'authentification (sous-requête EXISTS)
- Plage de dates (créée/mise à jour après/avant)

---

### `advancedClientSearch`

Full-featured search with 20+ filter dimensions, sorting, and metadata tracking.

```typescript
async function advancedClientSearch(params: {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  plan?: string;
  accountType?: string;
  provider?: string;
  dateRange?: { startDate?: Date; endDate?: Date };
  createdAfter?: Date;
  createdBefore?: Date;
  updatedAfter?: Date;
  updatedBefore?: Date;
  emailDomain?: string;
  companySearch?: string;
  locationSearch?: string;
  industrySearch?: string;
  minSubmissions?: number;
  maxSubmissions?: number;
  hasAvatar?: boolean;
  hasWebsite?: boolean;
  hasPhone?: boolean;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'email' | 'company' | 'totalSubmissions';
  sortOrder?: 'asc' | 'desc';
}): Promise<{
  clients: ClientProfileWithAuth[];
  pagination: { page, totalPages, total, limit };
  searchMetadata: { appliedFilters: string[], searchTime: number, resultCount: number };
}>
```

**Unique Features:**
- **Email domain filter**: `ILIKE '%@example.com%'`
- **Boolean presence filters**: `hasAvatar`, `hasWebsite`, `hasPhone` check for non-null, non-empty values
- **Numeric range filters**: `minSubmissions`, `maxSubmissions`
- **Search metadata**: Returns list of applied filters and result count
- **Configurable sorting**: 6 sort fields with ascending/descending order

**Performance Notes:**
- All ILIKE patterns use proper SQL escaping for special characters (`%`, `_`, `\`)
- Admin users are excluded via LEFT JOIN pattern
- Uses `COUNT(DISTINCT)` for accurate totals with JOINs

---

## Notes de performances

1. **Modèle d'exclusion d'administrateur** : toutes les requêtes de liste utilisent `LEFT JOIN userRoles / roles WHERE roles.id IS NULL` pour exclure systématiquement les utilisateurs administrateurs des vues client.

2. **Sous-requête pour le fournisseur** -- Utilise la sous-requête `(SELECT provider FROM accounts WHERE ... LIMIT 1)` au lieu de JOIN pour éviter la multiplication des lignes à partir de plusieurs comptes OAuth.

3. **Échappement SQL approprié** -- Toutes les entrées de recherche de texte sont échappées pour les caractères spéciaux ILIKE (`%`, `_`, `\`) pour empêcher l'injection SQL via les termes de recherche.

4. **Gestion de la semaine ISO** -- `getWeeklyEngagementData` utilise un assistant personnalisé `getISOWeekString` qui correspond à `to_char(date, 'IYYY-IW')` de PostgreSQL pour une gestion correcte de l'année de la semaine ISO aux limites de l'année.

## Exemples d'utilisation

### Chargement du tableau de bord d'administration

```typescript
import { getAdminDashboardData } from '@/lib/db/queries';

const dashboard = await getAdminDashboardData({
  page: 1,
  limit: 25,
  search: 'acme',
  status: 'active',
});

// dashboard.clients -- paginated client list
// dashboard.stats   -- full statistics
// dashboard.pagination -- page metadata
```

### Recherche avancée de clients

```typescript
import { advancedClientSearch } from '@/lib/db/queries';

const results = await advancedClientSearch({
  page: 1,
  limit: 10,
  emailDomain: 'company.com',
  plan: 'premium',
  hasAvatar: true,
  sortBy: 'totalSubmissions',
  sortOrder: 'desc',
});

console.log(results.searchMetadata.appliedFilters);
// ['Email domain: company.com', 'Plan: premium', 'Has avatar: true']
```
