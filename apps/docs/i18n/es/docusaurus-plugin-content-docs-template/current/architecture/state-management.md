---
id: state-management
title: "Gestión del Estado"
sidebar_label: "Gestión del Estado"
sidebar_position: 26
---

# Gestión del Estado

La plantilla utiliza un enfoque de administración de estado en capas: **React Query** (TanStack Query) para el estado del servidor, **React Context** para la configuración global de la interfaz de usuario y **estado del componente local** para inquietudes efímeras de la interfaz de usuario. Esta página cubre cada capa, la configuración del cliente de consulta y los patrones utilizados en todo el código base.

## Categorías estatales

|categoría|Herramienta|Ejemplos|
|----------|------|----------|
|Estado del servidor|Reaccionar consulta|Datos de usuario, artículos, categorías, estadísticas de administrador.|
|Estado global de la interfaz de usuario|Reaccionar contexto|Tema, diseño, tipo de paginación, ancho del contenedor.|
|Estado de la interfaz de usuario local|`useState` / `useReducer`|Apertura/cierre modal, entradas de formulario, visibilidad desplegable|
|Preferencias persistentes|`localStorage` a través del contexto|Clave de tema, clave de diseño, elementos por página|

## Configuración de consulta de reacción

El cliente de consulta se crea en `lib/query-client.ts` usando una función de fábrica que maneja entornos de servidor y navegador:

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

Decisiones clave de diseño:
- **Aislamiento del servidor**: se crea un nuevo `QueryClient` por solicitud del servidor para evitar la fuga de datos entre usuarios.
- **Browser singleton**: se reutiliza una única instancia en toda la sesión del navegador
- **Recuperación conservadora**: `refetchOnWindowFocus` y `refetchOnMount` están deshabilitados de forma predeterminada para minimizar el tráfico de red.
- **Retroceso exponencial**: los retrasos en los reintentos se duplican con cada intento, con un límite de 30 segundos

## Consulta de fábrica de claves

Un archivo `react-query-config.ts` dedicado define los generadores de claves de consulta para una gestión de caché coherente:

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

Este patrón de fábrica permite la invalidación de caché dirigida. Por ejemplo, `invalidateQueries({ queryKey: queryKeys.billing.all })` borra todas las consultas relacionadas con la facturación a la vez.

## Utilidades de invalidación de caché

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

## Estrategias de captación previa

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

Estos se llaman de forma proactiva cuando los usuarios navegan a páginas que necesitarán estos datos.

## Patrón de gancho: useCurrentUser

El enlace `hooks/use-current-user.ts` demuestra el patrón de enlace de obtención de datos estándar:

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

Aspectos destacados del patrón:
- **Clave de consulta exportada**: permite que otros enlaces invaliden o lean este caché
- **Reintento inteligente**: los errores de autenticación nunca se reintentan
- **Ayudantes de caché**: `invalidateUserCache`, `prefetchUser` y `setUserData` están expuestos para uso externo.

## Actualizaciones optimistas: useFavoritos

El gancho `hooks/use-favorites.ts` demuestra patrones de actualización optimistas:

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

El patrón sigue tres pasos:
1. **onMutate**: cancelar consultas en curso, estado de instantánea, aplicar actualización optimista
2. **onError**: retroceder a la instantánea
3. **onSuccess**: reemplace los datos optimistas con la respuesta real del servidor

## Estado global de la interfaz de usuario: LayoutThemeContext

`components/context/LayoutThemeContext.tsx` proporciona un contexto de reacción para todas las preferencias globales de la interfaz de usuario:

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

Cada configuración sigue el mismo patrón interno utilizando enlaces de administrador dedicados:

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

Principios de diseño:
- **Seguridad de hidratación**: el estado siempre se inicializa con los valores predeterminados; localStorage solo se lee en `useEffect` después del montaje
- **Validación**: cada configurador valida la entrada antes de aplicar
- **Persistencia**: todas las preferencias se sincronizan con `localStorage` automáticamente
- **Sincronización de variables CSS**: los cambios en el tema actualizan inmediatamente las propiedades personalizadas de CSS en `document.documentElement`

## Claves de consulta por gancho en ganchos de administración

Cada gancho CRUD de administrador define su propio espacio de nombres de clave de consulta:

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

Las mutaciones se invalidan en el nivel del espacio de nombres para garantizar que se actualicen todas las consultas relacionadas:

```tsx
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categories });
},
```

## Referencia de archivo

|Archivo|Propósito|
|------|---------|
|`lib/query-client.ts`|Consultar fábrica de clientes (servidor vs navegador)|
|`lib/react-query-config.ts`|Consultar fábricas de claves, utilidades de caché, estrategias de captación previa|
|`lib/api/constants.ts`|Tiempos de inactividad predeterminados y constantes de configuración de consultas|
|`components/context/LayoutThemeContext.tsx`|Contexto de configuración de interfaz de usuario global con persistencia de almacenamiento local|
|`hooks/use-current-user.ts`|Ejemplo de gancho de obtención de datos con gestión de caché|
|`hooks/use-favorites.ts`|Ejemplo de patrón de actualización optimista|
|`hooks/use-admin-categories.ts`|Ejemplo de gancho CRUD de administrador con espacio de nombres de clave de consulta|
