---
id: state-management
title: "Staatsmanagement"
sidebar_label: "Staatsmanagement"
sidebar_position: 26
---

# Staatsmanagement

Die Vorlage verwendet einen mehrschichtigen Zustandsverwaltungsansatz: **React Query** (TanStack Query) für den Serverstatus, **React Context** für globale UI-Einstellungen und **Local Component State** für kurzlebige UI-Anliegen. Diese Seite behandelt jede Ebene, die Abfrage-Client-Konfiguration und die in der Codebasis verwendeten Muster.

## Staatskategorien

|Kategorie|Werkzeug|Beispiele|
|----------|------|----------|
|Serverstatus|Abfrage reagieren|Benutzerdaten, Elemente, Kategorien, Administratorstatistiken|
|Globaler UI-Status|Kontext reagieren|Thema, Layout, Paginierungstyp, Containerbreite|
|Lokaler UI-Status|`useState` / `useReducer`|Modales Öffnen/Schließen, Formulareingaben, Dropdown-Sichtbarkeit|
|Anhaltende Präferenzen|`localStorage` über Kontext|Themenschlüssel, Layoutschlüssel, Elemente pro Seite|

## Abfragekonfiguration reagieren

Der Abfrage-Client wird in `lib/query-client.ts` mithilfe einer Factory-Funktion erstellt, die sowohl Server- als auch Browserumgebungen verwaltet:

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

Wichtige Designentscheidungen:
- **Serverisolation**: Pro Serveranforderung wird ein neuer `QueryClient` erstellt, um Datenlecks zwischen Benutzern zu verhindern
- **Browser-Singleton**: Eine einzelne Instanz wird während der gesamten Browsersitzung wiederverwendet
- **Konservatives erneutes Abrufen**: `refetchOnWindowFocus` und `refetchOnMount` sind standardmäßig deaktiviert, um den Netzwerkverkehr zu minimieren
- **Exponentieller Backoff**: Verzögerungen bei Wiederholungsversuchen verdoppeln sich bei jedem Versuch und sind auf 30 Sekunden begrenzt

## Schlüsselfabrik abfragen

Eine dedizierte `react-query-config.ts`-Datei definiert Abfrageschlüsselfabriken für eine konsistente Cache-Verwaltung:

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

Dieses Factory-Muster ermöglicht eine gezielte Cache-Invalidierung. Beispielsweise löscht `invalidateQueries({ queryKey: queryKeys.billing.all })` alle abrechnungsbezogenen Abfragen auf einmal.

## Dienstprogramme zur Cache-Invalidierung

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

## Prefetch-Strategien

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

Diese werden proaktiv aufgerufen, wenn Benutzer zu Seiten navigieren, die diese Daten benötigen.

## Hook-Muster: useCurrentUser

Der Hook `hooks/use-current-user.ts` demonstriert das standardmäßige Hook-Muster zum Datenabruf:

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

Muster-Highlights:
- **Exportierter Abfrageschlüssel**: Ermöglicht anderen Hooks, diesen Cache ungültig zu machen oder zu lesen
- **Intelligenter Wiederholungsversuch**: Authentifizierungsfehler werden nie wiederholt
- **Cache-Helfer**: `invalidateUserCache`, `prefetchUser` und `setUserData` werden für die externe Verwendung bereitgestellt

## Optimistische Updates: Verwenden Sie Favoriten

Der `hooks/use-favorites.ts`-Hook zeigt optimistische Aktualisierungsmuster:

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

Das Muster besteht aus drei Schritten:
1. **onMutate**: In-Flight-Abfragen abbrechen, Snapshot-Status erstellen, optimistisches Update anwenden
2. **onError**: Rollback zum Snapshot
3. **onSuccess**: Ersetzen Sie die optimistischen Daten durch die echte Serverantwort

## Globaler UI-Status: LayoutThemeContext

Das `components/context/LayoutThemeContext.tsx` stellt einen Reaktionskontext für alle globalen UI-Einstellungen bereit:

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

Jede Einstellung folgt demselben internen Muster und verwendet dedizierte Manager-Hooks:

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

Gestaltungsprinzipien:
- **Hydrationssicherheit**: Der Status wird immer mit den Standardeinstellungen initialisiert; localStorage wird erst nach dem Mounten in `useEffect` eingelesen
- **Validierung**: Jeder Setter validiert die Eingabe vor der Anwendung
- **Persistenz**: Alle Einstellungen werden automatisch mit `localStorage` synchronisiert
- **CSS-Variablensynchronisierung**: Theme-Änderungen aktualisieren sofort benutzerdefinierte CSS-Eigenschaften auf `document.documentElement`

## Pro-Hook-Abfrageschlüssel in Admin-Hooks

Jeder Admin-CRUD-Hook definiert seinen eigenen Abfrageschlüssel-Namespace:

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

Mutationen werden auf Namespace-Ebene ungültig gemacht, um sicherzustellen, dass alle zugehörigen Abfragen aktualisiert werden:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Dateireferenz

|Datei|Zweck|
|------|---------|
|`lib/query-client.ts`|Client-Factory abfragen (Server vs. Browser)|
|`lib/react-query-config.ts`|Fragen Sie Schlüsselfabriken, Cache-Dienstprogramme und Prefetch-Strategien ab|
|`lib/api/constants.ts`|Standardmäßige veraltete Zeiten und Abfragekonfigurationskonstanten|
|`components/context/LayoutThemeContext.tsx`|Globaler UI-Einstellungskontext mit localStorage-Persistenz|
|`hooks/use-current-user.ts`|Beispiel für einen Datenabruf-Hook mit Cache-Verwaltung|
|`hooks/use-favorites.ts`|Beispiel für ein optimistisches Aktualisierungsmuster|
|`hooks/use-admin-categories.ts`|Beispiel eines Admin-CRUD-Hooks mit Abfrageschlüssel-Namespace|
