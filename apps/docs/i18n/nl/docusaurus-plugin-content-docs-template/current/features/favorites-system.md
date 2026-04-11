---
id: favorites-system
title: Favorietensysteem
sidebar_label: Favorieten
sidebar_position: 33
---

# Favorietensysteem

Met de favorietenfunctie kunnen geverifieerde gebruikers directory-items bookmarken voor snelle toegang. Het bevat een speciale favorietenpagina, optimistische UI-updates, een volledige REST API ondersteund door PostgreSQL en integratie met functievlaggen voor voorwaardelijke weergave.

## Architectuuroverzicht

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

## Databaseschema

In de tabel `favorites` worden bladwijzerrelaties tussen gebruikers en items opgeslagen:

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

### Ontwerpbeslissingen

- **Gedenormaliseerde metagegevens** -- `itemName` , `itemIconUrl` en `itemCategory` worden naast de slug opgeslagen, zodat de lijst met favorieten wordt weergegeven zonder verbinding te maken met de itemtabel.
- **Samengestelde unieke beperking** -- de `(userId, itemSlug)` -index voorkomt dubbele favorieten op databaseniveau.
- **Geïndexeerde zoekopdrachten** - afzonderlijke indexen op `userId` , `itemSlug` en `createdAt` optimaliseren algemene zoekpatronen voor opsommen, tellen en chronologische volgorde.

## gebruikFavorieten Hook

De primaire client-side API met volledige optimistische update-ondersteuning:

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

### Retourwaarde

| Eigendom | Typ | Beschrijving |
|----------|------|-------------|
| `favorites` | `Favorite[]` | Huidige lijst met gebruikersfavorieten |
| `isLoading` | `boolean` | Waar tijdens initiële ophaalactie |
| `error` | `Error \| null` | Eventuele fout ophalen |
| `refetch` | `() => void` | Favorieten handmatig opnieuw ophalen |
| `isFavorited` | `(slug: string) => boolean` | Controleer of een item is gemarkeerd |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Toevoegen of verwijderen op basis van huidige status |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Voeg expliciet een favoriet toe |
| `removeFavorite` | `(slug: string) => void` | Een favoriet expliciet verwijderen |
| `isAdding` | `boolean` | Waar terwijl de add-mutatie actief is |
| `isRemoving` | `boolean` | Waar terwijl de verwijdermutatie actief is |

### Optimistische updatestroom

Zowel het toevoegen als het verwijderen van mutaties volgen het optimistische updatepatroon van React Query:

1. ** `onMutate` ** -- annuleer zoekopdrachten aan boord, maak een momentopname van de vorige status en pas de optimistische verandering onmiddellijk toe. Voeg mutaties toe en creëer een tijdelijke favoriet met een ID voorafgegaan door `temp-` .
2. ** `onError` ** -- ga terug naar de momentopname als de API-aanroep mislukt en geef een foutmelding weer.
3. ** `onSuccess` ** -- vervang de optimistische invoer door door de server bevestigde gegevens. De add-mutatie vervangt op intelligente wijze de tijdelijke invoer door te matchen op `itemSlug` , waardoor duplicaten worden voorkomen.

De ongeldigverklaring van `onSettled` is met opzet achterwege gelaten om onnodig opnieuw ophalen te voorkomen. De optimistische update plus de cache-update van `onSuccess` zorgen voor voldoende consistentie.

### Functievlag-integratie

De query wordt alleen ingeschakeld als aan beide voorwaarden is voldaan:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Wanneer de functievlag `favorites` is uitgeschakeld of de gebruiker niet is geverifieerd, retourneert de hook een lege array zonder netwerkverzoeken te doen.

### Gebruik

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

## API-eindpunten

### KRIJG /api/favorieten

Retourneert alle favorieten voor de geverifieerde gebruiker, gerangschikt op aanmaakdatum.

### POST /api/favorieten

Voegt een item toe aan favorieten. Valideert met Zod en controleert op duplicaten (retourneert 409 bij conflict).

| Veld | Vereist | Beschrijving |
|-------|----------|------------|
| `itemSlug` | Ja | Unieke item-ID |
| `itemName` | Ja | Weergavenaam voor de favorietenlijst |
| `itemIconUrl` | Nee | Pictogram-URL voor weergave |
| `itemCategory` | Nee | Categorielabel |

### VERWIJDEREN /api/favorites/[itemSlug]

Verwijdert een specifiek item uit de favorieten van de gebruiker per slug. Retourneert 404 als deze niet wordt gevonden.

## Favorietenpagina

De component `FavoritesClient` geeft de volledige favorietenpagina weer:

1. **Authenticatiepoort**: aanmeldingsprompt voor niet-geverifieerde gebruikers.
2. **Skelet laden** - Tijdelijke aanduiding voor een raster met 8 kaarten tijdens het eerste ophalen.
3. **Foutstatus** -- foutmelding met een knop voor opnieuw proberen.
4. **Lege status**: bericht met een reservegedeelte voor 'populaire items'.
5. **Favorietenraster** - items weergegeven met sortering, paginering en wisselen van lay-out.

### Sorteeropties

| Waarde | Etiket |
|-------|-------|
| `popularity` | Populariteit |
| `name-asc` | Naam A-Z |
| `name-desc` | Naam Z-A |
| `date-asc` | Oudste |

### Lay-outintegratie

De pagina is geïntegreerd met `useLayoutTheme()` voor het schakelen tussen raster-/lijst-/kaartweergave. Boven de artikelen verschijnt een `ViewToggle` en `SortMenu` . Paginering aan de clientzijde verdeelt favorieten in pagina's van 12, met `clampAndScrollToTop` bij paginawijziging.

## Synchronisatie tussen verschillende apparaten

Favorieten worden op de server opgeslagen in PostgreSQL, zodat ze automatisch tussen apparaten worden gesynchroniseerd wanneer de gebruiker is geverifieerd. De React Query-cache met een verouderde tijd van 5 minuten brengt frisheid in evenwicht met prestaties. Handmatige synchronisatie is mogelijk via de functie `refetch` .

## Toegankelijkheid

- De favoriete schakelknop wordt uitgeschakeld tijdens lopende mutaties om dubbele acties te voorkomen.
- Toastmeldingen geven feedback voor zowel succesvolle als mislukte bewerkingen.
- Het favorietenpaginaraster gebruikt dezelfde toegankelijke kaartcomponenten als de hoofdlijst.
- Lege en foutstatussen bevatten bruikbare elementen voor toetsenbordnavigatie.

## Gerelateerde documentatie

- [Feature Flags](/docs/template/configuration/feature-config) -- De favorietenfunctie in-/uitschakelen
- [Gedeelde kaartcomponenten](/docs/template/components/shared-card-components) -- Kaartweergave in het favorietenraster
- [Contextproviders](/docs/template/components/context-providers) -- Integratie van lay-outthema
- [Dashboardcomponenten](/docs/template/components/dashboard-components) -- Favoriete tellingen in analyses
