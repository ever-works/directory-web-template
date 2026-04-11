---
id: favorites-system
title: Favoritensystem
sidebar_label: Favoriten
sidebar_position: 33
---

# Favoritensystem

Mit der Favoritenfunktion können authentifizierte Benutzer Verzeichniselemente mit Lesezeichen versehen, um schnell darauf zuzugreifen. Es umfasst eine spezielle Favoritenseite, optimistische UI-Updates, eine vollständige REST-API, die von PostgreSQL unterstützt wird, und die Integration mit Feature-Flags für bedingtes Rendering.

## Architekturübersicht

```
hooks/
  use-favorites.ts           # React Query hook with optimistic mutations

components/favorites/
  favorites-client.tsx       # Full favorites page with grid, sorting, pagination

app/api/favorites/
  route.ts                   # GET (list) and POST (add) endpoints
  [itemSlug]/route.ts        # DELETE endpoint for removing a favorite

lib/db/schema.ts             # favorites table definition
```

## Datenbankschema

In der Tabelle `favorites` werden Lesezeichenbeziehungen zwischen Benutzern und Elementen gespeichert:

```ts
export const favorites = pgTable('favorites', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  itemSlug: text('item_slug').notNull(),
  itemName: text('item_name').notNull(),
  itemIconUrl: text('item_icon_url'),
  itemCategory: text('item_category'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
}, (table) => ({
  userItemIndex: uniqueIndex('user_item_favorite_unique_idx').on(table.userId, table.itemSlug),
  userIdIndex: index('favorites_user_id_idx').on(table.userId),
  itemSlugIndex: index('favorites_item_slug_idx').on(table.itemSlug),
  createdAtIndex: index('favorites_created_at_idx').on(table.createdAt),
}));
```

### Designentscheidungen

- **Denormalisierte Metadaten** – `itemName` , `itemIconUrl` und `itemCategory` werden neben dem Slug gespeichert, sodass die Favoritenliste gerendert wird, ohne mit der Artikeltabelle verknüpft zu werden.
- **Zusammengesetzte Eindeutigkeitsbeschränkung** – der `(userId, itemSlug)` -Index verhindert doppelte Favoriten auf Datenbankebene.
- **Indizierte Suchvorgänge** – separate Indizes für `userId` , `itemSlug` und `createdAt` optimieren gängige Abfragemuster für Auflistung, Zählung und chronologische Reihenfolge.

## useFavorites Hook

Die primäre clientseitige API mit vollständiger optimistischer Update-Unterstützung:

```ts
interface Favorite {
  id: string;
  userId: string;
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
  createdAt: string;
  updatedAt: string;
}

interface AddFavoriteRequest {
  itemSlug: string;
  itemName: string;
  itemIconUrl?: string;
  itemCategory?: string;
}
```

### Rückgabewert

| Eigentum | Geben Sie | ein Beschreibung |
|----------|------|-------------|
| `favorites` | `Favorite[]` | Aktuelle Liste der Benutzerfavoriten |
| `isLoading` | `boolean` | Wahr beim ersten Abruf |
| `error` | `Error \| null` | Fehler abrufen, falls vorhanden |
| `refetch` | `() => void` | Favoriten manuell erneut abrufen |
| `isFavorited` | `(slug: string) => boolean` | Überprüfen Sie, ob ein Element mit einem Lesezeichen versehen ist |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Je nach aktuellem Status hinzufügen oder entfernen |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Favorit explizit hinzufügen |
| `removeFavorite` | `(slug: string) => void` | Einen Favoriten explizit entfernen |
| `isAdding` | `boolean` | True, solange die Add-Mutation im Gange ist |
| `isRemoving` | `boolean` | True, solange die Mutation entfernt wird. |

### Optimistischer Update-Flow

Sowohl das Hinzufügen als auch das Entfernen von Mutationen folgen dem optimistischen Aktualisierungsmuster von React Query:

1. ** `onMutate` ** – Inflight-Abfragen abbrechen, vorherigen Zustand auswerten, die optimistische Änderung sofort anwenden. Durch das Hinzufügen von Mutationen wird ein temporärer Favorit mit der vorangestellten ID `temp-` erstellt.
2. ** `onError` ** – Führen Sie ein Rollback zum Snapshot durch, wenn der API-Aufruf fehlschlägt, und zeigen Sie einen Fehlertoast an.
3. ** `onSuccess` ** – Ersetzen Sie den optimistischen Eintrag durch vom Server bestätigte Daten. Die Add-Mutation ersetzt auf intelligente Weise den temporären Eintrag durch Matching am `itemSlug` und verhindert so Duplikate.

Auf die `onSettled` -Invalidierung wird bewusst verzichtet, um unnötige erneute Abrufe zu vermeiden. Das Optimistic-Update plus das `onSuccess` -Cache-Update sorgen für ausreichend Konsistenz.

### Feature-Flag-Integration

Die Abfrage wird nur aktiviert, wenn beide Bedingungen erfüllt sind:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Wenn das Feature-Flag `favorites` deaktiviert ist oder der Benutzer nicht authentifiziert ist, gibt der Hook ein leeres Array zurück, ohne dass Netzwerkanforderungen gestellt werden.

### Nutzung

```tsx
import { useFavorites } from '@/hooks/use-favorites';

function ItemCard({ item }) {
  const { isFavorited, toggleFavorite, isAdding, isRemoving } = useFavorites();

  return (
    <button
      onClick={() => toggleFavorite({
        itemSlug: item.slug,
        itemName: item.name,
        itemIconUrl: item.icon,
        itemCategory: item.category,
      })}
      disabled={isAdding || isRemoving}
    >
      {isFavorited(item.slug) ? 'Unfavorite' : 'Favorite'}
    </button>
  );
}
```

## API-Endpunkte

### GET /api/favorites

Gibt alle Favoriten für den authentifizierten Benutzer zurück, sortiert nach Erstellungsdatum.

### POST /api/favorites

Fügt ein Element zu den Favoriten hinzu. Validiert mit Zod und sucht nach Duplikaten (gibt bei Konflikt 409 zurück).

| Feld | Erforderlich | Beschreibung |
|-------|----------|-------------|
| `itemSlug` | Ja | Eindeutiger Artikelbezeichner |
| `itemName` | Ja | Anzeigename für die Favoritenliste |
| `itemIconUrl` | Nein | Symbol-URL zum Rendern |
| `itemCategory` | Nein | Kategoriebezeichnung |

### DELETE /api/favorites/[itemSlug]

Entfernt per Slug ein bestimmtes Element aus den Favoriten des Benutzers. Gibt 404 zurück, wenn nicht gefunden.

## Favoritenseite

Die `FavoritesClient` -Komponente rendert die vollständige Favoritenseite:

1. **Authentifizierungsgate** – Anmeldeaufforderung für nicht authentifizierte Benutzer.
2. **Ladegerüst** – 8-Karten-Raster-Platzhalter beim ersten Abruf.
3. **Fehlerstatus** – Fehlermeldung mit einer Wiederholungsschaltfläche.
4. **Leerer Status** – Nachricht mit einem Fallback-Abschnitt „Beliebte Artikel“.
5. **Favoritenraster** – Elemente werden mit Sortierung, Paginierung und Layoutumschaltung angezeigt.

### Sortieroptionen

| Wert | Etikett |
|-------|-------|
| `popularity` | Popularität |
| `name-asc` | Name A-Z |
| `name-desc` | Name Z-A |
| `date-asc` | Älteste |

### Layout-Integration

Die Seite ist mit `useLayoutTheme()` für den Wechsel zwischen Raster-, Listen- und Kartenansicht integriert. Über den Gegenständen erscheinen `ViewToggle` und `SortMenu` . Durch die clientseitige Paginierung werden Favoriten in 12er-Seiten unterteilt, mit `clampAndScrollToTop` beim Seitenwechsel.

## Geräteübergreifende Synchronisierung

Favoriten werden serverseitig in PostgreSQL gespeichert, sodass sie bei der Authentifizierung des Benutzers automatisch geräteübergreifend synchronisiert werden. Der React Query-Cache mit einer Stale-Time von 5 Minuten sorgt für ein Gleichgewicht zwischen Aktualität und Leistung. Die manuelle Synchronisierung ist über die Funktion `refetch` verfügbar.

## Barrierefreiheit

- Die Favoriten-Umschalttaste wird während ausstehender Mutationen deaktiviert, um Doppelaktionen zu verhindern.
- Toast-Benachrichtigungen geben Feedback zu erfolgreichen und fehlgeschlagenen Vorgängen.
- Das Favoritenseitenraster verwendet dieselben zugänglichen Kartenkomponenten wie die Hauptliste.
- Leer- und Fehlerzustände enthalten umsetzbare Elemente für die Tastaturnavigation.

## Verwandte Dokumentation

- [Feature Flags](/docs/template/configuration/feature-config) – Aktivieren/Deaktivieren der Favoritenfunktion
- [Shared Card Components](/docs/template/components/shared-card-components) – Kartendarstellung im Favoritenraster
– [Kontextanbieter](/docs/template/components/context-providers) – Layout-Theme-Integration
– [Dashboard-Komponenten](/docs/template/components/dashboard-components) – Favoritenzählungen in der Analyse
