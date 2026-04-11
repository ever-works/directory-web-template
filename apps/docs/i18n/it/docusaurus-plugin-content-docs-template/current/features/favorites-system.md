---
id: favorites-system
title: Sistema Preferiti
sidebar_label: Preferiti
sidebar_position: 33
---

# Sistema Preferiti

La funzione Preferiti consente agli utenti autenticati di aggiungere segnalibri agli elementi della directory per un accesso rapido. Include una pagina dei preferiti dedicata, aggiornamenti ottimistici dell'interfaccia utente, un'API REST completa supportata da PostgreSQL e l'integrazione con flag di funzionalità per il rendering condizionale.

## Panoramica dell'architettura

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

## Schema del database

La tabella `favorites` memorizza le relazioni dei segnalibri tra utenti ed elementi:

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

### Decisioni di progettazione

- **Metadati denormalizzati** -- `itemName` , `itemIconUrl` e `itemCategory` vengono archiviati insieme allo slug in modo che l'elenco dei preferiti venga visualizzato senza unirsi alla tabella degli elementi.
- **Vincolo univoco composito** -- l'indice `(userId, itemSlug)` impedisce i preferiti duplicati a livello di database.
- **Ricerche indicizzate**: indici separati su `userId` , `itemSlug` e `createdAt` ottimizzano i modelli di query comuni per l'elenco, il conteggio e l'ordinamento cronologico.

## usa il gancio Preferiti

L'API principale lato client con supporto completo per gli aggiornamenti ottimistici:

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

### Valore restituito

| Immobile | Digitare | Descrizione |
|----------|------|-----|
| `favorites` | `Favorite[]` | Elenco attuale dei preferiti dell'utente |
| `isLoading` | `boolean` | Vero durante il recupero iniziale |
| `error` | `Error \| null` | Recupera l'errore, se presente |
| `refetch` | `() => void` | Recupera manualmente i preferiti |
| `isFavorited` | `(slug: string) => boolean` | Controlla se un elemento è aggiunto ai segnalibri |
| `toggleFavorite` | `(data: AddFavoriteRequest) => void` | Aggiungi o rimuovi in ​​base allo stato corrente |
| `addFavorite` | `(data: AddFavoriteRequest) => void` | Aggiungi un preferito esplicitamente |
| `removeFavorite` | `(slug: string) => void` | Rimuovere esplicitamente un preferito |
| `isAdding` | `boolean` | Vero mentre la mutazione aggiuntiva è in volo |
| `isRemoving` | `boolean` | Vero mentre rimuovi la mutazione è in volo |

### Flusso di aggiornamento ottimistico

Sia l'aggiunta che la rimozione delle mutazioni seguono il modello di aggiornamento ottimistico di React Query:

1. ** `onMutate` ** -- annulla le query in volo, scatta un'istantanea dello stato precedente, applica immediatamente la modifica ottimistica. Aggiungi mutazioni crea un preferito temporaneo con un ID prefisso `temp-` .
2. ** `onError` ** -- torna allo snapshot se la chiamata API fallisce, visualizza un avviso di errore.
3. ** `onSuccess` ** -- sostituisci la voce ottimistica con dati confermati dal server. La mutazione aggiuntiva sostituisce in modo intelligente la voce temporanea facendo corrispondere su `itemSlug` , prevenendo duplicati.

L'invalidazione `onSettled` è stata intenzionalmente omessa per evitare inutili recuperi. L'aggiornamento ottimistico più l'aggiornamento della cache `onSuccess` forniscono una consistenza sufficiente.

### Integrazione dei flag di funzionalità

La query è abilitata solo quando entrambe le condizioni sono soddisfatte:

```ts
enabled: !!user?.id && features.favorites,
staleTime: 5 * 60 * 1000, // 5 minutes
```

Quando il flag di funzionalità `favorites` è disabilitato o l'utente non è autenticato, l'hook restituisce un array vuoto senza effettuare alcuna richiesta di rete.

### Utilizzo

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

## Endpoint API

### OTTIENI /api/favorites

Restituisce tutti i preferiti dell'utente autenticato, ordinati per data di creazione.

### POST /api/preferiti

Aggiunge un elemento ai preferiti. Convalida con Zod e controlla i duplicati (restituisce 409 in caso di conflitto).

| Campo | Obbligatorio | Descrizione |
|-------|----------|-------------|
| `itemSlug` | Sì | Identificatore univoco dell'articolo |
| `itemName` | Sì | Nome visualizzato per l'elenco dei preferiti |
| `itemIconUrl` | No | URL dell'icona per il rendering |
| `itemCategory` | No | Etichetta di categoria |

### ELIMINA /api/favorites/[itemSlug]

Rimuove un elemento specifico dai preferiti dell'utente tramite slug. Restituisce 404 se non trovato.

## Pagina Preferiti

Il componente `FavoritesClient` visualizza la pagina completa dei preferiti:

1. **Porta di autenticazione**: richiesta di accesso per gli utenti non autenticati.
2. **Caricamento scheletro** -- segnaposto della griglia da 8 carte durante il recupero iniziale.
3. **Stato errore**: messaggio di errore con un pulsante Riprova.
4. **Stato vuoto**: messaggio con una sezione di fallback "articoli popolari".
5. **Griglia dei preferiti**: elementi visualizzati con ordinamento, impaginazione e cambio di layout.

### Opzioni di ordinamento

| Valore | Etichetta |
|-------|-------|
| `popularity` | Popolarità |
| `name-asc` | Nome A-Z |
| `name-desc` | Nome Z-A |
| `date-asc` | Più vecchio |

### Integrazione del layout

La pagina si integra con `useLayoutTheme()` per il cambio di visualizzazione griglia/elenco/scheda. Sopra gli elementi vengono visualizzati `ViewToggle` e `SortMenu` . L'impaginazione lato client divide i preferiti in pagine di 12, con `clampAndScrollToTop` al cambio pagina.

## Sincronizzazione tra dispositivi

I preferiti vengono archiviati sul lato server in PostgreSQL, quindi si sincronizzano automaticamente su tutti i dispositivi quando l'utente viene autenticato. La cache di React Query con un tempo di stallo di 5 minuti bilancia la freschezza con le prestazioni. La sincronizzazione manuale è disponibile tramite la funzione `refetch` .

## Accessibilità

- Il pulsante di attivazione/disattivazione dei preferiti viene disattivato durante le mutazioni in sospeso per evitare doppie azioni.
- Le notifiche toast forniscono feedback sia per le operazioni riuscite che per quelle fallite.
- La griglia della pagina dei preferiti utilizza gli stessi componenti accessibili della scheda dell'elenco principale.
- Gli stati vuoto ed errore includono elementi utilizzabili per la navigazione da tastiera.

## Documentazione correlata

- [Flag funzionalità](/docs/template/configuration/feature-config) -- Abilita/disabilita la funzione Preferiti
- [Componenti della scheda condivisa](/docs/template/components/shared-card-components) -- Rendering della scheda nella griglia dei preferiti
- [Fornitori di contesto](/docs/template/components/context-providers) -- Integrazione del tema del layout
- [Componenti del dashboard](/docs/template/components/dashboard-components) -- Conteggi preferiti nell'analisi
