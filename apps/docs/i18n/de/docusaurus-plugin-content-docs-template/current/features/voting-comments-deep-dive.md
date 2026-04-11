---
id: voting-comments-deep-dive
title: Abstimmung und Kommentare im Detail
sidebar_label: Abstimmung und Kommentare im Detail
sidebar_position: 36
---

# Abstimmungen und Kommentare im Detail

Dieser ausführliche Einblick deckt die internen Mechanismen der Abstimmungs- und Kommentarsysteme ab, einschließlich optimistischer Aktualisierungsalgorithmen, Cache-Verwaltungsstrategien, Bewertungsaggregation, komponentenübergreifender Ereigniskoordination und Administrator-Moderationsworkflows.

## Architekturübersicht

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

## Interna des Abstimmungssystems

### useItemVote Hook

Der Hook verwaltet den Abstimmungsstatus für ein einzelnes Element mit vollständiger optimistischer Update-Unterstützung:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Zustandsmaschine abstimmen

Die Funktion `handleVote` implementiert eine umschaltbare Zustandsmaschine:

| Aktueller Status | Aktion | Ergebnis | Nettoveränderung |
|--------------|--------|--------|------------|
| Keine Abstimmung | Klicken Sie auf Nach oben | Upvote | +1 |
| Keine Abstimmung | Klicken Sie auf „Nach unten |“. Downvote | -1 |
| Hochgestuft | Klicken Sie auf Nach oben | Abstimmung entfernen (ausschalten) | -1 |
| Hochgestuft | Klicken Sie auf „Nach unten |“. Zum Downvote wechseln | -2 |
| Abgestimmt | Klicken Sie auf „Nach unten |“. Abstimmung entfernen (ausschalten) | +1 |
| Abgestimmt | Klicken Sie auf Nach oben | Zu Upvote wechseln | +2 |

Wenn die aktuelle Stimme des Benutzers mit dem angeforderten Typ übereinstimmt, ruft der Hook `unvote()` (DELETE) auf. Andernfalls ruft es `vote(type)` (POST) auf.

### Optimistische Zählberechnung

Das optimistische Update berechnet die Zähldifferenz, ohne auf den Server zu warten:

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

Die `countDiff` -Berechnung behandelt drei Fälle: Ausschalten (1 subtrahieren), neue Abstimmung (1 addieren) und Richtungswechsel (2 addieren für den vollen Schwung).

### Authentifizierungsgate

Nicht authentifizierten Benutzern, die versuchen abzustimmen, wird ein Anmeldemodal angezeigt, anstatt eine Fehlermeldung zu erhalten:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

Der Fehler wird vom `onError` -Handler der Mutation abgefangen, der nach der Authentifizierungsnachricht sucht und den Fehlertoast unterdrückt.

### Abfragekonfiguration

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Cache-Dienstprogramme abstimmen

Der `useVoteCache` -Hook stellt komponentenübergreifende Cache-Operationen bereit:

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

## Kommentare Systeminterna

### useComments Hook

Der Hook bietet vollständige CRUD-Operationen mit integrierter Bewertungsunterstützung:

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

### Rückgabewert

| Eigentum | Geben Sie | ein Beschreibung |
|----------|------|-------------|
| `comments` | `CommentWithUser[]` | Kommentare mit ausgefüllten Benutzerdaten |
| `isPending` | `boolean` | Wahr beim ersten Abruf |
| `createComment` | `(data) => Promise` | Einen neuen Kommentar erstellen |
| `updateComment` | `(data) => Promise` | Bearbeiten Sie einen vorhandenen Kommentar |
| `deleteComment` | `(id) => Promise` | Einen Kommentar entfernen |
| `rateComment` | `(data) => void` | Bewerten Sie einen Kommentar |
| `updateCommentRating` | `(data) => void` | Eine vorhandene Bewertung aktualisieren |
| `commentRating` | `number` | Gesamtbewertung für den Artikel |

### Komponentenübergreifendes Ereignissystem

Das Kommentarsystem löst benutzerdefinierte DOM-Ereignisse zur Koordination zwischen Komponenten aus, die keine React Query-Cache-Schlüssel gemeinsam nutzen:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Dadurch können Komponenten wie der Elementdetail-Header (der die Anzahl der Kommentare anzeigt) auf Kommentaränderungen reagieren, ohne direkt an die Kommentarabfrage gekoppelt zu sein.

### Bewertungsaggregation

Kommentare und Bewertungen sind eng integriert. Nach jeder Kommentaränderung (Erstellen, Aktualisieren, Löschen) erzwingt der Hook einen erneuten Abruf der Artikelbewertung:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Dadurch wird sichergestellt, dass die Sternebewertungsanzeige sofort aktualisiert wird, nachdem ein Benutzer eine Bewertung übermittelt oder bearbeitet.

### Abfragestabilität

Die Kommentarabfrage verwendet konservative Aktualisierungseinstellungen, um ein Flimmern der Benutzeroberfläche zu verhindern:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Admin-Moderation

### useAdminComments Hook

Der Admin-Moderations-Hook bietet eine paginierte Kommentarverwaltung:

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

### Moderationsworkflow

1. Der Administrator navigiert zur Kommentarverwaltungsseite.
2. Kommentare werden mit Suche und Paginierung angezeigt.
3. Der Status `isDeleting` verfolgt, welcher Kommentar entfernt wird, und deaktiviert seine Zeile.
4. Das Löschen löst eine Benachrichtigung des Kommentarautors über `NotificationService` aus.

## API-Endpunkte

| Methode | Endpunkt | Beschreibung |
|--------|----------|-------------|
| GET | `/api/items/:id/votes` | Stimmenanzahl und Benutzerstimme abrufen |
| POST | `/api/items/:id/votes` | Eine Stimme abgeben oder ändern |
| LÖSCHEN | `/api/items/:id/votes` | Eine Stimme entfernen |
| GET | `/api/items/:id/comments` | Kommentare mit Benutzerdaten abrufen |
| POST | `/api/items/:id/comments` | Einen neuen Kommentar erstellen |
| PUT | `/api/items/:id/comments/:commentId` | Einen Kommentar aktualisieren |
| LÖSCHEN | `/api/items/:id/comments/:commentId` | Einen Kommentar löschen |
| POST | `/api/items/:id/comments/rating` | Bewerten Sie einen Kommentar |
| PUT | `/api/items/:id/comments/rating` | Aktualisieren Sie eine Kommentarbewertung |
| GET | `/api/items/:id/comments/rating` | Gesamte Artikelbewertung abrufen |

## Feature-Flag-Integration

Sowohl Abstimmungen als auch Kommentare respektieren Feature-Flags:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Wenn die Datenbank nicht konfiguriert ist, werden diese Funktionen automatisch deaktiviert.

## Barrierefreiheit

- Abstimmungsschaltflächen verwenden `aria-pressed` , um den aktuellen Abstimmungsstatus anzuzeigen.
– Das Anmeldemodal, das durch nicht authentifizierte Abstimmungsversuche ausgelöst wird, ist im Fokus gefangen.
- Kommentarformulare verwenden die richtigen `<label>` -Zuordnungen und Validierungsnachrichten.
- Die Sternebewertungskomponente unterstützt die Tastaturnavigation mit Pfeiltasten.
- Admin-Moderationstabellen enthalten Statusanzeigen auf Zeilenebene und über die Tastatur zugängliche Aktionen.
- Lade- und Fehlerzustände stellen jeweils `aria-busy` - und `role="alert"` -Attribute bereit.

## Verwandte Dokumentation

– [Übersicht über Abstimmungen und Kommentare](/docs/template/features/voting-comments) – Übersicht über die Funktionen auf hoher Ebene
– [Elementdetailkomponenten](/docs/template/components/item-detail-components) – Wo Stimmen und Kommentare gerendert werden
– [Benachrichtigungssystem](/docs/template/features/notification-system) – Durch Kommentare ausgelöste Benachrichtigungen
- [Dashboard-Komponenten](/docs/template/components/dashboard-components) – Abstimmungs- und Kommentaranalyse
