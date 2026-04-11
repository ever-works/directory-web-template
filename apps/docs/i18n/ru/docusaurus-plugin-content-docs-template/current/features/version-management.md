---
id: version-management
title: Управление версиями
sidebar_label: Управление версиями
sidebar_position: 15
---

# Управление версиями

Шаблон Ever Works включает систему управления версиями, которая отслеживает версию хранилища данных, отображает информацию о версии администраторам и обеспечивает автоматическое обнаружение синхронизации. Эта система отслеживает репозиторий контента CMS на базе Git и предоставляет сведения о версии через настраиваемые компоненты пользовательского интерфейса.

## Обзор архитектуры

| Компонент | Путь | Цель |
|---|---|---|
| `useVersionInfo` | `hooks/use-version-info.ts` | Перехватчик React Query для получения данных о версии из API |
| `useVersionInfoUtils` | `hooks/use-version-info.ts` | Утилита для управления кэшем |
| `VersionDisplay` | `components/version/version-display.tsx` | Настраиваемый компонент отображения версии |
| `VersionTooltip` | `components/version/version-tooltip.tsx` | Подсказка при наведении, показывающая подробную информацию о версии |
| `/api/version` | `app/api/version/route.ts` | Конечная точка API, возвращающая данные текущей версии |

## Структура данных информации о версии

Система версий отслеживает следующие данные из хранилища контента:

| Поле | Тип | Описание |
|---|---|---|
| `commit` | `string` | Короткий хеш коммита текущей версии данных |
| `date` | `string` | Строка даты ISO коммита |
| `author` | `string` | Имя автора коммита |
| `message` | `string` | Зафиксировать сообщение |
| `repository` | `string` | URL-адрес репозитория |
| `lastSync` | `string` | Временная метка последней синхронизации данных |

## Крючок `useVersionInfo` ### Интерфейс

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

### Использование

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

### Стратегия кэширования

| Настройка | Значение | Описание |
|---|---|---|
| `staleTime` | 5 минут | Данные считаются свежими в течение 5 минут |
| `gcTime` | 30 минут | Вывоз мусора через 30 минут |
| `refetchOnWindowFocus` | `false` | Нет повторной загрузки при переключении вкладок |
| `refetchOnReconnect` | `true` | Обновление при повторном подключении сети |
| `refetchOnMount` | `false` | Пропустить повторную выборку, если в кэше есть данные |

### Повторить логику

Хук реализует интеллектуальную повторную попытку с экспоненциальной отсрочкой:

- Не повторяет попытки при ошибках клиента (коды состояния 4xx)
- Повторяет ошибки сети и сервера до 2 раз.
- Использует экспоненциальную задержку: `min(1000 * 2^attempt, 30000ms)` ## Компонент отображения версии

Компонент `VersionDisplay` поддерживает три визуальных варианта:

### Встроенный вариант (по умолчанию)

Компактный встроенный дисплей, показывающий хеш фиксации и относительное время:

```tsx
<VersionDisplay variant="inline" />
// Output: v abc1234 . 2h ago .
```

### Вариант значка

Значок в форме таблетки с градиентным фоном:

```tsx
<VersionDisplay variant="badge" />
// Output: [git-icon] v abc1234 . 2h ago
```

### Подробный вариант

Карточка с полной информацией о версии:

```tsx
<VersionDisplay
  variant="detailed"
  showDetails={true}
  refreshInterval={10 * 60 * 1000}
/>
```

Подробный вариант показывает:
- Фиксировать хеш и относительное время
- Имя автора
- Сообщение фиксации (первая строка, в кавычках)
- Временная метка последнего обновления (когда `showDetails` истинно)
- Временная метка последней синхронизации
- Имя репозитория

### Реквизит

| Опора | Тип | По умолчанию | Описание |
|---|---|---|---|
| `className` | `string` | `""` | Дополнительные классы CSS |
| `variant` | `"inline" \| "badge" \| "detailed"` | `"inline"` | Стиль отображения |
| `showDetails` | `boolean` | `false` | Показать расширенную информацию (только подробный вариант) |
| `refreshInterval` | `number` | `300000` (5 мин) | Интервал автообновления в миллисекундах |

### Контроль доступа

Компонент учитывает роли пользователей:
- **Обычные пользователи**: компонент скрыт, если информация о версии недоступна.
- **Пользователи-разработчики и администраторы**: состояние ошибки отображается сообщением «Версия недоступна».

```tsx
const isDevOrAdmin = useIsDevOrAdmin();

if (error || !versionInfo) {
  if (!isDevOrAdmin) return null;  // Hide for regular users
  return <span>Version unavailable</span>;  // Show error for admins
}
```

## Подсказка по версии `VersionTooltip` оборачивает любой элемент всплывающей подсказкой, отображающей подробную информацию о версии:

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

### Возможности всплывающей подсказки

| Особенность | Описание |
|---|---|
| Отложенное шоу | Настраиваемая задержка перед появлением всплывающей подсказки (по умолчанию: 300 мс) |
| Быстро скрыть | Задержка 100 мс при отпускании мыши для плавного взаимодействия |
| Подсказка при наведении | Подсказка остается видимой при наведении на нее курсора |
| Поддержка клавиатуры | Клавиша Escape закрывает всплывающую подсказку |
| Доступность | Атрибуты ARIA ( `role="tooltip"` , `aria-describedby` ) |
| Изящная деградация | Возвращает дочерние элементы без всплывающей подсказки, если данные недоступны |

### Реквизит

| Опора | Тип | По умолчанию | Описание |
|---|---|---|---|
| `children` | `ReactNode` | требуется | Триггерный элемент |
| `className` | `string` | `""` | Дополнительные классы CSS |
| `disabled` | `boolean` | `false` | Полностью отключить всплывающую подсказку |
| `delay` | `number` | `300` | Показать задержку в миллисекундах |

## Утилиты кэширования

Хук `useVersionInfoUtils` обеспечивает функции управления кэшем:

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

## Форматирование даты

Компонент `VersionDisplay` включает в себя утилиты форматирования даты в памяти:

| Функция | Пример вывода |
|---|---|
| `formatDate` | «15 янв. 2025 г., 14:30» |
| `getRelativeTime` | «Только что», «3 часа назад», «2 дня назад», «15 января» |
| `getRepositoryName` | «всегда работает/потрясающие данные для отслеживания времени» |

## Ключевые файлы

| Файл | Путь |
|---|---|
| Информация о версии `hooks/use-version-info.ts` |
| Отображение версии | `components/version/version-display.tsx` |
| Подсказка по версии | `components/version/version-tooltip.tsx` |
| Маршрут API версии | `app/api/version/route.ts` |
