---
id: state-management
title: "Gestione statale"
sidebar_label: "Gestione statale"
sidebar_position: 26
---

# Gestione statale

Il modello utilizza un approccio di gestione dello stato a più livelli: **React Query** (TanStack Query) per lo stato del server, **React Context** per le impostazioni dell'interfaccia utente globali e **Stato del componente locale** per problemi temporanei dell'interfaccia utente. Questa pagina copre ogni livello, la configurazione del client di query e i modelli utilizzati in tutta la base di codice.

## Categorie di stati

|Categoria|Strumento|Esempi|
|----------|------|----------|
|Stato del server|Reagisci alla domanda|Dati utente, articoli, categorie, statistiche di amministrazione|
|Stato dell'interfaccia utente globale|Reagire al contesto|Tema, layout, tipo di impaginazione, larghezza del contenitore|
|Stato dell'interfaccia utente locale|`useState` / `useReducer`|Apertura/chiusura modale, input di moduli, visibilità a discesa|
|Preferenze persistenti|`localStorage` tramite contesto|Chiave del tema, chiave del layout, elementi per pagina|

## Configurazione della query di reazione

Il client di query viene creato in `lib/query-client.ts` utilizzando una funzione di fabbrica che gestisce sia gli ambienti server che quelli browser:

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

Decisioni chiave di progettazione:
- **Isolamento del server**: viene creato un nuovo `QueryClient` per ogni richiesta del server per impedire la fuga di dati tra gli utenti
- **Singleton del browser**: una singola istanza viene riutilizzata durante la sessione del browser
- **Recupero conservativo**: `refetchOnWindowFocus` e `refetchOnMount` sono disabilitati per impostazione predefinita per ridurre al minimo il traffico di rete
- **Backoff esponenziale**: i ritardi tra i tentativi raddoppiano a ogni tentativo, con un limite massimo di 30 secondi

## Interrogare la fabbrica di chiavi

Un file `react-query-config.ts` dedicato definisce le query factory chiave per una gestione coerente della cache:

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

Questo modello di fabbrica consente l'invalidazione mirata della cache. Ad esempio, `invalidateQueries({ queryKey: queryKeys.billing.all })` cancella tutte le query relative alla fatturazione contemporaneamente.

## Utilità di invalidamento della cache

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

## Strategie di precaricamento

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

Questi vengono chiamati in modo proattivo quando gli utenti navigano verso pagine che avranno bisogno di questi dati.

## Modello di aggancio: useCurrentUser

L'hook `hooks/use-current-user.ts` dimostra il modello di hook standard per il recupero dei dati:

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

Punti salienti del modello:
- **Chiave di query esportata**: consente ad altri hook di invalidare o leggere questa cache
- **Riprova intelligente**: gli errori di autenticazione non vengono mai ritentati
- **Supporti cache**: `invalidateUserCache`, `prefetchUser` e `setUserData` sono esposti per uso esterno

## Aggiornamenti ottimistici: usa i preferiti

L'hook `hooks/use-favorites.ts` mostra modelli di aggiornamento ottimistici:

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

Lo schema segue tre passaggi:
1. **onMutate**: annulla le query in volo, lo stato dell'istantanea, applica l'aggiornamento ottimistico
2. **onError**: rollback allo snapshot
3. **onSuccess**: sostituisci i dati ottimistici con la risposta del server reale

## Stato globale dell'interfaccia utente: LayoutThemeContext

`components/context/LayoutThemeContext.tsx` fornisce un contesto React per tutte le preferenze globali dell'interfaccia utente:

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

Ogni impostazione segue lo stesso modello interno utilizzando hook di gestione dedicati:

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

Principi di progettazione:
- **Sicurezza dell'idratazione**: lo stato si inizializza sempre con i valori predefiniti; localStorage viene letto solo in `useEffect` dopo il montaggio
- **Convalida**: ogni setter convalida l'input prima di candidarsi
- **Persistenza**: tutte le preferenze vengono sincronizzate automaticamente su `localStorage`
- **Sincronizzazione delle variabili CSS**: le modifiche al tema aggiornano immediatamente le proprietà personalizzate CSS su `document.documentElement`

## Chiavi di query per hook negli hook di amministrazione

Ogni hook CRUD amministratore definisce il proprio spazio dei nomi della chiave di query:

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

Le mutazioni vengono invalidate a livello dello spazio dei nomi per garantire che tutte le query correlate vengano aggiornate:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Riferimento al file

|Archivio|Scopo|
|------|---------|
|`lib/query-client.ts`|Interroga la factory del client (server o browser)|
|`lib/react-query-config.ts`|Esegui query su factory chiave, utilità di cache, strategie di precaricamento|
|`lib/api/constants.ts`|Tempi di aggiornamento predefiniti e costanti di configurazione delle query|
|`components/context/LayoutThemeContext.tsx`|Contesto delle impostazioni dell'interfaccia utente globale con persistenza localStorage|
|`hooks/use-current-user.ts`|Esempio di hook di recupero dati con gestione della cache|
|`hooks/use-favorites.ts`|Esempio di modello di aggiornamento ottimistico|
|`hooks/use-admin-categories.ts`|Esempio di hook CRUD amministrativo con spazio dei nomi della chiave di query|
