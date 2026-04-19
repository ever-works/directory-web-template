---
id: query-client-system
title: "Zapytanie o system klienta"
sidebar_label: "Zapytanie o system klienta"
sidebar_position: 43
---

# Zapytanie o system klienta

## Przegląd

System Query Client zapewnia scentralizowaną konfigurację TanStack React Query dla aplikacji. Składa się z dwóch modułów: fabryki klientów zapytań ogólnego przeznaczenia (`lib/query-client.ts`), która obsługuje zarządzanie pojedynczym serwerem/klientem, oraz konfiguracji zoptymalizowanej pod kątem rozliczeń (`lib/react-query-config.ts`) z fabrykami kluczy zapytań, strategiami pobierania wstępnego i narzędziami do unieważniania pamięci podręcznej.

## Architektura

System ma dwa punkty wejścia obsługujące różne problemy:

- **`lib/query-client.ts`** — Podstawowy klient zapytań używany w całej aplikacji. Tworzy oddzielne instancje dla środowisk serwera i klienta, zapewniając, że renderowanie po stronie serwera nie dzieli stanu między żądaniami, podczas gdy przeglądarka ponownie wykorzystuje pojedynczą instancję.
- **`lib/react-query-config.ts`** — Specjalistyczny klient zapytań skonfigurowany do zarządzania rozliczeniami i subskrypcjami. Dodaje fabryki kluczy zapytań, strategie pobierania wstępnego i narzędzia unieważniania pamięci podręcznej dostosowane do danych związanych z płatnościami.

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

## Dokumentacja API

### Eksport z `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Funkcja fabryczna, która tworzy nowy `QueryClient` z następującymi wartościami domyślnymi:

|Opcja|Wartość|Cel|
|--------|-------|---------|
|`staleTime`|5 minut|Dane uważane za świeże|
|`gcTime`|10 minut|Przechowywanie pamięci podręcznej po ostatnim użyciu|
|`refetchOnWindowFocus`|`false`|Zapobiegaj nadmiernemu pobieraniu|
|`refetchOnMount`|`false`|Pomiń ponowne pobieranie, jeśli dane są świeże|
|`refetchOnReconnect`|`true`|Ponów pobieranie podczas odzyskiwania sieci|
|`retry`|Do 2 prób|Prosta ponowna próba w przypadku wszystkich błędów|
|`retryDelay`|Wykładnicze wycofywanie, maks. 30 s|`1000 * 2^attempt`|
|Mutacja `retry`| 1 |Ponów próbę mutacji raz|
|Mutacja `onError`|Toast + błąd konsoli|Globalne powiadomienie o błędzie|

#### `getQueryClient(): QueryClient`

Zwraca odpowiednią instancję `QueryClient`. Na serwerze tworzy nową instancję na każde wywołanie (bez stanu udostępnionego). Na kliencie zwraca instancję singleton (utworzoną raz i ponownie wykorzystaną).

### Eksport z `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Wstępnie skonfigurowana instancja `QueryClient` zoptymalizowana pod kątem operacji rozliczeniowych. Kluczowe różnice w stosunku do klienta ogólnego:

- `refetchOnWindowFocus: true` — Zapewnia, że status subskrypcji jest zawsze aktualny
- `refetchOnMount: true` — Pobiera nieaktualne dane dotyczące montażu komponentu
- Ponowna próba pomija błędy 4xx i 401 (błędy klienta/auth nie są ponawiane)
- Wykładnicze wycofywanie obejmuje jitter (85–115% opóźnienia podstawowego)
- `notifyOnChangeProps` ustawione na `['data', 'error', 'isLoading', 'isFetching']` w celu zoptymalizowania ponownego renderowania

#### `queryKeys`

Hierarchiczna fabryka kluczy zapytań zapewniająca spójne zarządzanie pamięcią podręczną:

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

Wbudowane funkcje wstępnego pobierania dla typowych wzorców nawigacji:

- `prefetchStrategies.billing()` — Pobiera z wyprzedzeniem dane dotyczące subskrypcji i płatności
- `prefetchStrategies.userProfile()` — Wstępnie pobiera dane profilu użytkownika

#### `cacheUtils`

Narzędzia do zarządzania pamięcią podręczną:

- `cacheUtils.invalidateBilling()` — Unieważnia wszystkie zapytania dotyczące rozliczeń
- `cacheUtils.invalidateSubscription()` — Unieważnia zapytanie o subskrypcję
- `cacheUtils.invalidatePayments()` — Unieważnia zapytanie dotyczące płatności
- `cacheUtils.removeBilling()` — Usuwa wszystkie dane rozliczeniowe z pamięci podręcznej
- `cacheUtils.resetCache()` — Czyści całą pamięć podręczną zapytań

## Szczegóły wdrożenia

**Podział serwera/klienta**: `getQueryClient()` używa flagi TanStack `isServer` do określenia środowiska. Instancje serwerów są efemeryczne (nowe na żądanie), aby zapobiec wyciekom danych między użytkownikami. Singleton przeglądarki jest przechowywany w zmiennej na poziomie modułu.

**Strategia obsługi błędów**: Klient ogólny używa `toast.error()` firmy Sonner w przypadku błędów mutacji, zapewniając natychmiastową informację zwrotną dla użytkownika. Klient rozliczeniowy pomija ponowne próby w przypadku błędów 4xx, ponieważ wskazują one na problemy po stronie klienta, których ponowne próby nie rozwiążą.

**Ponów próbę z jitterem**: Klient rozliczeniowy dodaje losowe jitter (85–115% opóźnienia podstawowego) do wykładniczego wycofywania, aby zapobiec poważnym problemom ze stadem, gdy wielu klientów ponownie próbuje jednocześnie po zakłóceniu usługi.

## Konfiguracja

Nie są potrzebne żadne dodatkowe pliki konfiguracyjne. Obaj klienci są konfigurowani całkowicie w kodzie. Aby dostosować ustawienia domyślne, zmodyfikuj `defaultOptions` w odpowiednich funkcjach fabrycznych.

## Przykłady użycia

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

## Najlepsze praktyki

- Użyj `getQueryClient()` z `lib/query-client.ts` do ogólnego pobierania danych; używaj klienta przeznaczonego do rozliczeń wyłącznie w przypadku funkcji związanych z płatnościami.
- Zawsze używaj fabryk `queryKeys`, aby zapewnić spójność kluczy pamięci podręcznej; nigdy nie koduj na stałe tablic kluczy zapytań.
- Zadzwoń do `cacheUtils.invalidateBilling()` po każdej mutacji zmieniającej stan subskrypcji lub płatności.
- Użyj `prefetchStrategies` po najechaniu myszką lub wstępnym załadowaniu trasy, aby poprawić postrzeganą wydajność.
- Unikaj wywoływania `cacheUtils.resetCache()` w środowisku produkcyjnym, chyba że jest to absolutnie konieczne, ponieważ powoduje to odrzucenie wszystkich danych z pamięci podręcznej.

## Powiązane moduły

- [Warstwa klienta API](/template/architecture/api-client-layer) — sprawia, że wywołania API są wykorzystywane przez funkcje zapytań
- [Guards System](./guards-system-deep-dive) — Kontrola dostępu oparta na planie, która może zależeć od danych subskrypcji
