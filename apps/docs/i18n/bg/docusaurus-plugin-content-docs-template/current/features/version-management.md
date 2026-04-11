---
id: version-management
title: Управление на версиите
sidebar_label: Управление на версиите
sidebar_position: 15
---

# Управление на версиите

Шаблонът Ever Works включва система за управление на версиите, която проследява версията на хранилището на данни, показва информация за версията на администраторите и осигурява автоматично откриване на синхронизация. Тази система наблюдава базираното на Git хранилище на CMS съдържание и представя подробности за версията чрез конфигурируеми компоненти на потребителския интерфейс.

## Преглед на архитектурата

| Компонент | Път | Цел |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | React Query hook за извличане на данни за версията от API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Помощна кука за управление на кеша |
| `VersionDisplay` | `components/version/version-display.tsx` | Компонент за показване на конфигурируема версия |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Подсказка, показваща подробна информация за версията |
| `/api/version` | `app/api/version/route.ts` | Крайна точка на API, връщаща данни за текущата версия |

## Структура на данните за информация за версията

Системата за версии проследява следните данни от хранилището на съдържание:

| Поле | Тип | Описание |
|---|---|---|
| `commit` | `string` | Кратък комит хеш на текущата версия на данните |
| `date` | `string` | ISO низ от дата на ангажимента |
| `author` | `string` | Име на автора на ангажимент |
| `message` | `string` | Съобщение за ангажиране |
| `repository` | `string` | URL на хранилището |
| `lastSync` | `string` | Време на последното синхронизиране на данни |

## Куката `useVersionInfo` ### Интерфейс

```tsx
interface UseVersionInfoOptions {
  refreshInterval?: number;    // Auto-refresh interval in ms (default: 5 min)
  retryOnError?: boolean;      // Retry on failures (default: true)
  enabled?: boolean;           // Enable/disable the query (default: true)
}

interface UseVersionInfoReturn {
  versionInfo: VersionInfo | null;
  isLoading: boolean;
  isError: boolean;
  error: UseVersionInfoError | null;
  refetch: () => Promise<any>;
  isStale: boolean;
  dataUpdatedAt: number;
  invalidateVersionInfo: () => Promise<void>;
}
```

### Използване

```tsx
import { useVersionInfo } from '@/hooks/use-version-info';

function VersionIndicator() {
  const { versionInfo, isLoading, error } = useVersionInfo({
    refreshInterval: 5 * 60 * 1000, // 5 minutes
    retryOnError: true
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Version unavailable</span>;

  return <span>v{versionInfo?.commit}</span>;
}
```

### Стратегия за кеширане

| Настройка | Стойност | Описание |
|---|---|---|
| `staleTime` | 5 минути | Данните се считат за свежи за 5 минути |
| `gcTime` | 30 минути | Събиране на боклука след 30 минути |
| `refetchOnWindowFocus` | `false` | Няма повторно извличане при превключване на раздел |
| `refetchOnReconnect` | `true` | Повторно извличане, когато мрежата се свърже отново |
| `refetchOnMount` | `false` | Пропуснете повторното извличане, ако кеша има данни |

### Повторете логиката

Куката прилага интелигентен повторен опит с експоненциално забавяне:

- Не опитва повторно при грешки на клиента (4xx статус кодове)
- Повторен опит за мрежови и сървърни грешки до 2 пъти
- Използва експоненциално забавяне: `min(1000 * 2^attempt, 30000ms)` ## Компонент за показване на версия

Компонентът `VersionDisplay` поддържа три визуални варианта:

### Вграден вариант (по подразбиране)

Компактен вграден дисплей, показващ хеша на ангажимента и относителното време:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Вариант на значката

Значка във формата на хапче с преливащ фон:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Подробен вариант

Карта с информация за пълната версия:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

Подробният вариант показва:
- Задаване на хеш и относително време
- Име на автора
- Съобщение за ангажиране (първи ред, цитиран)
- Дата на последна актуализация (когато `showDetails` е вярно)
- Дата на последно синхронизиране
- Име на хранилището

### Реквизит

| опора | Тип | По подразбиране | Описание |
|---|---|---|---|
| `className` | `string` | `""` | Допълнителни CSS класове |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Стил на показване |
| `showDetails` | `boolean` | `false` | Показване на разширени подробности (само подробен вариант) |
| `refreshInterval` | `number` | `300000` (5 минути) | Интервал на автоматично опресняване в милисекунди |

### Контрол на достъпа

Компонентът зачита потребителските роли:
- **Редовни потребители**: Компонентът е скрит, когато информацията за версията не е налична
- **Dev/Admin потребители**: Състоянието на грешка се показва със съобщение „Версията не е налична“

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Подсказка за версия `VersionTooltip` обгръща всеки елемент с подсказка, показваща подробна информация за версията:

```tsx
import { VersionTooltip } from '@/components/version/version-tooltip';

function Footer() {
  return (
    <VersionTooltip delay={300}>
      <span>Data v1.0</span>
    </VersionTooltip>
  );
}
```

### Функции на подсказката

| Характеристика | Описание |
|---|---|
| Забавено шоу | Конфигурируемо забавяне преди показване на подсказка (по подразбиране: 300ms) |
| Бързо скриване | 100ms забавяне при напускане на мишката за гладко взаимодействие |
| Задържане на подсказка | Подсказката остава видима, когато задържите курсора на мишката върху нея |
| Поддръжка на клавиатура | Клавишът Escape отхвърля подсказката |
| Достъпност | ARIA атрибути ( `role="tooltip"` , `aria-describedby` ) |
| Грациозна деградация | Връща деца без подсказка, когато данните не са налични |

### Реквизит

| опора | Тип | По подразбиране | Описание |
|---|---|---|---|
| `children` | `ReactNode` | задължително | Задействащият елемент |
| `className` | `string` | `""` | Допълнителни CSS класове |
| `disabled` | `boolean` | `false` | Деактивирайте изцяло подсказката |
| `delay` | `number` | `300` | Показване на забавяне в милисекунди |

## Помощни програми за кеширане

Куката `useVersionInfoUtils` осигурява функции за управление на кеша:

```tsx
import { useVersionInfoUtils } from '@/hooks/use-version-info';

function AdminPanel() {
  const {
    prefetchVersionInfo,
    invalidateVersionInfo,
    getVersionInfoFromCache,
    setVersionInfoInCache
  } = useVersionInfoUtils();

  // Prefetch version data before it is needed
  useEffect(() => {
    prefetchVersionInfo();
  }, []);

  // Force refresh
  const handleRefresh = () => invalidateVersionInfo();

  // Read directly from cache
  const cached = getVersionInfoFromCache();
}
```

## Форматиране на дата

Компонентът `VersionDisplay` включва мемоизирани помощни програми за форматиране на дата:

| Функция | Примерен резултат |
|---|---|
| `formatDate` | „15 януари 2025 г., 14:30 ч.“ |
| `getRelativeTime` | „Току-що“, „Преди 3 часа“, „Преди 2 дни“, „15 януари“ |
| `getRepositoryName` | "ever-works/awesome-time-tracking-data" |

## Ключови файлове

| Файл | Път |
|---|---|
| Кука с информация за версията | `hooks/use-version-info.ts` |
| Показване на версия | `components/version/version-display.tsx` |
| Подсказка за версия | `components/version/version-tooltip.tsx` |
| Версия API Route | `app/api/version/route.ts` |
