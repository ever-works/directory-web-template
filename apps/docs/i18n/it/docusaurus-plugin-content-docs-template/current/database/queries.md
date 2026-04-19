---
id: queries
title: Riferimento alle query del database
sidebar_label: Domande
sidebar_position: 2
---

# Riferimento alle query del database

La directory `lib/db/queries/` contiene oltre 23 moduli di query organizzati per dominio. Ogni modulo incapsula le query Drizzle ORM per un'area di funzionalità specifica, seguendo il principio di responsabilità unica.

## Panoramica del modulo

Tutti i moduli di query vengono esportati in barile da `lib/db/queries/index.ts` per una comoda importazione:

```typescript
import { getUser, getUserByEmail } from '@/lib/db/queries';
```

## Moduli di interrogazione

### attività.queries.ts

Registrazione e recupero delle attività per il sistema di audit trail.

**Funzioni chiave:**
- Registrare le attività dell'utente (accesso, registrazione, modifiche all'account)
- Interroga la cronologia delle attività per utente o intervallo di date

### auth.queries.ts

Operazioni del database relative all'autenticazione.

**Funzioni chiave:**
- Trova l'utente tramite e-mail per l'autenticazione delle credenziali
- Crea e verifica i token di reimpostazione della password
- Gestisci i token di verifica

### client.queries.ts

Il modulo di query più grande (37KB), che gestisce tutte le operazioni rivolte al client.

**Funzioni chiave:**
- Operazioni CRUD del profilo cliente
- Invio e gestione di articoli cliente
- Aggregazione dei dati del dashboard del cliente
- Cerca e filtra i dati dei clienti
- Query di elenchi impaginati

### comment.queries.ts

Commentare le operazioni del sistema.

**Funzioni chiave:**
- Crea, aggiorna ed elimina temporaneamente i commenti
- Recupera i commenti per elemento con l'impaginazione
- Query di moderazione dei commenti (amministratore)
- Aggregazione dei rating

### azienda.queries.ts

Domande sulla direzione aziendale.

**Funzioni chiave:**
- Operazioni CRUD aziendali
- Ricerca e filtraggio delle aziende
- Gestione associazione articolo-azienda
- Statistiche e analisi aziendali

### dashboard.queries.ts

Aggregazione dei dati del dashboard sia per i dashboard di amministrazione che per quelli client.

**Funzioni chiave:**
- Statistiche del dashboard di amministrazione (utenti totali, articoli, entrate)
- Statistiche sulla dashboard del cliente (invii, visualizzazioni, coinvolgimento)
- Dati di serie temporali per i grafici
- Riepiloghi delle attività

### engagement.queries.ts

Metriche di coinvolgimento aggregate relative a visualizzazioni, voti, preferiti e commenti.

**Funzioni chiave:**
- Ottieni punteggi di coinvolgimento per gli articoli
- Conteggi delle visualizzazioni aggregate
- Calcola le metriche di popolarità
- Classifiche di coinvolgimento

### integrazione-mapping.queries.ts

Operazioni di mappatura dell'integrazione CRM.

**Funzioni chiave:**
- Creare e aggiornare le mappature di integrazione
- Cerca gli ID CRM da Ever ID e viceversa
- Tieni traccia dei timestamp di sincronizzazione e degli hash delle versioni
- Operazioni di mappatura in blocco

### item.queries.ts

Query sugli elementi principali (gli elementi sono archiviati in Git, ma i metadati vengono tracciati nel database).

**Funzioni chiave:**
- Operazioni sui metadati dell'articolo
- Monitoraggio della visualizzazione degli articoli
- Dati sul coinvolgimento degli articoli

### item-audit.queries.ts

Operazioni del registro di controllo degli elementi.

**Funzioni chiave:**
- Registra le azioni di creazione, aggiornamento, eliminazione e revisione degli elementi
- Interrogare la cronologia dei controlli per elementi specifici
- Filtra i log di controllo per tipo di azione, artista o intervallo di date

### item-view.queries.ts

Monitoraggio e analisi della visualizzazione degli articoli.

**Funzioni chiave:**
- Registra visualizzazioni giornaliere uniche (deduplicate per ID visualizzatore e data)
- Conteggi delle visualizzazioni di query per elemento e intervallo di date
- Visualizza l'aggregazione di analisi

### location-index.queries.ts

Ricerca e indicizzazione basate sulla posizione.

**Funzioni chiave:**
- Query geospaziali per elementi vicini
- Gestione dell'indice di posizione
- Calcoli delle distanze
- Ricerca basata sulla posizione con filtri

### moderazione.queries.ts

Sistema di moderazione dei contenuti.

**Funzioni chiave:**
- Creare e gestire report sui contenuti
- Aggiorna lo stato e la risoluzione del report
- Registra le azioni di moderazione
- Statistiche di moderazione e gestione delle code

### newsletter.queries.ts

Gestione iscrizione newsletter.

**Funzioni chiave:**
- Operazioni di iscrizione e cancellazione
- Controlla lo stato dell'abbonamento
- Elenca gli abbonati attivi
- Tieni traccia della cronologia di invio delle e-mail

### pagamento.queries.ts

Operazioni del database relative ai pagamenti.

**Funzioni chiave:**
- Gestione dei fornitori di servizi di pagamento
- Collegamento del conto di pagamento
- Registrazione delle transazioni
- Query sulla cronologia dei pagamenti

### report.queries.ts

Query del sistema di reporting dei contenuti.

**Funzioni chiave:**
- Creare report (elemento o commento)
- Elenca i report con filtri e impaginazione
- Aggiorna lo stato del rapporto
- Report analitici

### sottoscrizione.queries.ts

Gestione del ciclo di vita dell'abbonamento (17KB).

**Funzioni chiave:**
- Creare e aggiornare abbonamenti
- Transizioni dello stato dell'abbonamento
- Registrazione della cronologia degli abbonamenti
- Trova abbonamenti per utente o ID fornitore
- Operazioni di rinnovo e cancellazione
- Analisi degli abbonamenti

### sondaggio.queries.ts

Operazioni del sistema di rilevamento.

**Funzioni chiave:**
- Sondaggio sulle operazioni CRUD
- Registrazione delle risposte al sondaggio
- Aggregazione e analisi delle risposte
- Gestione stato sondaggio (bozza, pubblicato, chiuso)

### utente.queries.ts

Query sulla gestione degli utenti.

**Funzioni chiave:**
- Operazioni CRUD dell'utente
- Ricerca e filtraggio degli utenti
- Gestione dei ruoli utente
- Eliminazione dell'account (eliminazione temporanea)

### voto.queries.ts

Operazioni del sistema di voto.

**Funzioni chiave:**
- Crea, aggiorna e rimuovi voti
- Controlla i voti esistenti per una coppia utente-elemento
- Conteggi dei voti aggregati per articolo
- Commutazione del tipo di voto (voto positivo/voto negativo)

## Utilità condivise

### tipi.ts

Tipi TypeScript condivisi utilizzati nei moduli di query:

```typescript
// Common query parameter types
export interface PaginationParams {
  page: number;
  limit: number;
}
```

### utils.ts

Funzioni di utilità condivisa per la creazione di query:

- Aiutanti di impaginazione (calcolo dell'offset, formattazione dei risultati)
- Costruttori di filtri comuni
- Helper dei frammenti SQL

## Modelli di query

### Modello di query standard

Tutti i moduli di query seguono uno schema coerente:

```typescript
import { db } from '../drizzle';
import { eq, desc, and, sql } from 'drizzle-orm';
import { tableName } from '../schema';

export async function getItemById(id: string) {
  const result = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1);
  return result[0] || null;
}
```

### Query impaginate

Molti moduli implementano query impaginate:

```typescript
export async function getItems(page: number, limit: number) {
  const offset = (page - 1) * limit;
  const [items, countResult] = await Promise.all([
    db.select().from(tableName)
      .orderBy(desc(tableName.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(tableName),
  ]);
  return {
    items,
    total: Number(countResult[0].count),
    page,
    limit,
  };
}
```

### Query di aggregazione

I moduli di coinvolgimento e dashboard utilizzano l'aggregazione SQL:

```typescript
export async function getEngagementScore(itemId: string) {
  const result = await db.execute(sql`
    SELECT
      COALESCE(v.vote_count, 0) as votes,
      COALESCE(c.comment_count, 0) as comments,
      COALESCE(f.favorite_count, 0) as favorites,
      COALESCE(iv.view_count, 0) as views
    FROM ...
  `);
  return result;
}
```

## Convenzione sull'importazione

Importa funzioni di query tramite l'esportazione a botte:

```typescript
// Preferred: import from barrel
import { getUser, createSubscription, getVotesByItem } from '@/lib/db/queries';

// Also valid: import from specific module
import { getUser } from '@/lib/db/queries/user.queries';
```
