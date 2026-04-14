---
id: query-client-system
title: "Interrogare il sistema client"
sidebar_label: "Interrogare il sistema client"
sidebar_position: 43
---

# Interrogare il sistema client

## Panoramica

Il sistema client di query fornisce la configurazione centralizzata delle query di TanStack React per l'applicazione. È costituito da due moduli: un factory client di query di uso generale (`lib/query-client.ts`) che gestisce la gestione del singleton server/client e una configurazione ottimizzata per la fatturazione (`lib/react-query-config.ts`) con factory di chiavi di query, strategie di precaricamento e utilità di invalidamento della cache.

## Architettura

Il sistema ha due punti di ingresso che rispondono a preoccupazioni diverse:

- **`lib/query-client.ts`** -- Il client di query principale utilizzato nell'applicazione. Crea istanze separate per ambienti server e client, garantendo che il rendering lato server non condivida lo stato tra le richieste mentre il browser riutilizza una singola istanza.
- **`lib/react-query-config.ts`** -- Un client di query specializzato configurato per la fatturazione e la gestione degli abbonamenti. Aggiunge query key factory, strategie di precaricamento e utilità di invalidamento della cache su misura per i dati relativi ai pagamenti.

```
query-client.ts
  |-- createQueryClientInstance()   (Factory function)
  |-- getQueryClient()              (Server/client singleton)

react-query-config.ts
  |-- queryClient                   (Billing-optimized instance)
  |-- queryKeys                     (Key factory)
  |-- prefetchStrategies            (Prefetch helpers)
  |-- cacheUtils                    (Invalidation utilities)
```

## Riferimento API

### Esportazioni da `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Funzione di fabbrica che crea un nuovo `QueryClient` con le seguenti impostazioni predefinite:

|Opzione|Valore|Scopo|
|--------|-------|---------|
|`staleTime`|5 minuti|Dati considerati freschi|
|`gcTime`|10 minuti|Conservazione della cache dopo l'ultimo utilizzo|
|`refetchOnWindowFocus`|`false`|Evitare un recupero eccessivo|
|`refetchOnMount`|`false`|Salta il recupero se i dati sono aggiornati|
|`refetchOnReconnect`|`true`|Recupera al ripristino della rete|
|`retry`|Fino a 2 tentativi|Riprova semplice per tutti gli errori|
|`retryDelay`|Backoff esponenziale, massimo 30 secondi|`1000 * 2^attempt`|
|Mutazione `retry`| 1 |Riprovare le mutazioni una volta|
|Mutazione `onError`|Toast + console.errore|Notifica di errore globale|

#### `getQueryClient(): QueryClient`

Restituisce l'istanza `QueryClient` appropriata. Sul server crea una nuova istanza per chiamata (nessuno stato condiviso). Sul client restituisce un'istanza singleton (creata una volta e riutilizzata).

### Esportazioni da `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Un'istanza `QueryClient` preconfigurata ottimizzata per le operazioni di fatturazione. Differenze chiave rispetto al cliente generale:

- `refetchOnWindowFocus: true` -- Garantisce che lo stato dell'abbonamento sia sempre aggiornato
- `refetchOnMount: true` -- Recupera i dati obsoleti sul montaggio del componente
- Il nuovo tentativo salta gli errori 4xx e 401 (gli errori client/autenticazione non vengono ripetuti)
- Il backoff esponenziale include il jitter (85-115% del ritardo di base)
- `notifyOnChangeProps` impostato su `['data', 'error', 'isLoading', 'isFetching']` per rendering ottimizzati

#### `queryKeys`

Key factory di query gerarchica per una gestione coerente della cache:

```typescript
const queryKeys = {
  billing: {
    all: ['billing'],
    subscription: () => ['billing', 'subscription'],
    payments: () => ['billing', 'payments'],
    user: (userId: string) => ['billing', 'user', userId],
  },
  user: {
    all: ['user'],
    profile: () => ['user', 'profile'],
    settings: () => ['user', 'settings'],
  },
  admin: {
    all: ['admin'],
    users: () => ['admin', 'users'],
    subscriptions: () => ['admin', 'subscriptions'],
    payments: () => ['admin', 'payments'],
  },
};
```

#### `prefetchStrategies`

Funzioni di prelettura predefinite per modelli di navigazione comuni:

- `prefetchStrategies.billing()` -- Precarica i dati di abbonamento e pagamento
- `prefetchStrategies.userProfile()` -- Precarica i dati del profilo utente

#### `cacheUtils`

Utilità di gestione della cache:

- `cacheUtils.invalidateBilling()` -- Invalida tutte le query di fatturazione
- `cacheUtils.invalidateSubscription()` -- Invalida la query di sottoscrizione
- `cacheUtils.invalidatePayments()` -- Invalida la query sui pagamenti
- `cacheUtils.removeBilling()` -- Rimuove tutti i dati di fatturazione dalla cache
- `cacheUtils.resetCache()` -- Cancella l'intera cache delle query

## Dettagli di implementazione

**Divisione server/client**: `getQueryClient()` utilizza il flag `isServer` di TanStack per determinare l'ambiente. Le istanze del server sono temporanee (nuove per richiesta) per impedire la fuga di dati tra gli utenti. Il singleton del browser è archiviato in una variabile a livello di modulo.

**Strategia di gestione degli errori**: il cliente generale utilizza `toast.error()` di Sonner per gli errori di mutazione, fornendo un feedback immediato all'utente. Il client di fatturazione salta i nuovi tentativi in ​​caso di errori 4xx poiché indicano problemi lato client che i nuovi tentativi non risolveranno.

**Riprova con jitter**: il client di fatturazione aggiunge jitter casuale (85-115% del ritardo di base) al backoff esponenziale per evitare problemi di gregge fragorosi quando molti client riprovano contemporaneamente dopo un'interruzione del servizio.

## Configurazione

Non sono necessari file di configurazione aggiuntivi. Entrambi i client sono configurati interamente in codice. Per regolare le impostazioni predefinite, modificare `defaultOptions` nelle rispettive funzioni di fabbrica.

## Esempi di utilizzo

```typescript
// General usage -- getting the query client
import { getQueryClient } from '@/lib/query-client';

// In a React Server Component or provider
const queryClient = getQueryClient();

// In a client component with React Query
import { useQuery } from '@tanstack/react-query';

function ItemsList() {
  const { data, isLoading } = useQuery({
    queryKey: ['items'],
    queryFn: fetchItems,
  });
  // ...
}

// Billing usage -- using query key factories
import { queryKeys, cacheUtils } from '@/lib/react-query-config';

function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: fetchSubscription,
  });
}

// After a successful payment
async function onPaymentSuccess() {
  cacheUtils.invalidateBilling();
}

// Prefetch on navigation
import { prefetchStrategies } from '@/lib/react-query-config';

function SettingsLink() {
  return (
    <Link
      href="/settings/billing"
      onMouseEnter={() => prefetchStrategies.billing()}
    >
      Billing Settings
    </Link>
  );
}
```

## Migliori pratiche

- Utilizzare `getQueryClient()` da `lib/query-client.ts` per il recupero di tutti i dati generali; utilizzare il client specifico per la fatturazione solo per funzionalità relative al pagamento.
- Utilizzare sempre le factory `queryKeys` per la coerenza della chiave della cache; non codificare mai gli array di chiavi delle query.
- Chiama `cacheUtils.invalidateBilling()` dopo qualsiasi mutazione che cambia lo stato dell'abbonamento o del pagamento.
- Utilizza `prefetchStrategies` al passaggio del mouse o durante il precaricamento del percorso per migliorare le prestazioni percepite.
- Evitare di chiamare `cacheUtils.resetCache()` in produzione a meno che non sia assolutamente necessario, poiché elimina tutti i dati memorizzati nella cache.

## Moduli correlati

- [API Client Layer](/template/architecture/api-client-layer): fa sì che le chiamate API vengano utilizzate dalle funzioni di query
- [Guards System](./guards-system-deep-dive): controllo degli accessi basato sul piano che può dipendere dai dati di abbonamento
