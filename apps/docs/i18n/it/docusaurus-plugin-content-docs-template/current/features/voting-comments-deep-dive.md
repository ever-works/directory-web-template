---
id: voting-comments-deep-dive
title: Votazioni e commenti Approfondimento
sidebar_label: Votazioni e commenti Approfondimento
sidebar_position: 36
---

# Votazioni e commenti Approfondimento

Questo approfondimento copre i meccanismi interni dei sistemi di voto e di commento, inclusi algoritmi di aggiornamento ottimistici, strategie di gestione della cache, aggregazione di valutazioni, coordinamento di eventi tra componenti e flussi di lavoro di moderazione dell'amministratore.

## Panoramica dell'architettura

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

## Componenti interni del sistema di voto

### usa il gancio VotoArticolo

L'hook gestisce lo stato del voto per un singolo elemento con il supporto completo dell'aggiornamento ottimistico:

```ts
interface ItemVoteResponse {
  count: number;
  userVote: 'up' | 'down' | null;
}

function useItemVote(itemId: string) {
  // Returns: voteCount, userVote, isLoading, handleVote, refreshVotes
}
```

### Vota la macchina statale

La funzione `handleVote` implementa una macchina a stati basata su toggle:

| Stato attuale | Azione | Risultato | Variazione netta |
|--------------|--------|--------|------------|
| Nessun voto | Fare clic su | Voto positivo | +1 |
| Nessun voto | Fare clic su Giù | Voto negativo | -1 |
| Votato positivamente | Fare clic su | Rimuovi voto (disattiva) | -1 |
| Votato positivamente | Fare clic su Giù | Passa al voto negativo | -2 |
| Sottovotato | Fare clic su Giù | Rimuovi voto (disattiva) | +1 |
| Sottovotato | Fare clic su | Passa al voto positivo | +2 |

Quando il voto corrente dell'utente corrisponde al tipo richiesto, l'hook chiama `unvote()` (DELETE). Altrimenti chiama `vote(type)` (POST).

### Calcolo del conteggio ottimistico

L'aggiornamento ottimistico calcola il differenziale di conteggio senza attendere il server:

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

Il calcolo `countDiff` gestisce tre casi: disattivazione (sottrai 1), nuovo voto (aggiungi 1) e cambio di direzione (aggiungi 2 per lo swing completo).

### Porta di autenticazione

Agli utenti non autenticati che tentano di votare viene mostrata una modalità di accesso invece di ricevere un errore:

```ts
if (!user) {
  loginModal.onOpen('Please sign in to vote on this item');
  throw new Error('Authentication required');
}
```

L'errore viene catturato dal gestore `onError` della mutazione, che controlla il messaggio di autenticazione e sopprime l'avviso di errore.

### Configurazione della query

```ts
staleTime: 1000 * 60 * 5,  // 5 minutes
gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
retry: (failureCount, error) => {
  if (error.message.includes('sign in')) return false; // No retry for auth errors
  return failureCount < 2;                              // 2 retries for other errors
},
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
```

### Utilità della cache dei voti

L'hook `useVoteCache` fornisce operazioni di cache tra componenti:

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

## Commenti Componenti interni del sistema

### usaCommenti Hook

L'hook fornisce operazioni CRUD complete con supporto di classificazione integrato:

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

### Valore restituito

| Immobile | Digitare | Descrizione |
|----------|------|-----|
| `comments` | `CommentWithUser[]` | Commenti con dati utente popolati |
| `isPending` | `boolean` | Vero durante il recupero iniziale |
| `createComment` | `(data) => Promise` | Crea un nuovo commento |
| `updateComment` | `(data) => Promise` | Modifica un commento esistente |
| `deleteComment` | `(id) => Promise` | Rimuovi un commento |
| `rateComment` | `(data) => void` | Vota un commento |
| `updateCommentRating` | `(data) => void` | Aggiorna una valutazione esistente |
| `commentRating` | `number` | Valutazione complessiva per l'articolo |

### Sistema di eventi multicomponente

Il sistema di commenti invia eventi DOM personalizzati per il coordinamento tra i componenti che non condividono le chiavi della cache di React Query:

```ts
const COMMENT_MUTATION_EVENT = "comment:mutated";

const dispatchCommentEvent = (comment: CommentWithUser) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMMENT_MUTATION_EVENT, { detail: comment }));
};
```

Ciò consente a componenti come l'intestazione dei dettagli dell'elemento (che mostra il conteggio dei commenti) di reagire alle modifiche dei commenti senza essere direttamente accoppiati alla query dei commenti.

### Aggregazione dei voti

Commenti e valutazioni sono strettamente integrati. Dopo qualsiasi mutazione del commento (creazione, aggiornamento, eliminazione), l'hook forza un recupero della valutazione dell'elemento:

```ts
onSuccess: async (newComment) => {
  queryClient.setQueryData(['comments', itemId], (old = []) => {
    // Update cache with new comment...
  });
  dispatchCommentEvent(newComment);
  await queryClient.refetchQueries({ queryKey: ['item-rating', itemId] });
},
```

Ciò garantisce che la visualizzazione della valutazione a stelle venga aggiornata immediatamente dopo che un utente ha inviato o modificato una recensione.

### Stabilità delle query

La query dei commenti utilizza impostazioni di aggiornamento conservatrici per evitare lo sfarfallio dell'interfaccia utente:

```ts
staleTime: 2 * 60 * 1000,      // 2 minutes
gcTime: 10 * 60 * 1000,        // 10 minutes
refetchOnMount: false,           // Don't refetch if data is fresh
refetchOnWindowFocus: false,     // Prevent flash on tab switch
```

## Moderazione amministrativa

### usaAdminComments Hook

L'hook di moderazione dell'amministratore fornisce la gestione dei commenti impaginati:

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

### Flusso di lavoro di moderazione

1. L'amministratore accede alla pagina di gestione dei commenti.
2. I commenti vengono visualizzati con la ricerca e l'impaginazione.
3. Lo stato `isDeleting` tiene traccia del commento che viene rimosso, disabilitandone la riga.
4. La cancellazione attiva una notifica all'autore del commento tramite `NotificationService` .

## Endpoint API

| Metodo | Punto finale | Descrizione |
|--------|----------|-------------|
| OTTIENI | `/api/items/:id/votes` | Recupera il conteggio dei voti e il voto dell'utente |
| POST | `/api/items/:id/votes` | Esprimi o modifica un voto |
| ELIMINA | `/api/items/:id/votes` | Rimuovere un voto |
| OTTIENI | `/api/items/:id/comments` | Recupera commenti con i dati utente |
| POST | `/api/items/:id/comments` | Crea un nuovo commento |
| METTERE | `/api/items/:id/comments/:commentId` | Aggiorna un commento |
| ELIMINA | `/api/items/:id/comments/:commentId` | Elimina un commento |
| POST | `/api/items/:id/comments/rating` | Vota un commento |
| METTERE | `/api/items/:id/comments/rating` | Aggiorna una valutazione del commento |
| OTTIENI | `/api/items/:id/comments/rating` | Ottieni la valutazione complessiva degli articoli |

## Integrazione dei flag di funzionalità

Sia la votazione che i commenti rispettano i flag di funzionalità:

```ts
const flags = getFeatureFlags();
// flags.ratings -- Controls star rating display
// flags.comments -- Controls comment section visibility
```

Quando il database non è configurato, queste funzionalità vengono automaticamente disabilitate.

## Accessibilità

- I pulsanti Vota utilizzano `aria-pressed` per indicare lo stato attuale del voto.
- La modalità di accesso attivata da tentativi di voto non autenticati è intrappolata nel focus.
- I moduli di commento utilizzano associazioni `<label>` e messaggi di convalida corretti.
- Il componente di valutazione a stelle supporta la navigazione da tastiera con i tasti freccia.
- Le tabelle di moderazione dell'amministratore includono indicatori di stato a livello di riga e azioni accessibili dalla tastiera.
- Gli stati di caricamento e di errore forniscono rispettivamente gli attributi `aria-busy` e `role="alert"` .

## Documentazione correlata

- [Panoramica su votazioni e commenti](/docs/template/features/voting-comments) -- Panoramica delle funzionalità di alto livello
- [Componenti dettaglio articolo](/docs/template/components/item-detail-components) -- Dove vengono visualizzati voti e commenti
- [Sistema di notifica](/docs/template/features/notification-system) -- Notifiche attivate dai commenti
- [Componenti della dashboard](/docs/template/components/dashboard-components) -- Analisi di voti e commenti
