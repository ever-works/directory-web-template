---
id: view-tracking
title: Visualizza monitoraggio e coinvolgimento
sidebar_label: Visualizza il monitoraggio
sidebar_position: 35
---

# Visualizza monitoraggio e coinvolgimento

Il modello include un sistema di monitoraggio delle visualizzazioni attento alla privacy che registra visualizzazioni giornaliere uniche per articolo. Alimenta il conteggio delle visualizzazioni sulle pagine degli articoli, l'analisi della dashboard, le classifiche degli articoli di tendenza e il punteggio di popolarità.

## Panoramica dell'architettura

```
components/tracking/
  item-view-tracker.tsx       # Client-side tracking component

app/api/items/[slug]/views/
  route.ts                    # POST endpoint for recording views

lib/db/queries/
  item-view.queries.ts        # Aggregation and recording functions

lib/utils/
  bot-detection.ts            # User-agent bot pattern matching

lib/constants/
  analytics.ts                # Cookie names and configuration
```

## Pipeline di elaborazione

Quando un utente visita la pagina dei dettagli di un articolo, il componente `ItemViewTracker` attiva una richiesta POST. Il server lo elabora attraverso una pipeline a più fasi:

```
Request arrives
  |
  +--> Database availability check
  |      (returns 503 if unavailable)
  |
  +--> Bot detection (user-agent analysis)
  |      (skips recording if bot detected)
  |
  +--> Item existence check
  |      (returns 404 if not found)
  |
  +--> Owner exclusion
  |      (skips if session user owns the item)
  |
  +--> Cookie-based viewer identification
  |      (reads or creates first-party cookie)
  |
  +--> Daily deduplication insert
         (ON CONFLICT DO NOTHING)
```

### Formato della risposta

```json
{ "success": true, "counted": true }
```

| Risposta | Significato |
|----------|---------|
| `counted: true` | È stata registrata una nuova vista |
| `counted: false` | Duplicato per oggi (stesso visualizzatore + elemento + data) |
| `counted: false, reason: "bot"` | Rilevato user-agent del bot |
| `counted: false, reason: "owner"` | Utente autenticato che visualizza il proprio articolo |

## Tracker lato client

Il `ItemViewTracker` è un componente client che attiva una singola richiesta POST al momento del montaggio:

```tsx
// Simplified from components/tracking/item-view-tracker.tsx
"use client";

export function ItemViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`/api/items/${slug}/views`, { method: 'POST' })
      .catch(() => {}); // Best-effort, never blocks rendering
  }, [slug]);

  return null; // Renders nothing
}
```

Il tracker utilizza un approccio best-effort: gli errori vengono ignorati silenziosamente in modo che il monitoraggio delle visualizzazioni non interrompa mai l'esperienza dell'utente.

## Rilevamento bot

Il modulo `lib/utils/bot-detection.ts` mantiene un elenco di modelli utente-agente bot noti, inclusi crawler dei motori di ricerca, strumenti di monitoraggio e client automatizzati. Quando viene rilevato un bot, l'endpoint restituisce una risposta positiva con `counted: false` senza toccare il database.

## Identificazione dello spettatore

Le visualizzazioni vengono attribuite a un ID visualizzatore memorizzato in un cookie solo HTTP di prima parte:

```ts
let viewerId = cookieStore.get(VIEWER_COOKIE_NAME)?.value;
if (!viewerId) {
  viewerId = crypto.randomUUID();
  cookieStore.set(VIEWER_COOKIE_NAME, viewerId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: VIEWER_COOKIE_MAX_AGE,
    path: '/',
  });
}
```

### Proprietà sulla privacy

- **Nessun dato personale** -- il cookie contiene solo un UUID casuale, non l'identità dell'utente.
- **Solo HTTP** -- JavaScript non può leggere il cookie, impedendo l'esfiltrazione del tracciamento basato su XSS.
- **Stesso sito lassista**: il cookie non viene inviato su richieste multiorigine.
- **Secure flag** -- applicato in produzione per richiedere HTTPS.
- **Nessun servizio di terze parti**: tutti i dati di tracciamento rimangono nel tuo database.

## Deduplicazione giornaliera

La logica di registrazione principale utilizza `ON CONFLICT DO NOTHING` di PostgreSQL:

```ts
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

La tabella `itemViews` ha un vincolo unico su `(itemId, viewerId, viewedDateUtc)` . La prima visualizzazione della giornata per una coppia visualizzatore-elemento inserisce una riga e restituisce `true` . Le visualizzazioni successive dello stesso giorno vengono saltate silenziosamente. La data viene calcolata come UTC `YYYY-MM-DD` per una deduplica coerente indipendentemente dal fuso orario.

## Esclusione del proprietario

Quando un utente autenticato visualizza il proprio elemento, la visualizzazione non viene conteggiata:

```ts
if (session?.user?.id && item.submitted_by === session.user.id) {
  return NextResponse.json({ success: true, counted: false, reason: 'owner' });
}
```

Ciò impedisce ai proprietari degli elementi di aumentare artificialmente il numero di visualizzazioni.

## Query di aggregazione

Il file `item-view.queries.ts` esporta diverse funzioni per l'analisi:

| Funzione | Tipo di ritorno | Descrizione |
|----------|-------------|-------------|
| `getTotalViewsCount(slugs)` | `number` | Visualizzazioni totali di tutti i tempi tra gli slug degli elementi |
| `getRecentViewsCount(slugs, days)` | `number` | Visualizzazioni all'interno di una finestra scorrevole (impostazione predefinita 7 giorni) |
| `getDailyViewsData(slugs, days)` | `Map<string, number>` | Mappa con chiave data per grafici sparkline |
| `getViewsPerItem(slugs)` | `Map<string, number>` | Visualizzazioni totali per articolo per le classifiche |

## Integrazione di analisi

### Punteggio di popolarità

I conteggi delle visualizzazioni alimentano l'algoritmo di punteggio di popolarità logaritmico utilizzato dal sistema di carte condivise:

```ts
const viewScore = logScale(viewCount, 1.5); // Logarithmic scaling with 1.5 weight
```

Ciò garantisce che gli elementi con molte visualizzazioni si classifichino più in alto nella modalità di ordinamento "Popolare" evitando allo stesso tempo punteggi fuori controllo derivanti da elementi virali.

### Pannello di controllo del cliente

Il dashboard del client in `/client/dashboard` visualizza:
- Visualizzazioni totali di tutti gli articoli inviati
- Visualizzazioni negli ultimi 7 giorni con indicatori di tendenza
- Un grafico delle visualizzazioni giornaliere tramite `getDailyViewsData` ### Pannello di amministrazione

Il dashboard di amministrazione utilizza `GET /api/admin/dashboard/stats` per le metriche di visualizzazione a livello di sito. L'endpoint di analisi geografica fornisce la distribuzione geografica delle visualizzazioni.

## Gestione degli errori

Gli errori di tracciamento delle visualizzazioni vengono gestiti silenziosamente in produzione:

```ts
catch (error) {
  if (process.env.NODE_ENV === 'development') {
    console.error('Error recording item view:', error);
  }
  return NextResponse.json(
    { success: false, error: 'Failed to record view' },
    { status: 500 }
  );
}
```

La modalità di sviluppo registra gli errori per il debug. La produzione sopprime l'output della console per evitare rumore.

##Configurazione

Il monitoraggio delle visualizzazioni funziona automaticamente senza variabili di ambiente richieste. Il sistema degrada con garbo:

- **Nessun database**: l'endpoint restituisce 503 e il client ignora l'errore.
- **Modalità di simulazione del database**: se abilitata, le visualizzazioni vengono monitorate rispetto ai dati simulati.
- **Flag di funzionalità**: i conteggi delle visualizzazioni vengono visualizzati in modo condizionale in base alle impostazioni del modello.

## Accessibilità

- `ItemViewTracker` non esegue il rendering di elementi DOM, garantendo un impatto pari a zero sul layout della pagina e sugli screen reader.
- I conteggi delle visualizzazioni visualizzati nelle schede utilizzano gli attributi `aria-label` per il contesto dello screen reader.
- I grafici della visualizzazione dashboard includono intestazioni descrittive e testo di riepilogo.

## Documentazione correlata

- [Componenti della dashboard](/docs/template/components/dashboard-components) -- Visualizza la visualizzazione delle statistiche
- [Componenti delle carte condivise](/docs/template/components/shared-card-components) -- Punteggio di popolarità
- [Analisi amministrativa](/docs/template/features/admin-analytics) - Metriche di visualizzazione a livello di sito
- [Votazioni e commenti](/docs/template/features/voting-comments) -- Altre funzionalità di coinvolgimento
