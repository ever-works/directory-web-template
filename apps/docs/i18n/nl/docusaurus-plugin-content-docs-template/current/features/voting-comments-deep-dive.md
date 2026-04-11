---
id: voting-comments-deep-dive
title: Stemmen en opmerkingen Deep Dive
sidebar_label: Stemmen en opmerkingen Deep Dive
sidebar_position: 36
---

# Stemmen en opmerkingen Deep Dive

Deze diepgaande duik behandelt de interne mechanismen van de stem- en commentaarsystemen, inclusief optimistische update-algoritmen, cachebeheerstrategieën, aggregatie van beoordelingen, coördinatie van evenementen over meerdere componenten en workflows voor beheerdersmoderatie.

## Architectuuroverzicht

```
hooks/
  use-item-vote.ts           # Vote hook with optimistic mutations and cache utilities
  use-comments.ts            # Comment CRUD hook with rating integration
  use-admin-comments.ts      # Admin moderation hook with pagination

app/api/items/[id]/
  votes/route.ts             # GET/POST/DELETE vote endpoints
  comments/route.ts          # GET/POST comment endpoints
  comments/[commentId]/route.ts  # PUT/DELETE single comment
  comments/rating/route.ts   # POST/PUT/GET rating endpoints

lib/db/schema.ts             # votes and comments table definitions
```

## Interne onderdelen van het stemsysteem

### gebruikItemVote Hook

De hook beheert de stemstatus voor een enkel item met volledige ondersteuning voor optimistische updates:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Stem op de staatsmachine

De functie `handleVote` implementeert een op toggle gebaseerde statusmachine:

| Huidige staat | Actie | Resultaat | Nettoverandering |
|--------------|--------|--------|-----------|
| Geen stem | Klik op Omhoog | Stem omhoog | +1 |
| Geen stem | Klik op Omlaag | Stem omlaag | -1 |
| Omhoog gestemd | Klik op Omhoog | Stem verwijderen (uitschakelen) | -1 |
| Omhoog gestemd | Klik op Omlaag | Schakel over naar downvote | -2 |
| Gedownvote | Klik op Omlaag | Stem verwijderen (uitschakelen) | +1 |
| Gedownvote | Klik op Omhoog | Schakel over naar stemmen | +2 |

Wanneer de huidige stem van de gebruiker overeenkomt met het gevraagde type, roept de hook `unvote()` (DELETE). Anders wordt `vote(type)` (POST) aangeroepen.

### Berekening van optimistische tellingen

De optimistische update berekent het telverschil zonder op de server te wachten:

```ts
onMutate: async (type) => {
  const previousVotes = queryClient.getQueryData(['item-votes', itemId]);
  queryClient.setQueryData(['item-votes', itemId], (old) => {
    if (!old) return { count: type === 'up' ? 1 : -1, userVote: type };
    const countDiff = old.userVote === type ? -1
      : old.userVote === null ? 1
      : 2; // switching direction
    return {
      count: old.count + (type === 'up' ? countDiff : -countDiff),
      userVote: old.userVote === type ? null : type
    };
  });
  return { previousVotes };
},
```

De `countDiff` -berekening behandelt drie gevallen: uitschakeling (1 aftrekken), nieuwe stem (1 optellen) en van richting veranderen (2 optellen voor de volledige swing).

### Authenticatiepoort

Niet-geverifieerde gebruikers die proberen te stemmen, krijgen een login-modaliteit te zien in plaats van een foutmelding te krijgen:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

De fout wordt opgemerkt door de `onError` -handler van de mutatie, die controleert op het authenticatiebericht en de fouttoast onderdrukt.

### Queryconfiguratie

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Hulpprogramma's voor stemcache

De `useVoteCache` hook biedt cross-component cachebewerkingen:

```ts
function useVoteCache() {
  return {
    invalidateAllVotes,    // Invalidate all vote queries
    invalidateItemVotes,   // Invalidate votes for a specific item
    clearVoteCache,        // Remove all vote data from cache
    prefetchItemVotes,     // Pre-fetch votes for an item (e.g., on hover)
  };
}
```

## Opmerkingen Systeeminterne onderdelen

### gebruikCommentaren Hook

De hook biedt volledige CRUD-bewerkingen met geïntegreerde ratingondersteuning:

```ts
interface CreateCommentData {
  content: string;
  itemId: string;
  rating: number;
}

interface UpdateCommentData {
  commentId: string;
  content?: string;
  rating?: number;
}
```

### Retourwaarde

| Eigendom | Typ | Beschrijving |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | Opmerkingen met ingevulde gebruikersgegevens |
| `isPending` | `boolean` | Waar tijdens initiële ophaalactie |
| `createComment` | `(data) => Promise` | Creëer een nieuwe reactie |
| `updateComment` | `(data) => Promise` | Een bestaande opmerking bewerken |
| `deleteComment` | `(id) => Promise` | Een reactie verwijderen |
| `rateComment` | `(data) => void` | Beoordeel een reactie |
| `updateCommentRating` | `(data) => void` | Een bestaande beoordeling bijwerken |
| `commentRating` | `number` | Totale beoordeling voor het artikel |

### Component-gebeurtenissysteem

Het commentaarsysteem verzendt aangepaste DOM-gebeurtenissen voor coördinatie tussen componenten die geen React Query-cachesleutels delen:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Hierdoor kunnen componenten zoals de itemdetailkop (die het aantal reacties weergeeft) reageren op wijzigingen in het commentaar zonder direct aan de commentaarquery te zijn gekoppeld.

### Aggregatie van beoordelingen

Opmerkingen en beoordelingen zijn nauw geïntegreerd. Na elke opmerkingsmutatie (aanmaken, bijwerken, verwijderen), dwingt de hook het opnieuw ophalen van de itembeoordeling af:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Dit zorgt ervoor dat de weergave van de sterbeoordeling onmiddellijk wordt bijgewerkt nadat een gebruiker een recensie heeft ingediend of bewerkt.

### Querystabiliteit

De commentaarquery gebruikt conservatieve vernieuwingsinstellingen om flikkering van de gebruikersinterface te voorkomen:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Beheerdermoderatie

### gebruikAdminComments Hook

De admin moderatie hook biedt gepagineerd commentaarbeheer:

```ts
function useAdminComments({ page, limit, search }) {
  return {
    comments: AdminCommentItem[],
    totalComments: number,
    totalPages: number,
    isDeleting: string | null,  // ID of comment being deleted
    deleteComment: (id: string) => Promise<boolean>,
  };
}
```

### Moderatieworkflow

1. De beheerder navigeert naar de opmerkingenbeheerpagina.
2. Reacties worden weergegeven met zoeken en paginering.
3. De `isDeleting` geeft aan welk commentaar wordt verwijderd, waardoor de rij wordt uitgeschakeld.
4. Het verwijderen activeert een melding aan de auteur van het commentaar via `NotificationService` .

## API-eindpunten

| Werkwijze | Eindpunt | Beschrijving |
|--------|----------|------------|
| KRIJG | `/api/items/:id/votes` | Haal het aantal stemmen en de stem van de gebruiker op |
| POST | `/api/items/:id/votes` | Een stem uitbrengen of wijzigen |
| VERWIJDEREN | `/api/items/:id/votes` | Een stem verwijderen |
| KRIJG | `/api/items/:id/comments` | Opmerkingen ophalen met gebruikersgegevens |
| POST | `/api/items/:id/comments` | Creëer een nieuwe reactie |
| ZET | `/api/items/:id/comments/:commentId` | Een reactie bijwerken |
| VERWIJDEREN | `/api/items/:id/comments/:commentId` | Een opmerking verwijderen |
| POST | `/api/items/:id/comments/rating` | Beoordeel een reactie |
| ZET | `/api/items/:id/comments/rating` | Een commentaarbeoordeling bijwerken |
| KRIJG | `/api/items/:id/comments/rating` | Verzamelde itembeoordeling verkrijgen |

## Functievlag-integratie

Zowel stemmen als commentaar respecteren de kenmerkende vlaggen:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Wanneer de database niet is geconfigureerd, worden deze functies automatisch uitgeschakeld.

## Toegankelijkheid

- Stemknoppen gebruiken `aria-pressed` om de huidige stemstatus aan te geven.
- Het inlogmodel dat wordt geactiveerd door niet-geverifieerde stempogingen is focus-trapped.
- Commentaarformulieren gebruiken de juiste `<label>` -associaties en validatieberichten.
- De sterbeoordelingscomponent ondersteunt toetsenbordnavigatie met pijltoetsen.
- Beheertabellen bevatten statusindicatoren op rijniveau en via het toetsenbord toegankelijke acties.
- Laad- en foutstatussen bieden respectievelijk de kenmerken `aria-busy` en `role="alert"` .

## Gerelateerde documentatie

- [Overzicht stemmen en reacties](/docs/template/features/voting-comments) -- Functieoverzicht op hoog niveau
- [Item Detail Components](/docs/template/components/item-detail-components) -- Waar stemmen en opmerkingen worden weergegeven
- [Meldingssysteem](/docs/template/features/notification-system) -- Door opmerkingen geactiveerde meldingen
- [Dashboardcomponenten](/docs/template/components/dashboard-components) -- Stem- en commentaaranalyse
