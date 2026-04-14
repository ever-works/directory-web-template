---
id: query-client-system
title: "Client-System abfragen"
sidebar_label: "Client-System abfragen"
sidebar_position: 43
---

# Client-System abfragen

## Übersicht

Das Query Client System bietet eine zentralisierte TanStack React Query-Konfiguration für die Anwendung. Es besteht aus zwei Modulen: einer allgemeinen Abfrage-Client-Factory (`lib/query-client.ts`), die die Server-/Client-Singleton-Verwaltung übernimmt, und einer abrechnungsoptimierten Konfiguration (`lib/react-query-config.ts`) mit Abfrageschlüssel-Factorys, Prefetch-Strategien und Dienstprogrammen zur Cache-Ungültigmachung.

## Architektur

Das System verfügt über zwei Einstiegspunkte, die unterschiedliche Anliegen bedienen:

- **`lib/query-client.ts`** – Der primäre Abfrage-Client, der in der gesamten Anwendung verwendet wird. Es erstellt separate Instanzen für Server- und Clientumgebungen und stellt so sicher, dass beim serverseitigen Rendering der Status nicht zwischen Anforderungen geteilt wird, während der Browser eine einzelne Instanz wiederverwendet.
- **`lib/react-query-config.ts`** – Ein spezieller Abfrage-Client, der für die Abrechnung und Abonnementverwaltung konfiguriert ist. Es fügt Abfrageschlüsselfabriken, Prefetch-Strategien und Cache-Ungültigmachungsdienstprogramme hinzu, die auf zahlungsbezogene Daten zugeschnitten sind.

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

## API-Referenz

### Exporte von `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Factory-Funktion, die ein neues `QueryClient` mit den folgenden Standardwerten erstellt:

|Option|Wert|Zweck|
|--------|-------|---------|
|`staleTime`|5 Minuten|Daten gelten als aktuell|
|`gcTime`|10 Minuten|Cache-Aufbewahrung nach der letzten Verwendung|
|`refetchOnWindowFocus`|`false`|Verhindern Sie übermäßiges erneutes Abrufen|
|`refetchOnMount`|`false`|Überspringen Sie den erneuten Abruf, wenn die Daten aktuell sind|
|`refetchOnReconnect`|`true`|Bei Netzwerkwiederherstellung erneut abrufen|
|`retry`|Bis zu 2 Versuche|Einfacher Wiederholungsversuch für alle Fehler|
|`retryDelay`|Exponentieller Backoff, max. 30 Sekunden|`1000 * 2^attempt`|
|Mutation `retry`| 1 |Versuchen Sie es einmal mit Mutationen|
|Mutation `onError`|Toast + console.error|Globale Fehlerbenachrichtigung|

#### `getQueryClient(): QueryClient`

Gibt die entsprechende `QueryClient` Instanz zurück. Auf dem Server wird pro Aufruf eine neue Instanz erstellt (kein gemeinsam genutzter Status). Auf dem Client wird eine Singleton-Instanz zurückgegeben (einmal erstellt und wiederverwendet).

### Exporte von `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Eine vorkonfigurierte `QueryClient`-Instanz, die für Abrechnungsvorgänge optimiert ist. Hauptunterschiede zum allgemeinen Client:

- `refetchOnWindowFocus: true` – Stellt sicher, dass der Abonnementstatus immer aktuell ist
- `refetchOnMount: true` – Ruft veraltete Daten zur Komponentenmontage erneut ab
- Beim erneuten Versuch werden 4xx- und 401-Fehler übersprungen (Client-/Authentifizierungsfehler werden nicht erneut versucht)
- Exponentielles Backoff beinhaltet Jitter (85–115 % der Basisverzögerung)
- `notifyOnChangeProps` auf `['data', 'error', 'isLoading', 'isFetching']` für optimierte Neu-Renderings setzen

#### `queryKeys`

Hierarchische Abfrageschlüsselfabrik für konsistente Cache-Verwaltung:

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

Vorgefertigte Prefetch-Funktionen für gängige Navigationsmuster:

- `prefetchStrategies.billing()` – Ruft Abonnement- und Zahlungsdaten vorab ab
- `prefetchStrategies.userProfile()` – Ruft Benutzerprofildaten vorab ab

#### `cacheUtils`

Dienstprogramme zur Cache-Verwaltung:

- `cacheUtils.invalidateBilling()` – Macht alle Abrechnungsabfragen ungültig
- `cacheUtils.invalidateSubscription()` – Abonnementabfrage ungültig machen
- `cacheUtils.invalidatePayments()` – Zahlungsabfrage ungültig machen
- `cacheUtils.removeBilling()` – Entfernt alle Rechnungsdaten aus dem Cache
- `cacheUtils.resetCache()` – Löscht den gesamten Abfragecache

## Implementierungsdetails

**Server/Client-Aufteilung**: `getQueryClient()` verwendet das `isServer` Flag von TanStack, um die Umgebung zu bestimmen. Serverinstanzen sind kurzlebig (neu pro Anfrage), um einen Datenverlust zwischen Benutzern zu verhindern. Der Browser-Singleton wird in einer Variablen auf Modulebene gespeichert.

**Strategie zur Fehlerbehandlung**: Der allgemeine Client verwendet `toast.error()` von Sonner für Mutationsfehler und liefert so sofortiges Benutzer-Feedback. Der Abrechnungsclient überspringt Wiederholungsversuche bei 4xx-Fehlern, da diese auf clientseitige Probleme hinweisen, die durch einen Wiederholungsversuch nicht behoben werden können.

**Wiederholen mit Jitter**: Der Abrechnungsclient fügt dem exponentiellen Backoff zufälligen Jitter (85–115 % der Basisverzögerung) hinzu, um donnernde Herdenprobleme zu verhindern, wenn viele Clients nach einer Dienstunterbrechung gleichzeitig erneut versuchen.

## Konfiguration

Es sind keine zusätzlichen Konfigurationsdateien erforderlich. Beide Clients werden vollständig im Code konfiguriert. Um die Standardeinstellungen anzupassen, ändern Sie `defaultOptions` in den jeweiligen Werksfunktionen.

## Anwendungsbeispiele

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

## Best Practices

- Verwenden Sie `getQueryClient()` von `lib/query-client.ts` für alle allgemeinen Datenabrufe; Verwenden Sie den abrechnungsspezifischen Client nur für zahlungsbezogene Funktionen.
- Verwenden Sie immer `queryKeys`-Fabriken für die Cache-Schlüsselkonsistenz; Abfrageschlüssel-Arrays niemals fest codieren.
- Rufen Sie `cacheUtils.invalidateBilling()` nach jeder Mutation an, die das Abonnement oder den Zahlungsstatus ändert.
- Verwenden Sie `prefetchStrategies` beim Schweben oder beim Vorladen der Route, um die wahrgenommene Leistung zu verbessern.
- Vermeiden Sie den Aufruf von `cacheUtils.resetCache()` in der Produktion, es sei denn, dies ist unbedingt erforderlich, da dadurch alle zwischengespeicherten Daten verworfen werden.

## Verwandte Module

- [API-Client-Schicht](/template/architecture/api-client-layer) – Ermöglicht die API-Aufrufe, die von Abfragefunktionen verwendet werden
- [Guards System](./guards-system-deep-dive) – Planbasierte Zugriffskontrolle, die von Abonnementdaten abhängen kann
