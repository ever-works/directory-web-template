---
id: state-management
title: "Staatsbeheer"
sidebar_label: "Staatsbeheer"
sidebar_position: 26
---

# Staatsbeheer

De sjabloon maakt gebruik van een gelaagde benadering van statusbeheer: **React Query** (TanStack Query) voor de serverstatus, **React Context** voor globale UI-instellingen en **lokale componentstatus** voor kortstondige UI-problemen. Deze pagina behandelt elke laag, de configuratie van de queryclient en patronen die in de codebase worden gebruikt.

## Staatscategorieën

|Categorie|Gereedschap|Voorbeelden|
|----------|------|----------|
|Serverstatus|Reageer op vraag|Gebruikersgegevens, items, categorieën, beheerdersstatistieken|
|Globale UI-status|Reageercontext|Thema, lay-out, pagineringstype, containerbreedte|
|Lokale UI-status|`useState` / `useReducer`|Modaal openen/sluiten, formulierinvoer, dropdown-zichtbaarheid|
|Aanhoudende voorkeuren|`localStorage` via Context|Themasleutel, lay-outsleutel, items per pagina|

## Reageer op queryconfiguratie

De queryclient wordt gemaakt in `lib/query-client.ts` met behulp van een fabrieksfunctie die zowel server- als browseromgevingen afhandelt:

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

Belangrijke ontwerpbeslissingen:
- **Serverisolatie**: per serververzoek wordt een nieuwe `QueryClient` aangemaakt om te voorkomen dat gegevens tussen gebruikers lekken
- **Browser singleton**: één exemplaar wordt tijdens de browsersessie hergebruikt
- **Conservatief opnieuw ophalen**: `refetchOnWindowFocus` en `refetchOnMount` zijn standaard uitgeschakeld om het netwerkverkeer te minimaliseren
- **Exponentieel uitstel**: de vertraging bij nieuwe pogingen verdubbelt bij elke poging, met een maximum van 30 seconden

## Querysleutelfabriek

Een speciaal `react-query-config.ts`-bestand definieert querysleutelfabrieken voor consistent cachebeheer:

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

Dit fabriekspatroon maakt gerichte cache-invalidatie mogelijk. Met `invalidateQueries({ queryKey: queryKeys.billing.all })` worden bijvoorbeeld alle factureringsgerelateerde vragen in één keer gewist.

## Cache-invalidatiehulpprogramma's

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

## Strategieën vooraf ophalen

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

Deze worden proactief opgeroepen wanneer gebruikers naar pagina's navigeren die deze gegevens nodig hebben.

## Haakpatroon: useCurrentUser

De `hooks/use-current-user.ts` hook demonstreert het standaard hookpatroon voor het ophalen van gegevens:

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

Hoogtepunten van het patroon:
- **Geëxporteerde querysleutel**: zorgt ervoor dat andere hooks deze cache ongeldig kunnen maken of lezen
- **Slim opnieuw proberen**: authenticatiefouten worden nooit opnieuw geprobeerd
- **Cachehelpers**: `invalidateUserCache`, `prefetchUser` en `setUserData` zijn beschikbaar voor extern gebruik

## Optimistische updates: gebruik Favorieten

De `hooks/use-favorites.ts` hook demonstreert optimistische updatepatronen:

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

Het patroon volgt drie stappen:
1. **onMutate**: annuleer zoekopdrachten tijdens de vlucht, momentopnamestatus, pas optimistische update toe
2. **onError**: terugdraaien naar de momentopname
3. **onSuccess**: vervang de optimistische gegevens door het echte serverantwoord

## Algemene UI-status: LayoutThemeContext

De `components/context/LayoutThemeContext.tsx` biedt een React Context voor alle globale UI-voorkeuren:

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

Elke instelling volgt hetzelfde interne patroon met behulp van speciale manager-hooks:

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

Ontwerpprincipes:
- **Hydratatieveiligheid**: status wordt altijd geïnitialiseerd met standaardwaarden; localStorage wordt alleen gelezen in `useEffect` na het koppelen
- **Validatie**: elke setter valideert de invoer voordat hij deze toepast
- **Persistentie**: alle voorkeuren worden automatisch gesynchroniseerd met `localStorage`
- **CSS-variabelesynchronisatie**: themawijzigingen updaten onmiddellijk aangepaste CSS-eigenschappen op `document.documentElement`

## Querysleutels per haak in Admin Hooks

Elke admin CRUD-hook definieert zijn eigen querysleutelnaamruimte:

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

Mutaties worden ongeldig op naamruimteniveau om ervoor te zorgen dat alle gerelateerde zoekopdrachten worden vernieuwd:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Bestandsreferentie

|Bestand|Doel|
|------|---------|
|`lib/query-client.ts`|Queryclientfabriek (server versus browser)|
|`lib/react-query-config.ts`|Query-sleutelfabrieken, cachehulpprogramma's, prefetch-strategieën|
|`lib/api/constants.ts`|Standaard verouderingstijden en queryconfiguratieconstanten|
|`components/context/LayoutThemeContext.tsx`|Algemene context van UI-instellingen met localStorage-persistentie|
|`hooks/use-current-user.ts`|Voorbeeld van een haak voor het ophalen van gegevens met cachebeheer|
|`hooks/use-favorites.ts`|Voorbeeld van een optimistisch updatepatroon|
|`hooks/use-admin-categories.ts`|Voorbeeld admin CRUD-hook met naamruimte voor querysleutels|
