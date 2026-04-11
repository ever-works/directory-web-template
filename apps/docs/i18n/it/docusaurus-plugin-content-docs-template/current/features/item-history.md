---
id: item-history
title: Cronologia e controllo degli articoli
sidebar_label: Cronologia e controllo degli articoli
sidebar_position: 17
---

# Cronologia e controllo degli articoli

Il modello Ever Works include un sistema completo di audit trail che tiene traccia di tutte le modifiche apportate agli articoli durante il loro ciclo di vita. Ogni creazione, aggiornamento, modifica di stato, revisione, eliminazione e ripristino viene registrato con informazioni dettagliate sulla modifica, identità dell'esecutore e timestamp.

## Panoramica dell'architettura

| Componente | Percorso | Scopo |
|---|---|---|
| `itemAuditService` | `lib/services/item-audit.service.ts` | Livello di servizio per la registrazione delle azioni di audit |
| `item-audit.queries.ts` | `lib/db/queries/item-audit.queries.ts` | Query del database per il registro di controllo CRUD |
| `useItemHistory` | `hooks/use-item-history.ts` | Hook React Query per recuperare i log di controllo |
| `ItemHistoryModal` | `components/admin/items/item-history-modal.tsx` | Interfaccia utente modale per visualizzare la cronologia degli elementi |

## Azioni di controllo

Il sistema tiene traccia di sei tipi di azioni:

| Azione | Costante | Descrizione |
|---|---|---|
| Creato | `ItemAuditAction.CREATED` | L'elemento è stato creato |
| Aggiornato | `ItemAuditAction.UPDATED` | I campi degli articoli sono stati modificati |
| Stato modificato | `ItemAuditAction.STATUS_CHANGED` | Lo stato dell'articolo è stato modificato |
| Recensito | `ItemAuditAction.REVIEWED` | L'elemento è stato rivisto (approvato/rifiutato) |
| Eliminato | `ItemAuditAction.DELETED` | L'elemento è stato eliminato (soft o hard) |
| Restaurato | `ItemAuditAction.RESTORED` | L'elemento è stato ripristinato dall'eliminazione |

## Campi tracciati

Il servizio di audit monitora i seguenti campi per il rilevamento delle modifiche:

| Campo | Digitare |
|---|---|
| `name` | Nome articolo |
| `description` | Descrizione articolo |
| `source_url` | URL fonte/prodotto |
| `category` | Assegnazione categoria |
| `tags` | Serie di tag |
| `collections` | Incarichi di raccolta |
| `featured` | Stato in primo piano |
| `icon_url` | URL icona/logo |
| `status` | Stato articolo |

## Servizio di verifica degli articoli

Il `itemAuditService` fornisce metodi di registrazione di alto livello che vengono chiamati da percorsi e servizi API.

### Creazione di elementi di registrazione

```tsx
import { logCreation } from '@/lib/services/item-audit.service';

await logCreation(item, { id: userId, name: userName });
// Logs: action=CREATED, metadata includes slug, category, tags
```

### Registrazione degli aggiornamenti degli elementi

```tsx
import { logUpdate } from '@/lib/services/item-audit.service';

await logUpdate(previousItem, updatedItem, { id: userId, name: userName });
// Automatically detects changes between previous and current state
// Uses STATUS_CHANGED action if status differs, UPDATED otherwise
// Only logs if actual changes are detected
```

### Registrazione delle recensioni

```tsx
import { logReview } from '@/lib/services/item-audit.service';

await logReview(item, 'pending', 'Looks good, approved!', { id: userId, name: userName });
// Logs: action=REVIEWED with previous status, new status, and review notes
```

### Cancellazione e ripristino della registrazione

```tsx
import { logDeletion, logRestoration } from '@/lib/services/item-audit.service';

await logDeletion(item, performer, true);  // soft delete
await logRestoration(item, performer);
```

### Design non bloccante

Tutta la registrazione di controllo è racchiusa in blocchi try-catch e non genererà errori che potrebbero bloccare l'operazione primaria:

```tsx
async function logAction(params: LogActionParams): Promise<void> {
  try {
    await createItemAuditLog(createParams);
  } catch (error) {
    // Log error but don't throw - audit logging should not block operations
    console.error('[ItemAuditService] Failed to log action:', error);
  }
}
```

## Rilevamento modifiche

La funzione `detectChanges` confronta gli stati di due elementi e restituisce una differenza dettagliata:

```tsx
import { detectChanges } from '@/lib/services/item-audit.service';

const changes = detectChanges(previousItem, updatedItem);
// Returns: { fieldName: { old: previousValue, new: currentValue } } or null
```

Esempio di output:

```json
{
  "name": { "old": "Old Name", "new": "New Name" },
  "tags": { "old": ["react", "nextjs"], "new": ["react", "nextjs", "typescript"] },
  "status": { "old": "pending", "new": "approved" }
}
```

La funzione gestisce l'uguaglianza profonda per gli array (confronto ordinato) e restituisce `null` se non vengono rilevate modifiche.

## Livello database

### Schema del registro di controllo

Ogni voce del registro di controllo contiene:

| Campo | Digitare | Descrizione |
|---|---|---|
| `id` | `string` | ID univoco |
| `itemId` | `string` | Slug/ID articolo |
| `itemName` | `string` | Nome dell'articolo al momento dell'azione |
| `action` | `ItemAuditActionValues` | Tipo di azione |
| `previousStatus` | `string \| null` | Stato prima dell'azione |
| `newStatus` | `string \| null` | Stato dopo l'azione |
| `changes` | `JSON \| null` | Dettagli della modifica a livello di campo |
| `performedBy` | `string \| null` | ID utente che ha eseguito l'azione |
| `performedByName` | `string \| null` | Nome visualizzato dell'utente |
| `notes` | `string \| null` | Note aggiuntive (ad es. commenti di revisione) |
| `metadata` | `JSON \| null` | Dati contestuali aggiuntivi |
| `createdAt` | `timestamp` | Quando si è verificata l'azione |

### Funzioni di interrogazione

| Funzione | Descrizione |
|---|---|
| `createItemAuditLog(data)` | Crea una nuova voce del registro di controllo |
| `getItemHistory(params)` | Ottieni cronologia impaginata con informazioni sull'esecutore |
| `getLatestItemAuditLog(itemId)` | Ottieni la voce di registro più recente |
| `getAuditLogsByAction(action, limit)` | Filtra i log per tipo di azione |
| `getAuditLogsByPerformer(userId, limit)` | Filtra i log per esecutore |
| `getItemAuditStats(itemId)` | Ottieni la suddivisione del conteggio per tipo di azione |

### Query sulla cronologia impaginata

```tsx
import { getItemHistory } from '@/lib/db/queries/item-audit.queries';

const result = await getItemHistory({
  itemId: 'my-item-slug',
  page: 1,
  limit: 20,
  actionFilter: ['updated', 'status_changed']
});

// Returns: { logs, total, page, limit, totalPages }
```

La query si unisce alla tabella `users` per includere l'e-mail dell'esecutore insieme a ciascuna voce di registro.

## Il gancio `useItemHistory`

```tsx
import { useItemHistory } from '@/hooks/use-item-history';

function ItemHistoryPanel({ itemId }) {
  const { data, isLoading, isError } = useItemHistory({
    itemId,
    page: 1,
    limit: 20,
    actionFilter: ['updated', 'reviewed'],
    enabled: true
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <p>Total entries: {data.total}</p>
      {data.logs.map(entry => (
        <div key={entry.id}>
          <span>{entry.action}</span>
          <span>{entry.performedByName}</span>
          <span>{entry.createdAt}</span>
        </div>
      ))}
    </div>
  );
}
```

### Configurazione del gancio

| Opzione | Predefinito | Descrizione |
|---|---|---|
| `itemId` | richiesto | ID oggetto/slug per recuperare la cronologia per |
| `page` | `1` | Numero di pagina |
| `limit` | `20` | Articoli per pagina |
| `actionFilter` | `undefined` | Matrice di tipi di azione in base a cui filtrare |
| `enabled` | `true` | Se la query è attiva |
| `staleTime` | 30 secondi | Durata aggiornamento cache |

## Modale cronologia articolo

Il componente `ItemHistoryModal` fornisce un'interfaccia utente completa per visualizzare la cronologia di controllo degli elementi:

```tsx
import { ItemHistoryModal } from '@/components/admin/items/item-history-modal';

<ItemHistoryModal
  isOpen={showHistory}
  itemId="my-item-slug"
  itemName="My Item Name"
  onClose={() => setShowHistory(false)}
/>
```

### Caratteristiche modali

| Caratteristica | Descrizione |
|---|---|
| Filtraggio delle azioni | Menu a discesa per filtrare per tipo di azione (Creato, Aggiornato, ecc.) |
| Voci codificate a colori | Ogni tipo di azione ha un'icona e una combinazione di colori distinti |
| Modifiche espandibili | Fare clic per espandere i dettagli della modifica a livello di campo |
| Timestamp relativi | "2 ore fa", "3 giorni fa" con la data completa al passaggio del mouse |
| Visualizzazione dell'esecutore | Mostra il nome utente, l'e-mail o il "Sistema" per le azioni automatizzate |
| Contesto della revisione | Mostra le etichette "Approvato"/"Rifiutato" e i motivi del rifiuto |
| Impaginazione | Impaginazione incorporata per storie lunghe |
| Supporto tastiera | Il tasto Escape chiude la finestra modale |

### Combinazione colori azione

| Azione | Colore | Icona |
|---|---|---|
| Creato | Verde | Inoltre |
| Aggiornato | Blu | Modifica2 |
| Stato modificato | Giallo | AggiornaCw |
| Recensito | Viola | ControllaCerchio |
| Eliminato | Rosso | Cestino2 |
| Restaurato | Verde acqua | Ruota in senso antiorario |

## File chiave

| File | Percorso |
|---|---|
| Servizio di audit | `lib/services/item-audit.service.ts` |
| Domande di controllo | `lib/db/queries/item-audit.queries.ts` |
| Gancio di storia | `hooks/use-item-history.ts` |
| Storia modale | `components/admin/items/item-history-modal.tsx` |
