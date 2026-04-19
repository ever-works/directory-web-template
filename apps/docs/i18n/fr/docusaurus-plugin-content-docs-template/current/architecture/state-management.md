---
id: state-management
title: "Gestion de l'État"
sidebar_label: "Gestion de l'État"
sidebar_position: 26
---

# Gestion de l'État

Le modèle utilise une approche de gestion d'état en couches : **React Query** (TanStack Query) pour l'état du serveur, **React Context** pour les paramètres globaux de l'interface utilisateur et **état des composants locaux** pour les problèmes d'interface utilisateur éphémères. Cette page couvre chaque couche, la configuration du client de requête et les modèles utilisés dans la base de code.

## Catégories d'État

|Catégorie|Outil|Exemples|
|----------|------|----------|
|État du serveur|Réagir à la requête|Données utilisateur, éléments, catégories, statistiques d'administration|
|État global de l'interface utilisateur|Contexte de réaction|Thème, mise en page, type de pagination, largeur du conteneur|
|État de l'interface utilisateur locale|`useState` / `useReducer`|Ouverture/fermeture modale, entrées de formulaire, visibilité dans la liste déroulante|
|Préférences persistantes|`localStorage` via le contexte|Clé de thème, clé de mise en page, éléments par page|

## Configuration de la requête de réaction

Le client de requête est créé dans `lib/query-client.ts` à l'aide d'une fonction d'usine qui gère à la fois les environnements de serveur et de navigateur :

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

Décisions de conception clés :
- **Isolement du serveur** : un nouveau `QueryClient` est créé par requête du serveur pour éviter les fuites de données entre les utilisateurs.
- **Singleton du navigateur** : une seule instance est réutilisée tout au long de la session du navigateur
- **Récupération conservatrice** : `refetchOnWindowFocus` et `refetchOnMount` sont désactivés par défaut pour minimiser le trafic réseau.
- **Interruption exponentielle** : les délais de nouvelle tentative doublent à chaque tentative, plafonnés à 30 secondes.

## Fabrique de clés de requête

Un fichier `react-query-config.ts` dédié définit les fabriques de clés de requête pour une gestion cohérente du cache :

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

Ce modèle d'usine permet une invalidation ciblée du cache. Par exemple, `invalidateQueries({ queryKey: queryKeys.billing.all })` efface simultanément toutes les requêtes liées à la facturation.

## Utilitaires d'invalidation du cache

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

## Stratégies de prélecture

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

Ceux-ci sont appelés de manière proactive lorsque les utilisateurs accèdent à des pages qui auront besoin de ces données.

## Modèle de crochet : useCurrentUser

Le hook `hooks/use-current-user.ts` illustre le modèle de hook standard de récupération de données :

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

Points forts du motif :
- **Clé de requête exportée** : permet à d'autres hooks d'invalider ou de lire ce cache
- **Réessai intelligent** : les erreurs d'authentification ne sont jamais réessayées
- **Assistants de cache** : `invalidateUserCache`, `prefetchUser` et `setUserData` sont exposés pour une utilisation externe.

## Mises à jour optimistes : useFavorites

Le hook `hooks/use-favorites.ts` démontre des modèles de mise à jour optimistes :

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

Le modèle suit trois étapes :
1. **onMutate** : annuler les requêtes en cours, l'état de l'instantané, appliquer la mise à jour optimiste
2. **onError** : retour à l'instantané
3. **onSuccess** : remplacez les données optimistes par la réponse réelle du serveur

## État global de l’interface utilisateur : LayoutThemeContext

Le `components/context/LayoutThemeContext.tsx` fournit un contexte React pour toutes les préférences globales de l'interface utilisateur :

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

Chaque paramètre suit le même modèle interne à l’aide de hooks de gestionnaire dédiés :

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

Principes de conception :
- **Sécurité de l'hydratation** : l'état s'initialise toujours avec les valeurs par défaut ; localStorage n'est lu que dans `useEffect` après le montage
- **Validation** : chaque passeur valide la saisie avant de postuler
- **Persistance** : toutes les préférences sont automatiquement synchronisées avec `localStorage`
- **Synchronisation des variables CSS** : les changements de thème mettent immédiatement à jour les propriétés personnalisées CSS sur `document.documentElement`

## Clés de requête par hook dans les hooks d'administration

Chaque hook CRUD d'administrateur définit son propre espace de noms de clé de requête :

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

Les mutations sont invalidées au niveau de l'espace de noms pour garantir que toutes les requêtes associées sont actualisées :

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Référence du fichier

|Fichier|Objectif|
|------|---------|
|`lib/query-client.ts`|Fabrique de client de requête (serveur vs navigateur)|
|`lib/react-query-config.ts`|Interrogez les usines de clés, les utilitaires de cache, les stratégies de prélecture|
|`lib/api/constants.ts`|Temps d'obsolescence par défaut et constantes de configuration des requêtes|
|`components/context/LayoutThemeContext.tsx`|Contexte des paramètres globaux de l'interface utilisateur avec persistance localStorage|
|`hooks/use-current-user.ts`|Exemple de hook de récupération de données avec gestion du cache|
|`hooks/use-favorites.ts`|Exemple de modèle de mise à jour optimiste|
|`hooks/use-admin-categories.ts`|Exemple de hook CRUD d'administration avec espace de noms de clé de requête|
