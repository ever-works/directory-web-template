---
id: query-patterns
title: "Abfragemustersystem"
sidebar_label: "Abfragemuster"
sidebar_position: 7
---

# Abfragemustersystem

Die Vorlage organisiert alle Datenbankabfragen in domänenspezifische Module unter `lib/db/queries/`. Jedes Modul folgt dem Single-Responsibility-Prinzip (SRP) und gruppiert zusammengehörige Vorgänge. Ein Barrel-Export in `index.ts` bietet einen einzigen Einstiegspunkt für alle Abfragefunktionen.

## Architekturübersicht

```mermaid
graph TD
    A[API Route Handlers] --> B[Repositories / Services]
    B --> C[lib/db/queries/index.ts]
    C --> D[activity.queries.ts]
    C --> E[auth.queries.ts]
    C --> F[client.queries.ts]
    C --> G[comment.queries.ts]
    C --> H[engagement.queries.ts]
    C --> I[payment.queries.ts]
    C --> J[subscription.queries.ts]
    C --> K[vote.queries.ts]
    C --> L[report.queries.ts]
    C --> M[dashboard.queries.ts]
    C --> N[user.queries.ts]
    C --> O[item-view.queries.ts]
    C --> P[survey.queries.ts]
    D & E & F & G & H & I & J & K & L & M & N & O & P --> Q[lib/db/drizzle.ts]
    Q --> R[(PostgreSQL)]
```

## Abfragemodule

|Modul|Datei|Zweck|
|--------|------|---------|
|Aktivität|`activity.queries.ts`|Aktivitätsprotokollierung und Audit-Trail|
|Auth|`auth.queries.ts`|Passwort-Reset-Tokens, Verifizierungs-Tokens|
|Kunde|`client.queries.ts`|Kundenprofil CRUD, Suche, Statistiken|
|Kommentar|`comment.queries.ts`|Kommentieren Sie CRUD mit Benutzerbeitritten|
|Unternehmen|`company.queries.ts`|Unternehmensverwaltung und Artikel-Firmen-Verknüpfung|
|Armaturenbrett|`dashboard.queries.ts`|Dashboard-Statistiken und Engagement-Diagramme|
|Engagement|`engagement.queries.ts`|Aggregierte Engagement-Metriken (Aufrufe, Stimmen, Favoriten, Kommentare)|
|Integrationszuordnung|`integration-mapping.queries.ts`|CRM-Integrationszuordnungen|
|Artikel|`item.queries.ts`|Normalisierung und Validierung von Item-Slugs|
|Artikelprüfung|`item-audit.queries.ts`|Änderungsverlauf des Artikels|
|Artikelansicht|`item-view.queries.ts`|Anzeigenverfolgung mit Deduplizierung|
|Standortindex|`location-index.queries.ts`|Indizierung von Geodaten|
|Moderation|`moderation.queries.ts`|Aktionen zur Inhaltsmoderation|
|Newsletter|`newsletter.queries.ts`|Newsletter-Abonnentenverwaltung|
|Zahlung|`payment.queries.ts`|Zahlungsanbieter und Kontoverwaltung|
|Bericht|`report.queries.ts`|Inhaltsberichte mit Filterung|
|Abonnement|`subscription.queries.ts`|Verwaltung des Abonnementlebenszyklus|
|Umfrage|`survey.queries.ts`|Umfrageantworten und Analysen|
|Benutzer|`user.queries.ts`|Kernbenutzer-CRUD- und Administratorprüfungen|
|Abstimmung|`vote.queries.ts`|Abstimmung über CRUD und Berechnung des Nettoscores|

## Gemeinsame Muster

### 1. Paginierungsmuster

Alle Listenabfragen folgen einem einheitlichen Paginierungsmuster mit `limit` und `offset`:

```typescript
export async function getClientProfiles(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<{
  profiles: ClientProfileWithAuth[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}> {
  const { page = 1, limit = 10, search, status } = params;
  const offset = (page - 1) * limit;

  // 1. Build WHERE conditions dynamically
  const whereConditions: SQL[] = [];
  if (search) { /* add ILIKE condition */ }
  if (status) { whereConditions.push(eq(clientProfiles.status, status)); }
  const whereClause = whereConditions.length > 0
    ? and(...whereConditions)
    : undefined;

  // 2. Count query for total
  const countResult = await db
    .select({ count: sql<number>`count(distinct ${clientProfiles.id})` })
    .from(clientProfiles)
    .where(whereClause);
  const total = Number(countResult[0]?.count || 0);

  // 3. Data query with limit/offset
  const profiles = await db
    .select({ /* fields */ })
    .from(clientProfiles)
    .where(whereClause)
    .orderBy(desc(clientProfiles.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    profiles,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    limit,
  };
}
```

### 2. Dynamisches Filtermuster

Filter werden als Array von SQL-Bedingungen akkumuliert und mit `and()` zusammengesetzt:

```typescript
const whereConditions: SQL[] = [];

if (search) {
  const escapedSearch = search
    .replace(/\\/g, '\\\\')
    .replace(/[%_]/g, '\\$&');
  whereConditions.push(
    sql`(${clientProfiles.name} ILIKE ${`%${escapedSearch}%`} OR
         ${clientProfiles.email} ILIKE ${`%${escapedSearch}%`})`
  );
}

if (status) {
  whereConditions.push(eq(clientProfiles.status, status));
}

if (provider) {
  whereConditions.push(
    sql`exists (
      select 1 from ${accounts}
      where ${accounts.userId} = ${clientProfiles.userId}
        and ${accounts.provider} = ${provider}
    )`
  );
}

const whereClause = whereConditions.length > 0
  ? and(...whereConditions)
  : undefined;
```

### 3. Muster beitreten

Die Codebasis verwendet sowohl explizite `innerJoin`/`leftJoin` als auch Unterabfragen, um verwandte Daten zu verarbeiten:

**Inner Join für erforderliche Beziehungen:**

```typescript
const result = await db
  .select({
    id: comments.id,
    content: comments.content,
    user: {
      id: clientProfiles.id,
      name: clientProfiles.name,
      email: clientProfiles.email,
      image: clientProfiles.avatar,
    },
  })
  .from(comments)
  .innerJoin(clientProfiles, eq(comments.userId, clientProfiles.id))
  .where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt)))
  .orderBy(desc(comments.createdAt));
```

**Unterabfrage zur Vermeidung doppelter Zeilen aus mehreren Joins:**

```typescript
const profiles = await db
  .select({
    id: clientProfiles.id,
    // ... other fields
    accountProvider: sql<string>`coalesce(
      (SELECT provider FROM ${accounts}
       WHERE ${accounts.userId} = ${clientProfiles.userId}
       LIMIT 1),
      'unknown'
    )`,
  })
  .from(clientProfiles);
```

### 4. Aggregationsmuster

Aggregatfunktionen wie `count`, `SUM` und `AVG` werden mit `groupBy` verwendet:

```typescript
// Net vote score using conditional SUM
const voteCounts = await db
  .select({
    itemId: votes.itemId,
    netScore: sql<number>`
      SUM(CASE
        WHEN vote_type = 'upvote' THEN 1
        WHEN vote_type = 'downvote' THEN -1
        ELSE 0
      END)
    `.as('netScore'),
  })
  .from(votes)
  .where(inArray(votes.itemId, itemSlugs))
  .groupBy(votes.itemId);
```

### 5. Paralleles Abfragemuster

Wenn mehrere unabhängige Aggregationen erforderlich sind, werden Abfragen parallel mit `Promise.all` ausgeführt:

```typescript
const [viewsData, votesData, favoritesData, commentsData] =
  await Promise.all([
    db.select({ itemId: itemViews.itemId, count: count() })
      .from(itemViews)
      .where(inArray(itemViews.itemId, itemSlugs))
      .groupBy(itemViews.itemId),

    db.select({ itemId: votes.itemId, netScore: sql`...` })
      .from(votes)
      .where(inArray(votes.itemId, itemSlugs))
      .groupBy(votes.itemId),

    db.select({ itemSlug: favorites.itemSlug, count: count() })
      .from(favorites)
      .where(inArray(favorites.itemSlug, itemSlugs))
      .groupBy(favorites.itemSlug),

    db.select({ itemId: comments.itemId, count: count(), avgRating: sql`...` })
      .from(comments)
      .where(and(inArray(comments.itemId, itemSlugs), isNull(comments.deletedAt)))
      .groupBy(comments.itemId),
  ]);
```

### 6. Upsert-/Konfliktlösungsmuster

Wird zur Deduplizierung verwendet, insbesondere beim View-Tracking:

```typescript
export async function recordItemView(
  view: Pick<NewItemView, 'itemId' | 'viewerId' | 'viewedDateUtc'>
): Promise<boolean> {
  const result = await db
    .insert(itemViews)
    .values(view)
    .onConflictDoNothing()
    .returning({ id: itemViews.id });

  return result.length > 0;
}
```

### 7. Soft-Delete-Muster

Datensätze werden als gelöscht markiert und nicht physisch entfernt:

```typescript
export async function deleteComment(id: string) {
  const [comment] = await db
    .update(comments)
    .set({ deletedAt: new Date() })
    .where(eq(comments.id, id))
    .returning();
  return comment;
}

// Querying always filters out soft-deleted records
.where(and(eq(comments.itemId, itemId), isNull(comments.deletedAt)))
```

### 8. Ergebnisnormalisierungsmuster

Abfrageergebnisse werden häufig durch Lookup-`Map`-Objekte für einen effizienten O(1)-Zugriff abgebildet:

```typescript
const viewsMap = new Map<string, number>(
  viewsData.map(v => [v.itemId, Number(v.count)])
);
const votesMap = new Map<string, number>(
  votesData.map(v => [v.itemId, Number(v.netScore ?? 0)])
);

// Combine into final metrics
for (const slug of itemSlugs) {
  metricsMap.set(slug, {
    views: viewsMap.get(slug) ?? 0,
    votes: votesMap.get(slug) ?? 0,
  });
}
```

## Gemeinsame Dienstprogramme

### `lib/db/queries/utils.ts`

Stellt Hilfsfunktionen bereit, die von allen Abfragemodulen gemeinsam genutzt werden:

- **`extractUsernameFromEmail(email)`** – Extrahiert und bereinigt einen Benutzernamen aus einer E-Mail-Adresse
- **`ensureUniqueUsername(baseUsername)`** – Erzeugt einen eindeutigen Benutzernamen, indem bei Bedarf numerische Suffixe angehängt werden

### `lib/db/queries/types.ts`

Definiert gemeinsam genutzte Typen, die in allen Abfragemodulen verwendet werden:

- **`ClientProfileWithAuth`** – Kundenprofil kombiniert mit Authentifizierungsanbieterdaten
- **`ClientStatus`** / **`ClientPlan`** / **`ClientAccountType`** – Aufzählungstypen zum Filtern
- **`CommentWithUser`** – Kommentardaten angereichert mit Benutzerinformationen

## Importkonvention

Alle Abfragen werden über den Barrel-Export importiert:

```typescript
import {
  getClientProfiles,
  createVote,
  getEngagementMetricsPerItem,
  getUserActiveSubscription,
} from '@/lib/db/queries';
```
