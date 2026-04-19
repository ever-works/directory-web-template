---
id: admin-queries-deep-dive
title: Beheer- en dashboardquery's Deep Dive
sidebar_label: Beheervragen Deep Dive
sidebar_position: 62
---

# Beheer- en dashboardquery's Deep Dive

Uitgebreide referentie voor beheerdersdashboardgegevens, klantbeheer, geavanceerd zoeken, statistieken en rapportagequeryfuncties.

## Overzicht

De beheerdersquerylaag voedt het beheerdashboard met geoptimaliseerde query's over twee primaire modules:

- **`dashboard.queries.ts`** -- Dashboardstatistieken, betrokkenheidsstatistieken, wekelijkse/dagelijkse grafieken en best presterende items
- **`client.queries.ts`** (beheerdersgedeelte) -- Klantenlijst met paginering, beheerdersdashboardgegevens, geavanceerd zoeken met meer dan 20 filterdimensies en uitgebreide statistieken

## Bronbestanden

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

Krijgt het totaal aantal niet-verwijderde reacties ontvangen op een reeks items.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|Ja|Een reeks item-slugs om voor te tellen|

**SQL-patroon:**

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

Krijgt het totale aantal activiteiten van een gebruiker (stemmen + opmerkingen gemaakt door de gebruiker).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**Parameters:**

|Parameter|Typ|Vereist|Beschrijving|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|Ja|Klantprofiel-ID|

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

Haalt dagelijkse activiteitsgegevens op voor het activiteitendiagram (laatste N dagen).

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

**Parameters:**

|Parameter|Typ|Vereist|Standaard|Beschrijving|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|Ja| --      |Klantprofiel-ID|
|`itemSlugs`|`string[]`|Ja| --      |Artikel slakken|
|`days`|`number`|Nee| `7`     |Aantal dagen|

**Retouren:** Dagelijkse array met `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**SQL-patroon:** Gebruikt `EXTRACT(DOW FROM created_at)` voor locale-onafhankelijke dag-van-week-groepering.

**Opmerking:** `submissions` en `views` velden zijn tijdelijke aanduidingen (altijd `0`); de daadwerkelijke implementatie vindt plaats in de repositorylaag.

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

Placeholder-functie. Items worden opgeslagen in Git, niet in de database.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**Retourzendingen:** Altijd `0`. De daadwerkelijke implementatie vindt plaats in de repositorylaag.

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

Krijgt basisstatistieken van klantprofielen.

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

Geoptimaliseerd eindpunt voor het beheerdersdashboard dat klanten, statistieken en paginering in één keer retourneert. Vermindert databaserondreizen.

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

**Ondersteunde filters:**
- Tekst zoeken (ILIKE over 5 velden)
- Status, abonnement, accounttype
- Verificatieprovider (EXISTS-subquery)
- Datumbereik (gemaakt/geüpdatet na/voor)

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

## Prestatienotities

1. **Beheerdersuitsluitingspatroon** -- Alle zoekopdrachten met vermeldingen gebruiken `LEFT JOIN userRoles / roles WHERE roles.id IS NULL` om beheerders consequent uit te sluiten van klantweergaven.

2. **Subquery voor provider** -- Gebruikt `(SELECT provider FROM accounts WHERE ... LIMIT 1)` subquery in plaats van JOIN om rijvermenigvuldiging van meerdere OAuth-accounts te voorkomen.

3. **Juiste SQL-escaping** -- Alle tekstzoekinvoer wordt geëscaped voor speciale ILIKE-tekens (`%`, `_`, `\`) om SQL-injectie via zoektermen te voorkomen.

4. **ISO-weekafhandeling** -- `getWeeklyEngagementData` gebruikt een aangepaste `getISOWeekString`-helper die overeenkomt met `to_char(date, 'IYYY-IW')` van PostgreSQL voor correcte ISO-weekjaarafhandeling bij jaargrenzen.

## Gebruiksvoorbeelden

### Het beheerdersdashboard laden

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

### Geavanceerd zoeken naar klanten

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
