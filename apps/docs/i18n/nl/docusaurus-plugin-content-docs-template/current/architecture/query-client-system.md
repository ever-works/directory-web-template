---
id: query-client-system
title: "Query-clientsysteem"
sidebar_label: "Query-clientsysteem"
sidebar_position: 43
---

# Query-clientsysteem

## Overzicht

Het Query Client Systeem biedt gecentraliseerde TanStack React Query-configuratie voor de applicatie. Het bestaat uit twee modules: een query-clientfabriek voor algemene doeleinden (`lib/query-client.ts`) die het singleton-beheer van de server/client afhandelt, en een voor facturering geoptimaliseerde configuratie (`lib/react-query-config.ts`) met query-sleutelfabrieken, prefetch-strategieën en hulpprogramma's voor cache-invalidatie.

## Architectuur

Het systeem heeft twee toegangspunten die verschillende problemen bedienen:

- **`lib/query-client.ts`** -- De primaire queryclient die in de hele applicatie wordt gebruikt. Het creëert afzonderlijke instances voor server- en clientomgevingen, waardoor ervoor wordt gezorgd dat de weergave aan de serverzijde geen status deelt tussen verzoeken terwijl de browser één instance hergebruikt.
- **`lib/react-query-config.ts`** -- Een gespecialiseerde queryclient die is geconfigureerd voor facturerings- en abonnementsbeheer. Het voegt querysleutelfabrieken, prefetch-strategieën en cache-invalidatiehulpprogramma's toe die zijn afgestemd op betalingsgerelateerde gegevens.

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

## API-referentie

### Exporteert vanuit `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Fabrieksfunctie die een nieuwe `QueryClient` creëert met de volgende standaardwaarden:

|Optie|Waarde|Doel|
|--------|-------|---------|
|`staleTime`|5 minuten|Gegevens als nieuw beschouwd|
|`gcTime`|10 minuten|Cachebehoud na het laatste gebruik|
|`refetchOnWindowFocus`|`false`|Voorkom overmatig opnieuw etsen|
|`refetchOnMount`|`false`|Opnieuw ophalen overslaan als de gegevens nieuw zijn|
|`refetchOnReconnect`|`true`|Opnieuw ophalen bij netwerkherstel|
|`retry`|Maximaal 2 pogingen|Eenvoudig opnieuw proberen voor alle fouten|
|`retryDelay`|Exponentieel uitstel, maximaal 30 seconden|`1000 * 2^attempt`|
|Mutatie `retry`| 1 |Probeer mutaties één keer opnieuw|
|Mutatie `onError`|Toast + console.fout|Globale foutmelding|

#### `getQueryClient(): QueryClient`

Retourneert de juiste `QueryClient` instantie. Op de server wordt per oproep een nieuw exemplaar gemaakt (geen gedeelde status). Op de client retourneert het een singleton-instantie (eenmalig gemaakt en opnieuw gebruikt).

### Exporteert vanuit `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Een vooraf geconfigureerde `QueryClient`-instantie, geoptimaliseerd voor factureringsbewerkingen. Belangrijkste verschillen met de algemene klant:

- `refetchOnWindowFocus: true` -- Zorgt ervoor dat de abonnementsstatus altijd actueel is
- `refetchOnMount: true` -- Haalt verouderde gegevens op bij het monteren van componenten
- Bij een nieuwe poging worden 4xx- en 401-fouten overgeslagen (client/auth-fouten worden niet opnieuw geprobeerd)
- Exponentiële uitstel omvat jitter (85-115% van basisvertraging)
- `notifyOnChangeProps` ingesteld op `['data', 'error', 'isLoading', 'isFetching']` voor geoptimaliseerde herweergave

#### `queryKeys`

Hiërarchische querysleutelfabriek voor consistent cachebeheer:

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

Vooraf gebouwde prefetch-functies voor algemene navigatiepatronen:

- `prefetchStrategies.billing()` -- Haalt abonnements- en betalingsgegevens vooraf op
- `prefetchStrategies.userProfile()` -- Haalt gebruikersprofielgegevens vooraf op

#### `cacheUtils`

Hulpprogramma's voor cachebeheer:

- `cacheUtils.invalidateBilling()` -- Maakt alle factureringsquery's ongeldig
- `cacheUtils.invalidateSubscription()` -- Maakt de abonnementsquery ongeldig
- `cacheUtils.invalidatePayments()` -- Maakt de betalingsquery ongeldig
- `cacheUtils.removeBilling()` -- Verwijdert alle factuurgegevens uit de cache
- `cacheUtils.resetCache()` -- Wist de volledige querycache

## Implementatiedetails

**Server/client split**: `getQueryClient()` gebruikt de vlag `isServer` van TanStack om de omgeving te bepalen. Serverinstances zijn kortstondig (nieuw per verzoek) om te voorkomen dat gegevens tussen gebruikers lekken. De browser-singleton wordt opgeslagen in een variabele op moduleniveau.

**Foutafhandelingsstrategie**: De algemene client gebruikt `toast.error()` van Sonner voor mutatiefouten, waardoor directe gebruikersfeedback wordt gegeven. De factureringsclient slaat nieuwe pogingen bij 4xx-fouten over, omdat deze problemen aan de clientzijde aangeven die door opnieuw proberen niet kunnen worden opgelost.

**Opnieuw proberen met jitter**: de factureringsclient voegt willekeurige jitter (85-115% van de basisvertraging) toe aan de exponentiële uitstel om enorme problemen te voorkomen wanneer veel clients het tegelijkertijd opnieuw proberen na een serviceonderbreking.

## Configuratie

Er zijn geen extra configuratiebestanden nodig. Beide clients zijn volledig in code geconfigureerd. Om de standaardinstellingen aan te passen, wijzigt u `defaultOptions` in de respectievelijke fabrieksfuncties.

## Gebruiksvoorbeelden

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

## Beste praktijken

- Gebruik `getQueryClient()` van `lib/query-client.ts` voor het ophalen van algemene gegevens; gebruik de factureringsspecifieke client alleen voor betalingsgerelateerde functies.
- Gebruik altijd `queryKeys` fabrieken voor consistentie van de cachesleutel; nooit hardcode-querysleutelarrays.
- Bel `cacheUtils.invalidateBilling()` na elke mutatie die de abonnements- of betalingsstatus verandert.
- Gebruik `prefetchStrategies` tijdens het zweven of vooraf laden van routes om de waargenomen prestaties te verbeteren.
- Vermijd het aanroepen van `cacheUtils.resetCache()` in productie, tenzij absoluut noodzakelijk, omdat alle gegevens in de cache worden verwijderd.

## Gerelateerde modules

- [API Client Layer](/template/architecture/api-client-layer) - Zorgt ervoor dat de API-aanroepen worden verbruikt door queryfuncties
- [Guards System](./guards-system-deep-dive) -- Plangebaseerde toegangscontrole die afhankelijk kan zijn van abonnementsgegevens
