---
id: state-management
title: "Gestão Estadual"
sidebar_label: "Gestão Estadual"
sidebar_position: 26
---

# Gestão Estadual

O modelo usa uma abordagem de gerenciamento de estado em camadas: **React Query** (TanStack Query) para estado do servidor, **React Context** para configurações globais de UI e **estado de componente local** para preocupações efêmeras de UI. Esta página aborda cada camada, a configuração do cliente de consulta e os padrões usados ​​em toda a base de código.

## Categorias estaduais

|Categoria|Ferramenta|Exemplos|
|----------|------|----------|
|Estado do servidor|Consulta de reação|Dados do usuário, itens, categorias, estatísticas administrativas|
|Estado global da IU|Contexto de reação|Tema, layout, tipo de paginação, largura do contêiner|
|Estado da IU local|`useState` / `useReducer`|Abertura/fechamento modal, entradas de formulário, visibilidade suspensa|
|Preferências persistentes|`localStorage` via Contexto|Chave de tema, chave de layout, itens por página|

## Configuração de consulta React

O cliente de consulta é criado em `lib/query-client.ts` usando uma função de fábrica que lida com ambientes de servidor e navegador:

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

Principais decisões de design:
- **Isolamento do servidor**: um novo `QueryClient` é criado por solicitação do servidor para evitar vazamento de dados entre usuários
- **Singleton do navegador**: uma única instância é reutilizada em toda a sessão do navegador
- **Rebusca conservadora**: `refetchOnWindowFocus` e `refetchOnMount` estão desabilitados por padrão para minimizar o tráfego de rede
- **Retirada exponencial**: os atrasos nas novas tentativas dobram a cada tentativa, limitados a 30 segundos

## Consultar fábrica de chaves

Um arquivo `react-query-config.ts` dedicado define fábricas de chaves de consulta para gerenciamento de cache consistente:

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

Este padrão de fábrica permite a invalidação do cache direcionado. Por exemplo, `invalidateQueries({ queryKey: queryKeys.billing.all })` limpa todas as consultas relacionadas ao faturamento de uma só vez.

## Utilitários de invalidação de cache

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

## Estratégias de pré-busca

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

Eles são chamados proativamente quando os usuários navegam para páginas que precisarão desses dados.

## Padrão de gancho: useCurrentUser

O gancho `hooks/use-current-user.ts` demonstra o padrão de gancho de busca de dados padrão:

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

Destaques do padrão:
- **Chave de consulta exportada**: permite que outros ganchos invalidem ou leiam este cache
- **Repetição inteligente**: erros de autenticação nunca são repetidos
- **Ajudantes de cache**: `invalidateUserCache`, `prefetchUser` e `setUserData` são expostos para uso externo

## Atualizações otimistas: useFavorites

O gancho `hooks/use-favorites.ts` demonstra padrões de atualização otimistas:

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

O padrão segue três etapas:
1. **onMutate**: cancelar consultas em andamento, estado do instantâneo, aplicar atualização otimista
2. **onError**: reversão para o snapshot
3. **onSuccess**: substitua os dados otimistas pela resposta real do servidor

## Estado global da UI: LayoutThemeContext

O `components/context/LayoutThemeContext.tsx` fornece um Contexto React para todas as preferências globais da UI:

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

Cada configuração segue o mesmo padrão interno usando ganchos de gerenciamento dedicados:

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

Princípios de design:
- **Segurança de hidratação**: o estado sempre inicializa com os padrões; localStorage só é lido em `useEffect` após a montagem
- **Validação**: cada setter valida a entrada antes de aplicar
- **Persistência**: todas as preferências são sincronizadas com `localStorage` automaticamente
- **Sincronização de variáveis CSS**: alterações de tema atualizam imediatamente as propriedades personalizadas CSS em `document.documentElement`

## Chaves de consulta por gancho em ganchos administrativos

Cada gancho CRUD de administrador define seu próprio namespace de chave de consulta:

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

As mutações são invalidadas no nível do namespace para garantir que todas as consultas relacionadas sejam atualizadas:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Referência de arquivo

|Arquivo|Objetivo|
|------|---------|
|`lib/query-client.ts`|Consultar fábrica do cliente (servidor x navegador)|
|`lib/react-query-config.ts`|Consultar fábricas principais, utilitários de cache, estratégias de pré-busca|
|`lib/api/constants.ts`|Tempos obsoletos padrão e constantes de configuração de consulta|
|`components/context/LayoutThemeContext.tsx`|Contexto de configurações globais da UI com persistência localStorage|
|`hooks/use-current-user.ts`|Exemplo de gancho de busca de dados com gerenciamento de cache|
|`hooks/use-favorites.ts`|Exemplo de padrão de atualização otimista|
|`hooks/use-admin-categories.ts`|Exemplo de gancho CRUD de administrador com namespace de chave de consulta|
