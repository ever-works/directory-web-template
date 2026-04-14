---
id: state-management
title: "Управление на държавата"
sidebar_label: "Управление на държавата"
sidebar_position: 26
---

# Управление на държавата

Шаблонът използва многослоен подход за управление на състоянието: **React Query** (TanStack Query) за състояние на сървъра, **React Context** за глобални настройки на потребителския интерфейс и **локално състояние на компонента** за ефимерни проблеми с потребителския интерфейс. Тази страница обхваща всеки слой, конфигурацията на клиента за заявки и моделите, използвани в цялата кодова база.

## Държавни категории

|Категория|Инструмент|Примери|
|----------|------|----------|
|Състояние на сървъра|Реагиране на заявка|Потребителски данни, елементи, категории, администраторски статистики|
|Глобално състояние на потребителския интерфейс|Реагирайте контекст|Тема, оформление, тип пагинация, ширина на контейнера|
|Състояние на локалния потребителски интерфейс|`useState` / `useReducer`|Модално отваряне/затваряне, въвеждане на формуляри, видимост на падащото меню|
|Постоянни предпочитания|`localStorage` чрез контекст|Ключ за тема, ключ за оформление, елементи на страница|

## Конфигурация на заявка за реакция

Клиентът за заявка се създава в `lib/query-client.ts` с помощта на фабрична функция, която обработва както сървър, така и среда на браузър:

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

Основни дизайнерски решения:
- **Изолация на сървъра**: нов `QueryClient` се създава за всяка заявка на сървъра, за да се предотврати изтичането на данни между потребителите
- **Browser singleton**: единичен екземпляр се използва повторно в сесията на браузъра
- **Консервативно повторно извличане**: `refetchOnWindowFocus` и `refetchOnMount` са деактивирани по подразбиране, за да се минимизира мрежовият трафик
- **Експоненциално забавяне**: закъсненията при повторен опит се удвояват с всеки опит, ограничени до 30 секунди

## Query Key Factory

Специален `react-query-config.ts` файл дефинира фабрики за ключови заявки за последователно управление на кеша:

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

Този фабричен модел позволява насочена невалидност на кеша. Например `invalidateQueries({ queryKey: queryKeys.billing.all })` изчиства наведнъж всички свързани с фактурирането заявки.

## Помощни програми за невалидност на кеша

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

## Стратегии за предварително извличане

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

Те се извикват проактивно, когато потребителите навигират до страници, които ще се нуждаят от тези данни.

## Модел на кука: useCurrentUser

Куката `hooks/use-current-user.ts` демонстрира стандартния модел на кука за извличане на данни:

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

Акценти на модела:
- **Експортиран ключ на заявка**: позволява на други кукички да обезсилят или прочетат този кеш
- **Интелигентен повторен опит**: грешки при удостоверяване никога не се опитват повторно
- **Помощници за кеша**: `invalidateUserCache`, `prefetchUser` и `setUserData` са изложени за външна употреба

## Оптимистични актуализации: използвайте Предпочитани

Куката `hooks/use-favorites.ts` демонстрира оптимистични модели на актуализиране:

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

Моделът следва три стъпки:
1. **onMutate**: анулиране на заявки по време на полет, състояние на моментна снимка, прилагане на оптимистична актуализация
2. **onError**: връщане назад към моментната снимка
3. **onSuccess**: замени оптимистичните данни с реалния отговор на сървъра

## Глобално състояние на потребителския интерфейс: LayoutThemeContext

`components/context/LayoutThemeContext.tsx` предоставя контекст на React за всички глобални предпочитания на потребителския интерфейс:

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

Всяка настройка следва един и същ вътрешен модел, като използва специални мениджърски кукички:

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

Принципи на проектиране:
- **Безопасност на хидратацията**: състоянието винаги се инициализира с настройки по подразбиране; localStorage се чете само в `useEffect` след монтиране
- **Валидиране**: всеки установител валидира въведеното преди да приложи
- **Постоянство**: всички предпочитания се синхронизират автоматично с `localStorage`
- **Синхронизиране на CSS променливи**: промените на темата незабавно актуализират персонализираните свойства на CSS на `document.documentElement`

## Ключове за заявка за всяка кука в куките на администратора

Всяка администраторска CRUD кука дефинира собствено пространство от имена на ключове за заявки:

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

Мутациите правят невалидни на ниво пространство от имена, за да се гарантира, че всички свързани заявки са обновени:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Референтен файл

|Файл|Цел|
|------|---------|
|`lib/query-client.ts`|Фабрика за заявка на клиента (сървър срещу браузър)|
|`lib/react-query-config.ts`|Запитване за ключови фабрики, помощни програми за кеширане, стратегии за предварително извличане|
|`lib/api/constants.ts`|Времена на застояване по подразбиране и константи за конфигуриране на заявки|
|`components/context/LayoutThemeContext.tsx`|Глобален контекст на настройките на потребителския интерфейс с устойчивост на localStorage|
|`hooks/use-current-user.ts`|Примерна кука за извличане на данни с управление на кеша|
|`hooks/use-favorites.ts`|Примерен оптимистичен модел за актуализиране|
|`hooks/use-admin-categories.ts`|Примерна кука за администраторски CRUD с пространство на имената на ключ на заявка|
