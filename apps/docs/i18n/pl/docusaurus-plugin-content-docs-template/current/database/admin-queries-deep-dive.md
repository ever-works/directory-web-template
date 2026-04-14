---
id: admin-queries-deep-dive
title: Zapytania administratora i pulpitu nawigacyjnego Głębokie nurkowanie
sidebar_label: Administrator pyta o głębokie nurkowanie
sidebar_position: 62
---

# Zapytania administratora i pulpitu nawigacyjnego Głębokie nurkowanie

Kompleksowe informacje dotyczące danych panelu administracyjnego, zarządzania klientami, wyszukiwania zaawansowanego, statystyk i funkcji zapytań raportowania.

## Przegląd

Warstwa zapytań administracyjnych zapewnia pulpit administracyjny zoptymalizowanymi zapytaniami w dwóch głównych modułach:

- **`dashboard.queries.ts`** — Statystyki panelu kontrolnego, wskaźniki zaangażowania, wykresy tygodniowe/dzienne i najskuteczniejsze elementy
- **`client.queries.ts`** (sekcja administratora) — Lista klientów z podziałem na strony, danymi panelu administracyjnego, wyszukiwaniem zaawansowanym z ponad 20 wymiarami filtrów i kompleksowymi statystykami

## Pliki źródłowe

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

Pobiera całkowitą liczbę nieusuniętych komentarzy otrzymanych na temat zestawu elementów.

```typescript
async function getCommentsReceivedCount(itemSlugs: string[]): Promise<number>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-------------|------------|----------|----------------------------------|
|`itemSlugs`|`string[]`|Tak|Tablica ślimaków przedmiotów do zliczenia|

**Wzorzec SQL:**

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

Pobiera całkowitą liczbę aktywności użytkownika (głosy + komentarze użytkownika).

```typescript
async function getUserTotalActivityCount(
  clientProfileId: string
): Promise<number>
```

**Parametry:**

|Parametr|Wpisz|Wymagane|Opis|
|-------------------|----------|----------|-------------------|
|`clientProfileId`|`string`|Tak|Identyfikator profilu klienta|

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

Pobiera dzienne dane dotyczące aktywności dla wykresu aktywności (ostatnie N dni).

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

**Parametry:**

|Parametr|Wpisz|Wymagane|Domyślne|Opis|
|-------------------|------------|----------|---------|--------------------------|
|`clientProfileId`|`string`|Tak| --      |Identyfikator profilu klienta|
|`itemSlugs`|`string[]`|Tak| --      |Ślimaki na przedmioty|
|`days`|`number`|Nie| `7`     |Liczba dni|

**Zwroty:** Dzienna tablica z `{ date: 'Mon', submissions: 0, views: 0, engagement: 5 }`

**Wzorzec SQL:** Używa `EXTRACT(DOW FROM created_at)` do grupowania dni tygodnia niezależnie od ustawień regionalnych.

**Uwaga:** Pola `submissions` i `views` są polami zastępczymi (zawsze `0`); rzeczywista implementacja znajduje się w warstwie repozytorium.

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

Funkcja zastępcza. Elementy są przechowywane w Git, a nie w bazie danych.

```typescript
async function getRecentSubmissionsCount(_days: number = 7): Promise<number>
```

**Zwroty:** Zawsze `0`. Rzeczywista implementacja znajduje się w warstwie repozytorium.

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

Pobiera podstawowe statystyki profilu klienta.

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

Zoptymalizowany punkt końcowy panelu administracyjnego, który zwraca klientów, statystyki i paginację w jednym wywołaniu. Redukuje podróże w obie strony bazy danych.

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

**Obsługiwane filtry:**
- Wyszukiwanie tekstowe (ILIKE w 5 polach)
- Status, plan, typ konta
- Dostawca uwierzytelniania (podzapytanie EXISTS)
- Zakres dat (utworzony/zaktualizowany po/przed)

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

## Uwagi dotyczące wydajności

1. **Wzorzec wykluczenia administratora** — wszystkie zapytania dotyczące list wykorzystują `LEFT JOIN userRoles / roles WHERE roles.id IS NULL`, aby konsekwentnie wykluczać administratorów z widoków klientów.

2. **Podzapytanie dla dostawcy** — używa podzapytania `(SELECT provider FROM accounts WHERE ... LIMIT 1)` zamiast JOIN, aby uniknąć mnożenia wierszy z wielu kont OAuth.

3. **Prawidłowa ucieczka SQL** -- Wszystkie wprowadzone wyszukiwania tekstowe są uwzględniane w postaci znaków specjalnych ILIKE (`%`, `_`, `\`), aby zapobiec wstrzykiwaniu SQL przez wyszukiwane hasła.

4. **Obsługa tygodnia ISO** -- `getWeeklyEngagementData` używa niestandardowego pomocnika `getISOWeekString`, który pasuje do `to_char(date, 'IYYY-IW')` PostgreSQL w celu prawidłowej obsługi tygodnia tygodnia ISO na granicach roku.

## Przykłady użycia

### Ładowanie panelu administracyjnego

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

### Zaawansowane wyszukiwanie klientów

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
