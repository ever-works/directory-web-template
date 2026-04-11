---
id: item-submissions
title: Invii di articoli
sidebar_label: Invii di articoli
sidebar_position: 31
---

# Invii di articoli

Il sistema di invio degli elementi fornisce un flusso di lavoro completo che consente agli utenti di inviare, gestire e tenere traccia degli elenchi di directory. Include il monitoraggio dello stato (in sospeso, approvato, rifiutato), filtri, schede statistiche, modalità di dettaglio, modalità di modifica ed eliminazione con conferma.

## Panoramica dell'architettura

| Modulo | Percorso | Scopo |
|--------|------|---------|
| Elenco di invio | `components/submissions/submission-list.tsx` | Componente dell'elenco principale con impaginazione |
| Articolo di invio | `components/submissions/submission-item.tsx` | Scheda di presentazione individuale |
| Filtri di invio | `components/submissions/submission-filters.tsx` | Schede di stato e ricerca |
| SubmissionStatsCards | `components/submissions/submission-stats-cards.tsx` | Panoramica delle carte statistiche |
| ModificaInvioModale | `components/submissions/edit-submission-modal.tsx` | Modifica in linea modale |
| SubmissionDetailModal | `components/submissions/submission-detail-modal.tsx` | Visualizzazione dettagliata in sola lettura |
| Finestra di dialogo Elimina invio | `components/submissions/delete-submission-dialog.tsx` | Conferma cancellazione |
| Elemento Cestino | `components/submissions/trash-item.tsx` | Visualizzazione degli elementi cestinati |
| Piano Guardia | `lib/guards/plan-features.guard.ts` | Limiti di invio per piano |

## Modello dei dati di invio

L'interfaccia `Submission` rappresenta un invio nell'interfaccia utente:

```ts
export interface Submission {
  id: string;
  title: string;
  description: string;
  status: "approved" | "pending" | "rejected";
  submittedAt: string | null;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  source_url?: string;
}
```

L'helper `toSubmission` converte dal modello dati API:

```ts
export function toSubmission(
  item: ClientSubmissionData
): Submission {
  const approvedAt =
    item.status === 'approved' ? item.reviewed_at : undefined;
  const rejectedAt =
    item.status === 'rejected' ? item.reviewed_at : undefined;

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    status: (['approved', 'pending', 'rejected'].includes(
      item.status
    )
      ? item.status
      : 'pending') as Submission['status'],
    submittedAt: item.submitted_at || item.updated_at || null,
    approvedAt,
    rejectedAt,
    rejectionReason: item.review_notes,
    category: Array.isArray(item.category)
      ? item.category[0] || 'Uncategorized'
      : item.category || 'Uncategorized',
    tags: item.tags || [],
    views: item.views || 0,
    likes: item.likes || 0,
    source_url: item.source_url,
  };
}
```

## Componente Elenco di invio

Il componente `SubmissionList` rende l'elenco degli invii con gli stati caricamento, vuoto e popolato:

```tsx
export interface SubmissionListProps {
  items: ClientSubmissionData[];
  isLoading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
  deletingId?: string | null;
  updatingId?: string | null;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  emptyStateActionLabel?: string;
  emptyStateActionHref?: string;
  skeletonCount?: number;
}
```

Comportamenti chiave:

- **Stato di caricamento** -- visualizza i segnaposto `SubmissionItemSkeleton` - **Stato vuoto**: mostra un invito all'azione collegato a `/submit` - **Stato popolato** -- mappa gli elementi fino a `toSubmission()` e visualizza `SubmissionItem` per ciascuno
- **Indicatori di caricamento ottimistici** -- `deletingId` e `updatingId` disabilitano gli oggetti interessati

La variante `SubmissionListWithInfo` aggiunge la visualizzazione dei metadati di impaginazione.

## Configurazione dello stato

Ogni stato di invio è associato a un'icona, una combinazione di colori e una chiave di traduzione:

```ts
const statusConfig = {
  approved: {
    labelKey: "STATUS_APPROVED",
    icon: FiCheck,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
  },
  pending: {
    labelKey: "STATUS_PENDING",
    icon: FiClock,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  rejected: {
    labelKey: "STATUS_REJECTED",
    icon: FiX,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
  },
};
```

Gli invii rifiutati mostrano il motivo del rifiuto in una casella di richiamo rossa.

## Filtri di invio

Il componente `SubmissionFilters` fornisce il filtraggio dello stato in stile scheda e la ricerca di testo:

```tsx
export interface SubmissionFiltersProps {
  status: ClientStatusFilter;
  search: string;
  onStatusChange: (status: ClientStatusFilter) => void;
  onSearchChange: (search: string) => void;
  isSearching?: boolean;
  disabled?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
  };
}
```

Caratteristiche:

- **Schede Stato** -- Pulsanti pillola per Tutti, Approvato, In attesa e Rifiutato con badge di conteggio opzionali
- **Input di ricerca** -- Ricerca dell'intero testo con il pulsante Cancella e lo spinner di caricamento
- **Variante compatta** -- `SubmissionFiltersCompact` utilizza un menu a discesa per i layout con vincoli di spazio

## Carte statistiche

Il componente `SubmissionStatsCards` mostra quattro carte statistiche in una griglia:

```tsx
export interface SubmissionStatsCardsProps {
  stats: ClientItemStats;
  isLoading?: boolean;
}
```

Le quattro carte mostrano:

| Carta | Chiave | Colore |
|------|-----|-------|
| Invii totali | `total` | Blu |
| Approvato | `approved` | Verde |
| In attesa | `pending` | Giallo |
| Rifiutato | `rejected` | Rosso |

Ogni carta ha uno sfondo con icona sfumata, scheletro di caricamento animato ed effetto ombra al passaggio del mouse.

## Scheda oggetto di invio

Ogni `SubmissionItem` rappresenta:

- Titolo con badge di stato
- Descrizione troncata (morsetto a due righe)
- Fino a 5 tag con conteggio di overflow
- Riga dei metadati: categoria, data di invio, conteggio delle visualizzazioni, conteggio dei like
- Pulsanti di azione: Visualizza, Modifica, Elimina
- Caricamento degli spinner sui pulsanti modifica/elimina quando le operazioni sono in corso
- Stato disabilitato durante le operazioni di massa

## Limiti di invio basati sul piano

Il sistema Plan Guard controlla il numero di invii che un utente può effettuare:

```ts
// lib/guards/plan-features.guard.ts
export const PLAN_LIMITS = {
  free:     { max_submissions: 1   },
  standard: { max_submissions: 10  },
  premium:  { max_submissions: null }, // unlimited
};
```

Per verificare i limiti prima dell'invio:

```ts
const guard = createPlanGuard(userPlan);
guard.requireWithinLimit('max_submissions', currentCount);
// Throws if limit exceeded
```

Funzionalità aggiuntive previste dal piano per gli invii:

| Caratteristica | Gratuito | Norma | Premio |
|---------|------|----------|---------|
| Invia articoli | Sì | Sì | Sì |
| Immagini massime | 1| 5| Illimitato |
| Parole descrittive | 200| 500| Illimitato |
| Caricamento video | No | No | Sì |
| Distintivo verificato | No | Sì | Sì |
| Revisione prioritaria | No | Sì | Sì |
| Revisione immediata | No | No | Sì |
| Tempo di revisione (giorni) | 7| 3| 1|

## Flusso di lavoro di invio

1. **L'utente invia**: compila il modulo di invio in più passaggi
2. **Convalida**: vengono controllati i limiti del piano e la convalida degli input
3. **Archiviazione**: i dati degli articoli vengono archiviati nel CMS basato su Git tramite il servizio articoli
4. **Stato: in sospeso**: l'invio entra nella coda di revisione dell'amministratore
5. **Revisione amministratore**: l'amministratore approva o rifiuta con note facoltative
6. **Stato: Approvato/Rifiutato**: l'utente visualizza lo stato aggiornato nella propria dashboard
7. **Modifica**: gli utenti possono modificare gli invii (entro i limiti di modifica del piano)
8. **Elimina**: gli utenti possono eliminare i propri invii con una finestra di dialogo di conferma

## Internazionalizzazione

Tutto il testo dell'interfaccia utente utilizza traduzioni `next-intl` nello spazio dei nomi `client.submissions` :

- `NO_SUBMISSIONS_TITLE` -- Intestazione in stato vuoto
- `NO_SUBMISSIONS_DESC` -- Descrizione dello stato vuoto
- `SUBMIT_FIRST_PROJECT` -- Pulsante di invito all'azione
- `STATUS_APPROVED` , `STATUS_PENDING` , `STATUS_REJECTED` -- Etichette di stato
- `SUBMITTED` -- Prefisso della data
- `VIEWS_COUNT` , `LIKES_COUNT` -- Etichette metriche con parametro di conteggio
- `REJECTION_REASON` -- Etichetta di richiamo del rifiuto
- `SEARCH_PLACEHOLDER` -- Cerca segnaposto per l'input
- `SHOWING_RESULTS` , `PAGE_INFO` -- Testo dell'impaginazione

## Documentazione correlata

- [Moduli in più fasi](/docs/template/features/multi-step-forms) -- Implementazione del modulo di invio
- [Gestione amministrativa](/docs/template/features/admin-management) - Flusso di lavoro di revisione dell'amministratore
- [Votazioni e commenti](/docs/template/features/voting-comments) -- Coinvolgimento sugli invii
