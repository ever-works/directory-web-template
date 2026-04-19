---
id: state-management
title: "Zarządzanie Państwem"
sidebar_label: "Zarządzanie Państwem"
sidebar_position: 26
---

# Zarządzanie Państwem

W szablonie zastosowano warstwowe podejście do zarządzania stanem: **Zapytanie Reagujące** (zapytanie TanStack) w przypadku stanu serwera, **Kontekst Reagowania** w przypadku globalnych ustawień interfejsu użytkownika i **stan komponentu lokalnego** w przypadku tymczasowych problemów związanych z interfejsem użytkownika. Na tej stronie opisano każdą warstwę, konfigurację klienta zapytań i wzorce używane w całej bazie kodu.

## Kategorie stanu

|Kategoria|Narzędzie|Przykłady|
|----------|------|----------|
|Stan serwera|Zareaguj na zapytanie|Dane użytkownika, przedmioty, kategorie, statystyki administratora|
|Globalny stan interfejsu użytkownika|Kontekst reakcji|Temat, układ, typ paginacji, szerokość kontenera|
|Stan lokalnego interfejsu użytkownika|`useState` / `useReducer`|Modalne otwieranie/zamykanie, wprowadzanie formularzy, widoczność menu rozwijanego|
|Utrwalone preferencje|`localStorage` poprzez kontekst|Klucz motywu, klucz układu, elementy na stronę|

## Konfiguracja zapytania reakcji

Klient zapytań jest tworzony w `lib/query-client.ts` przy użyciu funkcji fabrycznej, która obsługuje zarówno środowiska serwera, jak i przeglądarki:

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

Kluczowe decyzje projektowe:
- **Izolacja serwera**: na żądanie serwera tworzony jest nowy `QueryClient`, aby zapobiec wyciekom danych między użytkownikami
- **Singleton przeglądarki**: pojedyncza instancja jest ponownie wykorzystywana w sesji przeglądarki
- **Ponowne pobieranie konserwatywne**: `refetchOnWindowFocus` i `refetchOnMount` są domyślnie wyłączone, aby zminimalizować ruch sieciowy
- **Wykładniczy wycofywanie**: opóźnienie ponowienia próby jest dwukrotnie większe przy każdej próbie, maksymalnie do 30 sekund

## Fabryka kluczy zapytań

Dedykowany plik `react-query-config.ts` definiuje fabryki kluczy zapytań w celu spójnego zarządzania pamięcią podręczną:

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

Ten wzorzec fabryczny umożliwia ukierunkowane unieważnianie pamięci podręcznej. Na przykład `invalidateQueries({ queryKey: queryKeys.billing.all })` usuwa jednocześnie wszystkie zapytania związane z rozliczeniami.

## Narzędzia do unieważniania pamięci podręcznej

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

## Strategie pobierania wstępnego

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

Nazywa się je proaktywnie, gdy użytkownicy przechodzą na strony, które będą potrzebować tych danych.

## Wzór haka: useCurrentUser

Hak `hooks/use-current-user.ts` demonstruje standardowy wzór haka do pobierania danych:

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

Najważniejsze cechy wzoru:
- **Wyeksportowany klucz zapytania**: umożliwia innym hakom unieważnienie lub odczytanie tej pamięci podręcznej
- **Inteligentna ponowna próba**: błędy uwierzytelnienia nigdy nie są ponawiane
- **Pomocnicy pamięci podręcznej**: `invalidateUserCache`, `prefetchUser` i `setUserData` są udostępniane do użytku zewnętrznego

## Optymistyczne aktualizacje: użyjUlubionych

Hak `hooks/use-favorites.ts` demonstruje optymistyczne wzorce aktualizacji:

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

Wzór składa się z trzech kroków:
1. **onMutate**: anuluj zapytania w trakcie lotu, stan migawki, zastosuj optymistyczną aktualizację
2. **onError**: powrót do migawki
3. **onSuccess**: zastąp optymistyczne dane rzeczywistą odpowiedzią serwera

## Globalny stan interfejsu użytkownika: LayoutThemeContext

`components/context/LayoutThemeContext.tsx` zapewnia kontekst reakcji dla wszystkich globalnych preferencji interfejsu użytkownika:

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

Każde ustawienie jest zgodne z tym samym wewnętrznym wzorcem przy użyciu dedykowanych zaczepów menedżera:

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

Zasady projektowania:
- **Bezpieczeństwo nawodnienia**: stan zawsze inicjuje się z wartościami domyślnymi; localStorage jest odczytywany tylko w `useEffect` po zamontowaniu
- **Walidacja**: każdy ustawiający sprawdza wprowadzone dane przed zastosowaniem
- **Trwałość**: wszystkie preferencje są automatycznie synchronizowane z `localStorage`
- **Synchronizacja zmiennych CSS**: zmiany motywu natychmiast aktualizują niestandardowe właściwości CSS na `document.documentElement`

## Klucze zapytań dla poszczególnych haków w hakach administracyjnych

Każdy hak administratora CRUD definiuje własną przestrzeń nazw klucza zapytania:

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

Mutacje unieważniają się na poziomie przestrzeni nazw, aby zapewnić odświeżenie wszystkich powiązanych zapytań:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Odniesienie do pliku

|Plik|Cel|
|------|---------|
|`lib/query-client.ts`|Zapytanie o fabrykę klienta (serwer vs przeglądarka)|
|`lib/react-query-config.ts`|Zapytania o kluczowe fabryki, narzędzia pamięci podręcznej, strategie pobierania wstępnego|
|`lib/api/constants.ts`|Domyślne czasy przestarzałych i stałe konfiguracji zapytań|
|`components/context/LayoutThemeContext.tsx`|Globalny kontekst ustawień interfejsu użytkownika z trwałością localStorage|
|`hooks/use-current-user.ts`|Przykładowy hak do pobierania danych z zarządzaniem pamięcią podręczną|
|`hooks/use-favorites.ts`|Przykład optymistycznego wzorca aktualizacji|
|`hooks/use-admin-categories.ts`|Przykładowy hak administratora CRUD z przestrzenią nazw kluczy zapytania|
