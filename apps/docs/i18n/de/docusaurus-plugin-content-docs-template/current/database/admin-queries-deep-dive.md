---
id: admin-queries-deep-dive
title: Detaillierte Informationen zu Admin- und Dashboard-Abfragen
sidebar_label: Admin-Abfragen im Detail
sidebar_position: 62
---

# Detaillierte Informationen zu Admin- und Dashboard-Abfragen

Umfassende Referenz für Admin-Dashboard-Daten, Kundenverwaltung, erweiterte Suche, Statistiken und Berichtsabfragefunktionen.

## Übersicht

Die Admin-Abfrageebene versorgt das Administrations-Dashboard mit optimierten Abfragen in zwei Hauptmodulen:

- **`dashboard.queries.ts`** – Dashboard-Statistiken, Engagement-Metriken, Wochen-/Tagesdiagramme und Elemente mit der besten Leistung
- **`client.queries.ts`** (Admin-Bereich) – Kundenliste mit Paginierung, Admin-Dashboard-Daten, erweiterte Suche mit über 20 Filterdimensionen und umfassende Statistiken

## Quelldateien

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

Ruft die Gesamtzahl der nicht gelöschten Kommentare ab, die zu einer Reihe von Elementen empfangen wurden.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|Ja|Array von Item-Slugs, die gezählt werden sollen|

**SQL-Muster:**

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

Ruft die Gesamtaktivitätszahl eines Benutzers ab (Stimmen + vom Benutzer abgegebene Kommentare).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**Parameter:**

|Parameter|Typ|Erforderlich|Beschreibung|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|Ja|Kundenprofil-ID|

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

Ruft tägliche Aktivitätsdaten für das Aktivitätsdiagramm ab (letzte N Tage).

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

**Parameter:**

|Parameter|Typ|Erforderlich|Standard|Beschreibung|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|Ja| --      |Kundenprofil-ID|
|`itemSlugs`|`string[]`|Ja| --      |Artikelschnecken|
|`days`|`number`|Nein| `7`     |Anzahl der Tage|

**Returns:** Tägliches Array mit `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**SQL-Muster:** Verwendet `EXTRACT(DOW FROM created_at)` für eine vom Gebietsschema unabhängige Wochentagsgruppierung.

**Hinweis:** Die Felder `submissions` und `views` sind Platzhalter (immer `0`); Die eigentliche Implementierung erfolgt in der Repository-Ebene.

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

Platzhalterfunktion. Elemente werden in Git gespeichert, nicht in der Datenbank.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**Rückgaben:** Immer `0`. Die eigentliche Implementierung erfolgt in der Repository-Ebene.

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

Ruft grundlegende Clientprofilstatistiken ab.

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

Optimierter Admin-Dashboard-Endpunkt, der Clients, Statistiken und Paginierung in einem einzigen Aufruf zurückgibt. Reduziert Datenbank-Roundtrips.

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

**Unterstützte Filter:**
- Textsuche (ILIKE über 5 Felder)
- Status, Plan, Kontotyp
- Authentifizierungsanbieter (EXISTS-Unterabfrage)
- Datumsbereich (erstellt/aktualisiert nach/vor)

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

## Leistungshinweise

1. **Administrator-Ausschlussmuster** – Alle Eintragsabfragen verwenden `LEFT JOIN userRoles / roles WHERE roles.id IS NULL`, um Administratorbenutzer konsequent von Clientansichten auszuschließen.

2. **Unterabfrage für Anbieter** – Verwendet die Unterabfrage `(SELECT provider FROM accounts WHERE ... LIMIT 1)` anstelle von JOIN, um Zeilenmultiplikation von mehreren OAuth-Konten zu vermeiden.

3. **Korrektes SQL-Escape** – Alle Textsucheingaben werden für ILIKE-Sonderzeichen (`%`, `_`, `\`) maskiert, um eine SQL-Injection durch Suchbegriffe zu verhindern.

4. **ISO-Wochenhandhabung** – `getWeeklyEngagementData` verwendet einen benutzerdefinierten `getISOWeekString`-Helper, der mit PostgreSQLs `to_char(date, 'IYYY-IW')` übereinstimmt, um eine korrekte ISO-Wochenjahrhandhabung an Jahresgrenzen zu gewährleisten.

## Anwendungsbeispiele

### Laden des Admin-Dashboards

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

### Erweiterte Kundensuche

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
