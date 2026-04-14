---
id: query-client-system
title: "Клиентска система за заявки"
sidebar_label: "Клиентска система за заявки"
sidebar_position: 43
---

# Клиентска система за заявки

## Преглед

Query Client System осигурява централизирана конфигурация на TanStack React Query за приложението. Състои се от два модула: клиентска фабрика за заявки с общо предназначение (`lib/query-client.ts`), която обработва сървър/клиент еднократно управление, и оптимизирана за таксуване конфигурация (`lib/react-query-config.ts`) с фабрики за ключове за заявки, стратегии за предварително извличане и помощни програми за обезсилване на кеша.

## Архитектура

Системата има две входни точки, обслужващи различни проблеми:

- **`lib/query-client.ts`** -- Основният клиент за заявка, използван в приложението. Той създава отделни екземпляри за сървърни и клиентски среди, като гарантира, че изобразяването от страна на сървъра не споделя състояние между заявките, докато браузърът използва повторно един екземпляр.
- **`lib/react-query-config.ts`** -- Специализиран клиент за заявки, конфигуриран за таксуване и управление на абонаменти. Той добавя фабрики за ключови заявки, стратегии за предварително извличане и помощни програми за невалидност на кеша, съобразени с данни, свързани с плащането.

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

## Справка за API

### Износ от `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Фабрична функция, която създава нов `QueryClient` със следните настройки по подразбиране:

|опция|Стойност|Цел|
|--------|-------|---------|
|`staleTime`|5 минути|Данните се считат за свежи|
|`gcTime`|10 минути|Запазване на кеша след последно използване|
|`refetchOnWindowFocus`|`false`|Предотвратете прекомерното повторно извличане|
|`refetchOnMount`|`false`|Пропуснете повторното извличане, ако данните са свежи|
|`refetchOnReconnect`|`true`|Повторно извличане при възстановяване на мрежата|
|`retry`|До 2 опита|Лесен повторен опит за всички грешки|
|`retryDelay`|Експоненциално забавяне, максимум 30 секунди|`1000 * 2^attempt`|
|Мутация `retry`| 1 |Повторете мутациите веднъж|
|Мутация `onError`|Тост + конзола.грешка|Известие за глобална грешка|

#### `getQueryClient(): QueryClient`

Връща подходящия екземпляр `QueryClient`. На сървъра той създава нов екземпляр на повикване (без споделено състояние). На клиента той връща единичен екземпляр (създаден веднъж и използван повторно).

### Износ от `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Предварително конфигуриран екземпляр `QueryClient`, оптимизиран за операции по таксуване. Основни разлики от обикновения клиент:

- `refetchOnWindowFocus: true` -- Гарантира, че състоянието на абонамента е винаги актуално
- `refetchOnMount: true` -- Извлича повторно остарели данни при монтиране на компонент
- Повторният опит пропуска грешки 4xx и 401 (грешките на клиента/удостоверяването не се опитват повторно)
- Експоненциалното забавяне включва трептене (85-115% от базовото забавяне)
- `notifyOnChangeProps` зададено на `['data', 'error', 'isLoading', 'isFetching']` за оптимизирано повторно изобразяване

#### `queryKeys`

Йерархична фабрика за ключове за заявки за последователно управление на кеша:

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

Предварително изградени функции за предварително извличане за общи модели за навигация:

- `prefetchStrategies.billing()` -- Предварително извлича данни за абонамент и плащане
- `prefetchStrategies.userProfile()` -- Предварително извлича данни от потребителския профил

#### `cacheUtils`

Помощни програми за управление на кеша:

- `cacheUtils.invalidateBilling()` -- Анулира всички заявки за фактуриране
- `cacheUtils.invalidateSubscription()` -- Невалидна заявка за абонамент
- `cacheUtils.invalidatePayments()` -- Невалидна заявка за плащане
- `cacheUtils.removeBilling()` -- Премахва всички данни за фактуриране от кеша
- `cacheUtils.resetCache()` -- Изчиства целия кеш на заявките

## Подробности за изпълнението

**Разделяне на сървър/клиент**: `getQueryClient()` използва флага `isServer` на TanStack за определяне на средата. Екземплярите на сървъра са ефимерни (нови на заявка), за да се предотврати изтичането на данни между потребителите. Браузърът singleton се съхранява в променлива на ниво модул.

**Стратегия за обработка на грешки**: Общият клиент използва `toast.error()` от Sonner за грешки при мутация, осигурявайки незабавна обратна връзка с потребителите. Клиентът за таксуване пропуска повторни опити при грешки 4xx, тъй като те показват проблеми от страна на клиента, които повторният опит няма да разреши.

**Повторен опит с трептене**: Клиентът за таксуване добавя произволно трептене (85-115% от базовото забавяне) към експоненциално забавяне, за да предотврати гръмотевични проблеми със стадото, когато много клиенти правят повторни опити едновременно след прекъсване на услугата.

## Конфигурация

Не са необходими допълнителни конфигурационни файлове. И двата клиента са конфигурирани изцяло в код. За да коригирате настройките по подразбиране, променете `defaultOptions` в съответните фабрични функции.

## Примери за използване

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

## Най-добри практики

- Използвайте `getQueryClient()` от `lib/query-client.ts` за извличане на всички общи данни; използвайте специфичния за фактуриране клиент само за функции, свързани с плащането.
- Винаги използвайте `queryKeys` фабрики за съгласуваност на кеша; никога не твърдо кодирайте ключови масиви за заявки.
- Обадете се на `cacheUtils.invalidateBilling()` след всяка мутация, която променя състоянието на абонамент или плащане.
- Използвайте `prefetchStrategies` при задържане или предварително зареждане на маршрут, за да подобрите възприеманата производителност.
- Избягвайте да извиквате `cacheUtils.resetCache()` в производството, освен ако не е абсолютно необходимо, тъй като отхвърля всички кеширани данни.

## Свързани модули

- [API клиентски слой](/template/architecture/api-client-layer) -- Прави извикванията на API да се използват от функциите за заявки
- [Guards System](./guards-system-deep-dive) -- Контрол на достъпа, базиран на план, който може да зависи от данните за абонамента
