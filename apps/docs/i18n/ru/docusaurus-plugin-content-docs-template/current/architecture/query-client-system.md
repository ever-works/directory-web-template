---
id: query-client-system
title: "Клиентская система запросов"
sidebar_label: "Клиентская система запросов"
sidebar_position: 43
---

# Клиентская система запросов

## Обзор

Клиентская система запросов обеспечивает централизованную настройку запросов TanStack React для приложения. Он состоит из двух модулей: фабрики клиентов общего назначения (`lib/query-client.ts`), которая управляет одноэлементным управлением сервером/клиентом, и конфигурации, оптимизированной для выставления счетов (`lib/react-query-config.ts`) с фабриками ключей запросов, стратегиями предварительной выборки и утилитами аннулирования кэша.

## Архитектура

Система имеет две точки входа, отвечающие разным задачам:

- **`lib/query-client.ts`** — основной клиент запросов, используемый в приложении. Он создает отдельные экземпляры для серверной и клиентской сред, гарантируя, что рендеринг на стороне сервера не разделяет состояние между запросами, в то время как браузер повторно использует один экземпляр.
- **`lib/react-query-config.ts`** — специализированный клиент запросов, настроенный для выставления счетов и управления подписками. Он добавляет фабрики ключей запросов, стратегии предварительной выборки и утилиты аннулирования кэша, адаптированные к данным, связанным с платежами.

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

## Справочник по API

### Экспорт из `lib/query-client.ts`

#### `createQueryClientInstance(): QueryClient`

Заводская функция, которая создает новый `QueryClient` со следующими значениями по умолчанию:

|Вариант|Значение|Цель|
|--------|-------|---------|
|`staleTime`|5 минут|Данные считаются свежими|
|`gcTime`|10 минут|Сохранение кэша после последнего использования|
|`refetchOnWindowFocus`|`false`|Предотвращение чрезмерной повторной загрузки|
|`refetchOnMount`|`false`|Пропустить повторную выборку, если данные свежие|
|`refetchOnReconnect`|`true`|Повторная обработка при восстановлении сети|
|`retry`|До 2 попыток|Простая повторная попытка для всех ошибок|
|`retryDelay`|Экспоненциальная задержка, максимум 30 с.|`1000 * 2^attempt`|
|Мутация `retry`| 1 |Повторить мутации один раз|
|Мутация `onError`|Тост + console.error|Уведомление о глобальной ошибке|

#### `getQueryClient(): QueryClient`

Возвращает соответствующий экземпляр `QueryClient`. На сервере он создает новый экземпляр для каждого вызова (без общего состояния). На клиенте он возвращает одноэлементный экземпляр (созданный один раз и используемый повторно).

### Экспорт из `lib/react-query-config.ts`

#### `queryClient: QueryClient`

Предварительно настроенный экземпляр `QueryClient`, оптимизированный для операций выставления счетов. Ключевые отличия от обычного клиента:

- `refetchOnWindowFocus: true` — гарантирует, что статус подписки всегда актуален.
- `refetchOnMount: true` -- Извлекает устаревшие данные при монтировании компонента.
- Повторная попытка пропускает ошибки 4xx и 401 (ошибки клиента/аутентификации не повторяются)
- Экспоненциальная задержка включает в себя джиттер (85–115 % базовой задержки)
- Для `notifyOnChangeProps` установлено значение `['data', 'error', 'isLoading', 'isFetching']` для оптимизированного повторного рендеринга.

#### `queryKeys`

Иерархическая фабрика ключей запросов для согласованного управления кэшем:

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

Предварительно встроенные функции предварительной выборки для распространенных шаблонов навигации:

- `prefetchStrategies.billing()` -- Предварительная выборка данных о подписке и платежах.
- `prefetchStrategies.userProfile()` -- Предварительная выборка данных профиля пользователя.

#### `cacheUtils`

Утилиты управления кэшем:

- `cacheUtils.invalidateBilling()` — делает недействительными все запросы на выставление счетов.
- `cacheUtils.invalidateSubscription()` -- Делает запрос на подписку недействительным.
- `cacheUtils.invalidatePayments()` -- Делает запрос платежа недействительным.
- `cacheUtils.removeBilling()` -- Удаляет все платежные данные из кэша.
- `cacheUtils.resetCache()` -- Очищает весь кеш запросов.

## Детали реализации

**Разделение сервер/клиент**: `getQueryClient()` использует флаг `isServer` TanStack для определения среды. Экземпляры серверов являются эфемерными (новые для каждого запроса), чтобы предотвратить утечку данных между пользователями. Синглтон браузера хранится в переменной уровня модуля.

**Стратегия обработки ошибок**: основной клиент использует `toast.error()` от Sonner для ошибок мутации, обеспечивая немедленную обратную связь с пользователем. Клиент выставления счетов пропускает повторные попытки при ошибках 4xx, поскольку они указывают на проблемы на стороне клиента, которые повторная попытка не решит.

**Повторная попытка с джиттером**. Клиент выставления счетов добавляет случайный джиттер (85–115 % базовой задержки) к экспоненциальной отсрочке, чтобы предотвратить массовые проблемы, когда многие клиенты повторяют попытку одновременно после сбоя в обслуживании.

## Конфигурация

Никаких дополнительных файлов конфигурации не требуется. Оба клиента полностью настроены в коде. Чтобы изменить настройки по умолчанию, измените `defaultOptions` в соответствующих заводских функциях.

## Примеры использования

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

## Лучшие практики

- Используйте `getQueryClient()` из `lib/query-client.ts` для получения всех общих данных; используйте клиент для выставления счетов только для функций, связанных с платежами.
- Всегда используйте фабрики `queryKeys` для обеспечения согласованности ключей кэша; никогда не закодируйте массивы ключей жесткого кода.
- Звоните `cacheUtils.invalidateBilling()` после любой мутации, которая меняет состояние подписки или оплаты.
- Используйте `prefetchStrategies` при наведении или предварительной загрузке маршрута, чтобы улучшить воспринимаемую производительность.
- Избегайте вызова `cacheUtils.resetCache()` в рабочей среде без крайней необходимости, так как при этом удаляются все кэшированные данные.

## Связанные модули

- [API Client Layer](/template/architecture/api-client-layer) — заставляет вызовы API использоваться функциями запроса.
- [Guards System](./guards-system-deep-dive) — контроль доступа на основе плана, который может зависеть от данных подписки.
