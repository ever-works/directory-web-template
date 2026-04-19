---
id: state-management
title: "Государственное управление"
sidebar_label: "Государственное управление"
sidebar_position: 26
---

# Государственное управление

В шаблоне используется многоуровневый подход к управлению состоянием: **React Query** (TanStack Query) для состояния сервера, **React Context** для глобальных настроек пользовательского интерфейса и **локальное состояние компонента** для эфемерных проблем пользовательского интерфейса. На этой странице описываются каждый уровень, конфигурация клиента запросов и шаблоны, используемые в базе кода.

## Категории штатов

|Категория|Инструмент|Примеры|
|----------|------|----------|
|Состояние сервера|Реагировать на запрос|Пользовательские данные, элементы, категории, статистика администратора|
|Глобальное состояние пользовательского интерфейса|Реагировать на контекст|Тема, макет, тип пагинации, ширина контейнера.|
|Состояние локального пользовательского интерфейса|`useState` / `useReducer`|Модальное открытие/закрытие, ввод формы, видимость раскрывающегося списка|
|Сохраняющиеся предпочтения|`localStorage` через контекст|Ключ темы, ключ макета, количество элементов на странице|

## Конфигурация запроса React

Клиент запросов создается в `lib/query-client.ts` с использованием заводской функции, которая обрабатывает как серверную, так и браузерную среду:

```tsx
// lib/query-client.ts
import { isServer, QueryClient } from '@tanstack/react-query';

export function createQueryClientInstance(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,         // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: (failureCount) => failureCount < 2,
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
        onError: (error) => {
          toast.error(`Mutation Error: ${error.message}`);
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export const getQueryClient = () => {
  if (isServer) {
    return createQueryClientInstance();
  } else {
    if (!browserQueryClient) browserQueryClient = createQueryClientInstance();
    return browserQueryClient;
  }
};
```

Ключевые дизайнерские решения:
- **Изоляция сервера**: для каждого запроса сервера создается новый `QueryClient`, чтобы предотвратить утечку данных между пользователями.
- **Одноэлемент браузера**: один экземпляр повторно используется в течение сеанса браузера.
- **Консервативная повторная выборка**: `refetchOnWindowFocus` и `refetchOnMount` отключены по умолчанию, чтобы минимизировать сетевой трафик.
- **Экспоненциальная отсрочка**: задержка повторной попытки удваивается с каждой попыткой, но не более 30 секунд.

## Запросить фабрику ключей

Специальный файл `react-query-config.ts` определяет фабрики ключей запросов для согласованного управления кэшем:

```tsx
// lib/react-query-config.ts
export const queryKeys = {
  billing: {
    all: ['billing'] as const,
    subscription: () => [...queryKeys.billing.all, 'subscription'] as const,
    payments: () => [...queryKeys.billing.all, 'payments'] as const,
    user: (userId: string) => [...queryKeys.billing.all, 'user', userId] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    settings: () => [...queryKeys.user.all, 'settings'] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    subscriptions: () => [...queryKeys.admin.all, 'subscriptions'] as const,
  },
};
```

Этот фабричный шаблон позволяет целенаправленно аннулировать кэш. Например, `invalidateQueries({ queryKey: queryKeys.billing.all })` удаляет все запросы, связанные с выставлением счетов, сразу.

## Утилиты аннулирования кэша

```tsx
// lib/react-query-config.ts
export const cacheUtils = {
  invalidateBilling: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.all });
  },
  invalidateSubscription: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
  },
  resetCache: () => {
    queryClient.clear();
  },
};
```

## Стратегии предварительной выборки

```tsx
export const prefetchStrategies = {
  billing: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.billing.subscription(),
      queryFn: async () => { /* API call */ },
      staleTime: 5 * 60 * 1000,
    });
  },
  userProfile: () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.user.profile(),
      queryFn: async () => { /* API call */ },
      staleTime: 10 * 60 * 1000,
    });
  },
};
```

Они вызываются заранее, когда пользователи переходят на страницы, которым потребуются эти данные.

## Шаблон хука: useCurrentUser

Перехват `hooks/use-current-user.ts` демонстрирует стандартный шаблон перехвата выборки данных:

```tsx
// hooks/use-current-user.ts
export const CURRENT_USER_QUERY_KEY = ['auth-session'] as const;

export function useCurrentUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError, error, refetch } =
    useQuery<User, UseCurrentUserError>({
      queryKey: CURRENT_USER_QUERY_KEY,
      queryFn: fetchCurrentUser,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error.status === 401 || error.status === 403) return false;
        return failureCount < 2;
      },
    });

  const invalidateUserCache = () => {
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  };

  return { user, isLoading, isError, error, refetch, invalidateUserCache };
}
```

Основные моменты узора:
- **Экспортированный ключ запроса**: позволяет другим перехватчикам аннулировать или читать этот кеш.
- **Умная повторная попытка**: ошибки аутентификации никогда не повторяются.
- **Помощники кэша**: `invalidateUserCache`, `prefetchUser` и `setUserData` доступны для внешнего использования.

## Оптимистичные обновления: используйтеFavorites

Хук `hooks/use-favorites.ts` демонстрирует оптимистичные шаблоны обновления:

```tsx
// hooks/use-favorites.ts (simplified)
const addFavoriteMutation = useMutation({
  mutationFn: addFavorite,
  onMutate: async (newFavorite) => {
    await queryClient.cancelQueries({ queryKey: ['favorites'] });
    const previousFavorites =
      queryClient.getQueryData<Favorite[]>(['favorites']) ?? [];

    // Optimistically add the item
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) => [
      ...old,
      { id: `temp-${Date.now()}`, ...newFavorite },
    ]);

    return { previousFavorites };
  },
  onError: (err, _newFavorite, context) => {
    // Rollback on failure
    if (context) {
      queryClient.setQueryData(['favorites'], context.previousFavorites);
    }
    toast.error(err.message || 'Failed to add to favorites');
  },
  onSuccess: (realFavorite) => {
    // Replace temp item with server response
    queryClient.setQueryData<Favorite[]>(['favorites'], (old = []) =>
      old.map((fav) =>
        fav.id.startsWith('temp-') && fav.itemSlug === realFavorite.itemSlug
          ? realFavorite
          : fav
      )
    );
  },
});
```

Схема состоит из трех шагов:
1. **onMutate**: отмена текущих запросов, состояние моментального снимка, применение оптимистического обновления.
2. **onError**: откат к снимку
3. **onSuccess**: замените оптимистичные данные реальным ответом сервера.

## Глобальное состояние пользовательского интерфейса: LayoutThemeContext

`components/context/LayoutThemeContext.tsx` предоставляет контекст React для всех глобальных настроек пользовательского интерфейса:

```tsx
// components/context/LayoutThemeContext.tsx
interface LayoutThemeContextType {
  layoutKey: LayoutKey;
  setLayoutKey: (key: LayoutKey) => void;
  themeKey: ThemeKey;
  setThemeKey: (key: ThemeKey) => void;
  currentTheme: ThemeConfig;
  paginationType: PaginationType;
  setPaginationType: (type: PaginationType) => void;
  itemsPerPage: number;
  setItemsPerPage: (count: number) => void;
  containerWidth: ContainerWidth;
  setContainerWidth: (width: ContainerWidth) => void;
  // ... more settings
}
```

Каждая настройка соответствует одному и тому же внутреннему шаблону с использованием специальных хуков менеджера:

```tsx
const useThemeManager = () => {
  const [themeKey, setThemeKeyState] = useState<ThemeKey>(DEFAULT_THEME);

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = safeLocalStorage.getItem('themeKey');
    if (saved && isValidThemeKey(saved)) {
      setThemeKeyState(saved);
    }
  }, []);

  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    safeLocalStorage.setItem('themeKey', key);
    applyThemeWithPalettes(key);
  }, []);

  return { themeKey, setThemeKey, currentTheme };
};
```

Принципы проектирования:
- **Безопасность гидратации**: состояние всегда инициализируется значениями по умолчанию; localStorage читается только в `useEffect` после монтирования
- **Проверка**: каждый установщик проверяет введенные данные перед применением.
- **Постоянство**: все настройки автоматически синхронизируются с `localStorage`.
- **Синхронизация переменных CSS**: при изменении темы немедленно обновляются пользовательские свойства CSS на `document.documentElement`

## Ключи запроса для каждого хука в хуках администратора

Каждый крючок администратора CRUD определяет свое собственное пространство имен ключей запроса:

```tsx
// hooks/use-admin-categories.ts
const QUERY_KEYS = {
  categories: ['admin', 'categories'] as const,
  categoriesList: (params) =>
    [...QUERY_KEYS.categories, 'list', params] as const,
  allCategories: () =>
    [...QUERY_KEYS.categories, 'all'] as const,
  category: (id: string) =>
    [...QUERY_KEYS.categories, 'detail', id] as const,
};
```

Мутации становятся недействительными на уровне пространства имен, чтобы обеспечить обновление всех связанных запросов:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Ссылка на файл

|Файл|Цель|
|------|---------|
|`lib/query-client.ts`|Фабрика клиентских запросов (сервер или браузер)|
|`lib/react-query-config.ts`|Фабрики ключей запросов, утилиты кэширования, стратегии предварительной выборки|
|`lib/api/constants.ts`|Время устаревания по умолчанию и константы конфигурации запроса|
|`components/context/LayoutThemeContext.tsx`|Контекст глобальных настроек пользовательского интерфейса с сохранением localStorage|
|`hooks/use-current-user.ts`|Пример перехватчика данных с управлением кешем|
|`hooks/use-favorites.ts`|Пример оптимистичного шаблона обновления|
|`hooks/use-admin-categories.ts`|Пример CRUD администратора с пространством имен ключей запроса|
